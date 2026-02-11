// API endpoint for creators to approve join requests
// Phase 1: Mint Daily token server-side and approve request
import { 
  getJoinRequestById, 
  updateJoinRequestStatus, 
  getCreatorByUserId,
  getRoomByName
} from './db.js';
import { authenticate } from './middleware.js';

// Mint Daily.co meeting token
async function mintDailyToken(roomName, userName, ttlMinutes = 15) {
  const apiKey = process.env.DAILY_API_KEY;
  
  if (!apiKey) {
    throw new Error('DAILY_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName,
          exp: Math.floor(Date.now() / 1000) + (ttlMinutes * 60) // Unix timestamp
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Daily API error:', errorText);
      throw new Error(`Daily API error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, token: data.token };
    
  } catch (error) {
    console.error('Mint Daily token error:', error);
    return { success: false, error: error.message };
  }
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
    const { requestId } = req.body;

    // Validate requestId
    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Check if user is a creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return res.status(403).json({ error: 'Only creators can approve join requests' });
    }

    // Get join request
    const request = await getJoinRequestById(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    // Verify ownership
    if (request.creator_id !== creator.id) {
      return res.status(403).json({ error: 'You do not own this join request' });
    }

    // Check if already decided
    if (request.status !== 'pending') {
      return res.status(409).json({ 
        error: `Join request already ${request.status}`,
        status: request.status
      });
    }

    // Determine room name for Daily token
    let roomName = `${creator.slug}-main`; // Default to main room
    
    if (request.room_id) {
      // Get the actual room
      const room = await getRoomByName(request.room_id);
      if (room && room.room_name) {
        roomName = room.room_name;
      }
    }

    // Mint Daily token (15 minute TTL)
    const tokenResult = await mintDailyToken(
      roomName, 
      request.username || 'Guest',
      15
    );

    if (!tokenResult.success) {
      console.error('Failed to mint Daily token:', tokenResult.error);
      return res.status(500).json({ 
        error: 'Failed to generate access token',
        details: tokenResult.error
      });
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update join request status
    const updateResult = await updateJoinRequestStatus(
      requestId,
      'approved',
      tokenResult.token,
      tokenExpiresAt,
      null // no reason needed for approval
    );

    if (!updateResult.success) {
      console.error('Failed to update join request:', updateResult.error);
      return res.status(500).json({ error: 'Failed to update join request status' });
    }

    return res.status(200).json({
      success: true,
      message: 'Join request approved',
      requestId: updateResult.request.id,
      status: updateResult.request.status,
      dailyToken: updateResult.request.daily_token,
      tokenExpiresAt: updateResult.request.token_expires_at,
      decidedAt: updateResult.request.decided_at
    });

  } catch (error) {
    console.error('Join approve error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while approving join request' 
    });
  }
}
