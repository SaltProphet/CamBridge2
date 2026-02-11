// API endpoint to get creator info for authenticated user
// Phase 1: Dashboard support
import { getCreatorByUserId } from '../db.js';
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

    // Get creator info
    const creator = await getCreatorByUserId(userId);
    
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    return res.status(200).json({
      id: creator.id,
      userId: creator.user_id,
      slug: creator.slug,
      displayName: creator.display_name,
      plan: creator.plan,
      status: creator.status,
      createdAt: creator.created_at
    });

  } catch (error) {
    console.error('Get creator info error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while fetching creator info' 
    });
  }
}
