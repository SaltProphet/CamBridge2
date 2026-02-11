// API endpoint to create a join request
// Phase 1: Client requests to join a creator's room with ban checking
import crypto from 'crypto';
import { 
  getCreatorBySlug, 
  getRoomByName, 
  createJoinRequest, 
  checkBan,
  getUserById
} from './db.js';
import { authenticate, rateLimit } from './middleware.js';

// Rate limit: 10 requests per hour per user per creator
const joinRequestRateLimit = new Map();

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

    // Get full user details to check ToS/age acceptance
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Enforce ToS and age acceptance
    if (!user.tos_accepted_at || !user.age_attested_at) {
      return res.status(403).json({ 
        error: 'You must accept the Terms of Service and age attestation before requesting access',
        requiresAcceptance: true
      });
    }

    // Get creator
    const creator = await getCreatorBySlug(creatorSlug);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Check creator status
    if (creator.status !== 'active') {
      return res.status(403).json({ error: 'This creator is not currently accepting join requests' });
    }

    // Rate limit check
    const rateLimitCheck = checkJoinRequestRateLimit(userId, creator.id);
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

    // Hash IP and device fingerprint for ban checking
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    
    const userAgent = req.headers['user-agent'] || '';
    const deviceHash = crypto.createHash('sha256').update(`${userAgent}:${userId}`).digest('hex');

    // Check for bans
    const ban = await checkBan(creator.id, userId, user.email, ipHash, deviceHash);
    if (ban) {
      return res.status(403).json({ 
        error: 'You are banned from this creator\'s rooms',
        banned: true,
        reason: ban.reason || 'No reason provided'
      });
    }

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
