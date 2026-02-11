// API endpoint to create a join request
// Phase 1: Client requests to join a creator's room with ban checking
// Phase 0: Uses centralized policy gates
import crypto from 'crypto';
import { 
  getCreatorBySlug, 
  getRoomByName, 
  createJoinRequest, 
  getUserById
} from './db.js';
import { authenticate, consumeRateLimit, buildRateLimitKey } from './middleware.js';
import { getPaymentsProvider } from './providers/payments.js';
import { PolicyGates } from './policies/gates.js';

const JOIN_REQUEST_MAX_REQUESTS = 10;
const ONE_HOUR_MS = 3600000;

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    return res.status(401).json({ error: auth.error || 'Unauthorized' });
  }

  try {
    const userId = auth.user.id;
    const { creatorSlug, roomSlug, accessCode } = req.body;

    // Validate inputs
    if (!creatorSlug || typeof creatorSlug !== 'string') {
      return res.status(400).json({ error: 'Creator slug is required' });
    }

    // Get creator
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Phase 0: Use centralized policy gates for all checks
    const paymentsProvider = getPaymentsProvider();
    const policyCheck = await PolicyGates.checkJoinRequestPolicies({
      userId,
      creatorId: creator.id,
      creator,
      paymentsProvider,
      req
    });

    if (!policyCheck.allowed) {
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
      return res.status(429).json({ 
        error: 'Too many join requests. Please try again later.',
        remaining: rateLimitCheck.remaining
      });
    }

    // Get room (if roomSlug provided)
    let room = null;
    if (roomSlug) {
      const roomName = `${creatorSlug}-${roomSlug}`;
      room = await getRoomByName(roomName);
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      // Check if room is enabled (check both old and new columns for compatibility)
      if (!room.is_active && room.enabled === false) {
        return res.status(403).json({ error: 'This room is not currently available' });
      }
    }

    // Hash IP and device fingerprint for tracking (already done in policy gates, but needed for storage)
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    
    const userAgent = req.headers['user-agent'] || '';
    const deviceHash = crypto.createHash('sha256').update(`${userAgent}:${userId}`).digest('hex');

    // Create join request
    const requestResult = await createJoinRequest(
      creator.id, 
      room ? room.id : null, 
      userId, 
      ipHash, 
      deviceHash
    );

    if (!requestResult.success) {
      console.error('Failed to create join request:', requestResult.error);
      return res.status(500).json({ error: 'Failed to create join request' });
    }

    return res.status(201).json({
      success: true,
      message: 'Join request created. Waiting for creator approval.',
      requestId: requestResult.request.id,
      status: requestResult.request.status,
      createdAt: requestResult.request.created_at
    });

  } catch (error) {
    console.error('Join request error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while creating join request' 
    });
  }
}
