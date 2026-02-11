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
import { authenticate } from './middleware.js';
import { getPaymentsProvider } from './providers/payments.js';
import { PolicyGates, killSwitch } from './policies/gates.js';

// Rate limit: 10 requests per hour per user per creator
const joinRequestRateLimit = new Map();
const DEFAULT_DUPLICATE_WINDOW_MINUTES = 10;
const PLAN_PARTICIPANT_CAPS = {
  free: 10,
  starter: 25,
  pro: 50,
  premium: 100,
  enterprise: Infinity
};

function getJoinRequestRateLimitKey(userId, creatorId) {
  return `${userId}:${creatorId}`;
}

function checkJoinRequestRateLimit(userId, creatorId) {
  const key = getJoinRequestRateLimitKey(userId, creatorId);
  const now = Date.now();
  const windowMs = 3600000; // 1 hour
  const maxRequests = 10;

  let entry = joinRequestRateLimit.get(key);
  if (!entry || now - entry.resetTime > windowMs) {
    entry = { count: 0, resetTime: now };
    joinRequestRateLimit.set(key, entry);
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

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

  const auth = await authenticateFn(req);
  if (!auth.authenticated) {
    return {
      status: 401,
      body: errorPayload(auth.error || 'Unauthorized', 'UNAUTHORIZED')
    };
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

  const user = await getUserByIdFn(userId);
  if (!user) {
    return { status: 404, body: errorPayload('User not found', 'USER_NOT_FOUND') };
  }

  // 1) creator active + subscription active
  const paymentsProvider = getPaymentsProviderFn();
  const creatorCheck = await checkCreatorStatusFn(creator, paymentsProvider);
  if (!creatorCheck.allowed) {
    return {
      status: 403,
      body: errorPayload(creatorCheck.reason, 'CREATOR_NOT_ELIGIBLE')
    };
  }

  // 2) user compliance (age + ToS)
  const complianceCheck = checkUserComplianceFn(user);
  if (!complianceCheck.allowed) {
    return {
      status: 403,
      body: errorPayload(complianceCheck.reason, 'USER_COMPLIANCE_REQUIRED', {
        requiresAcceptance: true
      })
    };
  }

  // 3) ban checks
  const banCheck = await checkBanStatusFn(creator.id, userId, user.email, req);
  if (!banCheck.allowed) {
    return {
      status: 403,
      body: errorPayload(banCheck.reason, 'BANNED', {
        banned: true
      })
    };
  }

  // Existing endpoint-level rate-limit remains as protection for spam bursts
  const rateLimitCheck = checkRateLimitFn(userId, creator.id);
  if (!rateLimitCheck.allowed) {
    return {
      status: 429,
      body: errorPayload('Too many join requests. Please try again later.', 'RATE_LIMITED')
    };
  }

  let room = null;
  if (roomSlug) {
    const roomName = `${creatorSlug}-${roomSlug}`;
    room = await getRoomByNameFn(roomName);

    if (!room) {
      return { status: 404, body: errorPayload('Room not found', 'ROOM_NOT_FOUND') };
    }

    // 4) room enabled
    const roomEnabled = room.enabled !== false && room.is_active !== false;
    if (!roomEnabled) {
      return {
        status: 403,
        body: errorPayload('This room is not currently available', 'ROOM_DISABLED')
      };
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

  const requestResult = await createJoinRequestFn(
    creator.id,
    room ? room.id : null,
    userId,
    ipHash,
    deviceHash
  );

  if (!requestResult.success) {
    console.error('Failed to create join request:', requestResult.error);
    return {
      status: 500,
      body: errorPayload('Failed to create join request', 'JOIN_REQUEST_CREATE_FAILED')
    };
  }

  const joinMode = room?.join_mode || 'knock';
  if (joinMode === 'open') {
    const approvalResult = await updateJoinRequestStatusFn(requestResult.request.id, 'approved');
    if (!approvalResult.success) {
      return {
        status: 500,
        body: errorPayload('Failed to auto-approve open room join request', 'JOIN_REQUEST_AUTO_APPROVE_FAILED')
      };
    }

    return {
      status: 201,
      body: {
        success: true,
        message: 'Join request approved',
        requestId: approvalResult.request.id,
        status: approvalResult.request.status,
        createdAt: approvalResult.request.created_at
      }
    };
  }

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
    console.error('Join request error:', error);
    return res.status(500).json(errorPayload('An error occurred while creating join request', 'JOIN_REQUEST_INTERNAL_ERROR'));
  }
}
