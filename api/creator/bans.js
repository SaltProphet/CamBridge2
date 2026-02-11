// API endpoint to get bans for a creator
// Phase 1: Dashboard support
import { getBansByCreator, getCreatorByUserId } from '../db.js';
import { authenticate } from '../middleware.js';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    return res.status(401).json({ error: auth.error || 'Unauthorized' });
  }

  try {
    const userId = auth.user.id;

    // Check if user is a creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return res.status(403).json({ error: 'Only creators can view bans' });
    }

    // Get active bans
    const bans = await getBansByCreator(creator.id);

    return res.status(200).json(bans);

  } catch (error) {
    console.error('Get bans error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while fetching bans' 
    });
  }
}
