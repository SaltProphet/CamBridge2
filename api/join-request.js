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
import { PolicyGates } from './policies/gates.js';
import { getRequestId, logPolicyDecision } from './logging.js';

const JOIN_REQUEST_MAX_REQUESTS = 10;
const ONE_HOUR_MS = 3600000;

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
    checkRateLimitFn = checkJoinRequestRateLimit,
    killSwitchEnabledFn = () => killSwitch.isJoinApprovalsEnabled()
  } = deps;

  if (req.method !== 'POST') {
    return { status: 405, body: errorPayload('Method not allowed', 'METHOD_NOT_ALLOWED') };
  }

  const requestId = getRequestId(req);
  const endpoint = '/api/join-request';

  // Authenticate user
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    logPolicyDecision({ requestId, endpoint, actorId: null, decision: 'deny', reason: auth.error || 'Unauthorized' });
    return res.status(401).json({ error: auth.error || 'Unauthorized' });
  }

  const userId = auth.user.id;
  const { creatorSlug, roomSlug, accessCode } = req.body || {};

  if (!creatorSlug || typeof creatorSlug !== 'string') {
    return {
      status: 400,
      body: errorPayload('Creator slug is required', 'INVALID_CREATOR_SLUG')
    };
  }

  if (!killSwitchEnabledFn()) {
    return {
      status: 403,
      body: errorPayload('Join approvals are temporarily disabled', 'JOIN_APPROVALS_DISABLED')
    };
  }

  const creator = await getCreatorBySlugFn(creatorSlug);
  if (!creator) {
    return { status: 404, body: errorPayload('Creator not found', 'CREATOR_NOT_FOUND') };
  }

    if (!policyCheck.allowed) {
      logPolicyDecision({ requestId, endpoint, actorId: userId, decision: 'deny', reason: policyCheck.reason || 'join request policy blocked', metadata: { creatorId: creator.id } });
      const isBanned = policyCheck.reason?.includes('banned');
      return res.status(403).json({ 
        error: policyCheck.reason,
        requiresAcceptance: policyCheck.reason?.includes('attestation') || policyCheck.reason?.includes('Terms'),
        banned: isBanned,
        reason: isBanned ? policyCheck.reason : undefined
      });
    }

    // Rate limit check
    const rateLimitCheck = await consumeRateLimit({
      key: buildRateLimitKey('join-request', `user:${userId}:creator:${creator.id}`),
      maxRequests: JOIN_REQUEST_MAX_REQUESTS,
      windowMs: ONE_HOUR_MS
    });
    if (!rateLimitCheck.allowed) {
      logPolicyDecision({ requestId, endpoint, actorId: userId, decision: 'deny', reason: 'join request rate limit exceeded', metadata: { creatorId: creator.id } });
      return res.status(429).json({ 
        error: 'Too many join requests. Please try again later.',
        remaining: rateLimitCheck.remaining
      });
    }

    // 5) join mode behavior
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

    // 6) room participant cap / plan cap
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
          body: errorPayload('Room participant limit reached', 'ROOM_CAP_REACHED')
        };
      }
    }

    // 7) duplicate pending request suppression
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
  }

  const { ipHash, deviceHash } = generateTrackingHashes(req, userId);

    logPolicyDecision({ requestId, endpoint, actorId: userId, decision: 'allow', reason: 'join request created', metadata: { creatorId: creator.id, joinRequestId: requestResult.request.id } });

    return res.status(201).json({
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
    console.error('Join request error:', { requestId, endpoint, error: error.message });
    return res.status(500).json({ 
      error: 'An error occurred while creating join request' 
    });
  }
}
