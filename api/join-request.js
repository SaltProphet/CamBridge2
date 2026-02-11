// API endpoint to create a join request
// Phase 1: Client requests to join a creator's room with policy-enforced join modes
import crypto from 'crypto';
import { sql } from '@vercel/postgres';
import {
  getCreatorBySlug,
  getRoomByName,
  createJoinRequest,
  getUserById,
  updateJoinRequestStatus
} from './db.js';
import { authenticate, consumeRateLimit, buildRateLimitKey } from './middleware.js';
import { getPaymentsProvider } from './providers/payments.js';
import { PolicyGates, killSwitch } from './policies/gates.js';
import { getRequestId, logPolicyDecision } from './logging.js';

const JOIN_REQUEST_MAX_REQUESTS = 10;
const ONE_HOUR_MS = 3600000;
const DEFAULT_DUPLICATE_WINDOW_MINUTES = 30;

const PLAN_PARTICIPANT_CAPS = {
  free: 10,
  basic: 25,
  pro: 50,
  unlimited: Infinity
};

function errorPayload(error, code, extras = {}) {
  return {
    error,
    code,
    ...extras
  };
}

function resolvePlanParticipantCap(plan) {
  if (!plan) {
    return PLAN_PARTICIPANT_CAPS.free;
  }

  const normalized = String(plan).toLowerCase();
  return PLAN_PARTICIPANT_CAPS[normalized] ?? PLAN_PARTICIPANT_CAPS.free;
}

async function getApprovedParticipantCount(roomId) {
  if (!roomId) {
    return 0;
  }

  const result = await sql`
    SELECT COUNT(*)::INTEGER AS approved_count
    FROM join_requests
    WHERE room_id = ${roomId}
      AND status = 'approved'
  `;

  return result.rows[0]?.approved_count ?? 0;
}

async function hasDuplicatePendingRequest(creatorId, roomId, userId, windowMinutes) {
  const minutes = Number(windowMinutes) || DEFAULT_DUPLICATE_WINDOW_MINUTES;

  let result;
  if (roomId) {
    result = await sql`
      SELECT id
      FROM join_requests
      WHERE creator_id = ${creatorId}
        AND room_id = ${roomId}
        AND user_id = ${userId}
        AND status = 'pending'
        AND created_at > NOW() - (${minutes} * INTERVAL '1 minute')
      LIMIT 1
    `;
  } else {
    result = await sql`
      SELECT id
      FROM join_requests
      WHERE creator_id = ${creatorId}
        AND room_id IS NULL
        AND user_id = ${userId}
        AND status = 'pending'
        AND created_at > NOW() - (${minutes} * INTERVAL '1 minute')
      LIMIT 1
    `;
  }

  return !!result.rows[0];
}

function generateTrackingHashes(req, userId) {
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

  const userAgent = req.headers['user-agent'] || '';
  const deviceHash = crypto.createHash('sha256').update(`${userAgent}:${userId}`).digest('hex');

  return { ipHash, deviceHash };
}

