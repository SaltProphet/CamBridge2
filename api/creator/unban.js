// API endpoint for creators to unban users
// Phase 1: Remove a ban
import { 
  deleteBan, 
  getCreatorByUserId 
} from '../db.js';
import { authenticate } from '../middleware.js';

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
    const { banId } = req.body;

    // Validate banId
    if (!banId || typeof banId !== 'string') {
      return res.status(400).json({ error: 'Ban ID is required' });
    }

    // Check if user is a creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return res.status(403).json({ error: 'Only creators can unban users' });
    }

    // Delete ban (validates creator ownership)
    const unbanResult = await deleteBan(banId, creator.id);

    if (!unbanResult.success || !unbanResult.ban) {
      return res.status(404).json({ error: 'Ban not found or unauthorized' });
    }

    return res.status(200).json({
      success: true,
      message: 'User unbanned successfully',
      banId: unbanResult.ban.id
    });

  } catch (error) {
    console.error('Unban error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while removing ban' 
    });
  }
}
