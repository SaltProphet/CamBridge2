// API endpoint for creators to ban users
// Phase 1: Ban a user from creator's rooms
import crypto from 'crypto';
import { 
  createBan, 
  getCreatorByUserId,
  getUserById,
  getUserByEmail
} from '../db.js';
import { authenticate, validateEmail } from '../middleware.js';

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
    const { userId: banUserId, email, reason } = req.body;

    // Check if user is a creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return res.status(403).json({ error: 'Only creators can ban users' });
    }

    // Must provide at least userId or email
    if (!banUserId && !email) {
      return res.status(400).json({ error: 'Either userId or email must be provided' });
    }

    let targetUserId = banUserId;
    let targetEmail = email;

    // If email provided, get user ID
    if (email && !banUserId) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json({ error: emailValidation.error });
      }

      const user = await getUserByEmail(email.toLowerCase().trim());
      if (user) {
        targetUserId = user.id;
        targetEmail = user.email;
      } else {
        // User doesn't exist yet, but we can still ban by email
        targetEmail = email.toLowerCase().trim();
      }
    }

    // If userId provided, get email
    if (banUserId && !email) {
      const user = await getUserById(banUserId);
      if (user) {
        targetEmail = user.email;
      }
    }

    // Prevent self-ban
    if (targetUserId && targetUserId === userId) {
      return res.status(400).json({ error: 'You cannot ban yourself' });
    }

    // Hash IP if available (for future ban checks)
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || null;
    const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : null;

    // Create ban
    const banResult = await createBan(
      creator.id,
      targetUserId || null,
      targetEmail || null,
      ipHash,
      null, // device hash not available without join request context
      reason || null
    );

    if (!banResult.success) {
      console.error('Failed to create ban:', banResult.error);
      return res.status(500).json({ error: 'Failed to create ban' });
    }

    return res.status(201).json({
      success: true,
      message: 'User banned successfully',
      ban: {
        id: banResult.ban.id,
        userId: banResult.ban.user_id,
        email: banResult.ban.email,
        reason: banResult.ban.reason,
        createdAt: banResult.ban.created_at
      }
    });

  } catch (error) {
    console.error('Ban creation error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while creating ban' 
    });
  }
}