export async function processJoinRequest(req, deps = {}) {
  const {
    authenticateFn = authenticate,
    getCreatorBySlugFn = getCreatorBySlug,
    getRoomByNameFn = getRoomByName,
    getUserByIdFn = getUserById,
    createJoinRequestFn = createJoinRequest,
    updateJoinRequestStatusFn = updateJoinRequestStatus,
    getPaymentsProviderFn = getPaymentsProvider,
    checkCreatorStatusFn = PolicyGates.checkCreatorStatus.bind(PolicyGates),
    checkUserComplianceFn = PolicyGates.checkUserCompliance.bind(PolicyGates),
    checkBanStatusFn = PolicyGates.checkBanStatus.bind(PolicyGates),
    getApprovedParticipantCountFn = getApprovedParticipantCount,
    hasDuplicatePendingRequestFn = hasDuplicatePendingRequest,
    killSwitchEnabledFn = () => killSwitch.isJoinApprovalsEnabled()
  } = deps;

  if (req.method !== 'POST') {
    return { status: 405, body: errorPayload('Method not allowed', 'METHOD_NOT_ALLOWED') };
  }

  const requestId = getRequestId(req);
  const endpoint = '/api/join-request';

  // 1) Authenticate user
  const auth = await authenticateFn(req);
  if (!auth.authenticated) {
    logPolicyDecision({ requestId, endpoint, actorId: null, decision: 'deny', reason: auth.error || 'Unauthorized' });
    return { status: 401, body: errorPayload(auth.error || 'Unauthorized', 'UNAUTHORIZED') };
  }

  const userId = auth.user.id;
  const { creatorSlug, roomSlug, accessCode } = req.body || {};

  // 2) Validate input
  if (!creatorSlug || typeof creatorSlug !== 'string') {
    return {
      status: 400,
      body: errorPayload('Creator slug is required', 'INVALID_CREATOR_SLUG')
    };
  }

  // 3) Check kill switch
  if (!killSwitchEnabledFn()) {
    return {
      status: 403,
      body: errorPayload('Join approvals are temporarily disabled', 'JOIN_APPROVALS_DISABLED')
    };
  }

  // 4) Look up creator
  const creator = await getCreatorBySlugFn(creatorSlug);
  if (!creator) {
    return { status: 404, body: errorPayload('Creator not found', 'CREATOR_NOT_FOUND') };
  }

  // 5) Check creator status
  const creatorCheck = await checkCreatorStatusFn(creator);
  if (!creatorCheck.allowed) {
    logPolicyDecision({ requestId, endpoint, actorId: userId, decision: 'deny', reason: creatorCheck.reason || 'creator inactive', metadata: { creatorId: creator.id } });
    return { status: 403, body: errorPayload(creatorCheck.reason || 'Creator is not active', 'CREATOR_INACTIVE') };
  }

  // 6) Check user compliance (age, ToS)
  const complianceCheck = await checkUserComplianceFn(userId);
  if (!complianceCheck.allowed) {
    logPolicyDecision({ requestId, endpoint, actorId: userId, decision: 'deny', reason: complianceCheck.reason || 'user compliance required', metadata: { creatorId: creator.id } });
    return {
      status: 403,
      body: {
        ...errorPayload(complianceCheck.reason || 'Age attestation and ToS acceptance required', 'USER_COMPLIANCE_REQUIRED'),
        requiresAcceptance: true
      }
    };
  }

  // 7) Check ban status
  const banCheck = await checkBanStatusFn(creator.id, userId, req);
  if (!banCheck.allowed) {
    logPolicyDecision({ requestId, endpoint, actorId: userId, decision: 'deny', reason: 'user is banned', metadata: { creatorId: creator.id } });
    return {
      status: 403,
      body: {
        ...errorPayload(banCheck.reason || 'You are banned from this creator', 'USER_BANNED'),
        banned: true
      }
    };
  }

  // 8) Rate limit check
  const rateLimitCheck = await consumeRateLimit({
    key: buildRateLimitKey('join-request', `user:${userId}:creator:${creator.id}`),
    maxRequests: JOIN_REQUEST_MAX_REQUESTS,
    windowMs: ONE_HOUR_MS
  });
  if (!rateLimitCheck.allowed) {
    logPolicyDecision({ requestId, endpoint, actorId: userId, decision: 'deny', reason: 'rate limit exceeded', metadata: { creatorId: creator.id } });
    return {
      status: 429,
      body: errorPayload('Too many join requests. Please try again later.', 'RATE_LIMIT_EXCEEDED', { remaining: rateLimitCheck.remaining })
    };
  }

  // 9) Get or create default room if roomSlug not specified
  let room = null;
  if (roomSlug) {
    room = await getRoomByNameFn(roomSlug, creator.id);
    if (!room) {
      return { status: 404, body: errorPayload('Room not found', 'ROOM_NOT_FOUND') };
    }
  } else {
    // Use creator's default room (usually 'main')
    room = await getRoomByNameFn('main', creator.id);
    if (!room) {
      return { status: 404, body: errorPayload('Creator has no default room', 'NO_DEFAULT_ROOM') };
    }
  }

  // 10) Check room is active
  if (!room.enabled || !room.is_active) {
    return {
      status: 403,
      body: errorPayload('Room is not currently available', 'ROOM_INACTIVE')
    };
  }

  // 11) Handle join mode and access codes
  const joinMode = room.join_mode || 'knock';
  if (joinMode === 'keyed') {
    const cleanAccessCode = typeof accessCode === 'string' ? accessCode.trim().toUpperCase() : '';
    if (!cleanAccessCode || cleanAccessCode !== room.access_code) {
      return {
        status: 403,
        body: errorPayload('Valid room access code is required', 'ACCESS_CODE_REQUIRED')
      };
    }
  } else if (!['open', 'knock'].includes(joinMode)) {
    return {
      status: 400,
      body: errorPayload('Unsupported room join mode', 'INVALID_JOIN_MODE')
    };
  }

  // 12) Check room participant cap / plan cap
  const planCap = resolvePlanParticipantCap(creator.plan);
  const roomCap = Number.isInteger(room.max_participants) && room.max_participants > 0
    ? room.max_participants
    : Infinity;
  const effectiveCap = Math.min(planCap, roomCap);

  if (Number.isFinite(effectiveCap)) {
    const approvedCount = await getApprovedParticipantCountFn(room.id);
    if (approvedCount >= effectiveCap) {
      return {
        status: 403,
        body: errorPayload('Room participant limit reached', 'ROOM_CAP_REACHED', { cap: effectiveCap })
      };
    }
  }

  // 13) Suppress duplicate pending requests
  const duplicatePending = await hasDuplicatePendingRequestFn(
    creator.id,
    room.id,
    userId,
    process.env.JOIN_REQUEST_DUP_WINDOW_MINUTES
  );

  if (duplicatePending) {
    return {
      status: 409,
      body: errorPayload('A pending request already exists for this room', 'DUPLICATE_PENDING_REQUEST')
    };
  }

  // 14) Generate tracking hashes
  const { ipHash, deviceHash } = generateTrackingHashes(req, userId);

  // 15) Create join request
  const requestResult = await createJoinRequestFn(
    creator.id,
    room.id,
    userId,
    ipHash,
    deviceHash
  );

  if (!requestResult.success) {
    logPolicyDecision({ requestId, endpoint, actorId: userId, decision: 'error', reason: 'failed to create join request', metadata: { creatorId: creator.id } });
    return {
      status: 500,
      body: errorPayload('Failed to create join request', 'JOIN_REQUEST_FAILED')
    };
  }

  logPolicyDecision({ requestId, endpoint, actorId: userId, decision: 'allow', reason: 'join request created', metadata: { creatorId: creator.id, joinRequestId: requestResult.request.id } });

  return {
    status: 201,
    body: {
      success: true,
      message: 'Join request created. Waiting for creator approval.',
      requestId: requestResult.request.id,
      status: requestResult.request.status,
      createdAt: requestResult.request.created_at
    }
  };
}

export default async function handler(req, res) {
  try {
    const result = await processJoinRequest(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const requestId = getRequestId(req);
    console.error('Join request error:', { requestId, endpoint: '/api/join-request', error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'An error occurred while creating join request'
    });
  }
}
