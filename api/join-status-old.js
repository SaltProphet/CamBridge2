// API endpoint to check join request status
// Phase 1: Poll approval status and return Daily token when approved
import { getJoinRequestById } from './db.js';
import { authenticate } from './middleware.js';

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
    const { requestId } = req.query;

    // Validate requestId
    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Get join request
    const request = await getJoinRequestById(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    // Verify the request belongs to the authenticated user
    if (request.user_id !== auth.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this join request' });
    }

    // Return status
    const response = {
      requestId: request.id,
      status: request.status,
      createdAt: request.created_at,
      decidedAt: request.decided_at
    };

    // If approved, include Daily token
    if (request.status === 'approved' && request.daily_token) {
      // Check if token is still valid
      const now = new Date();
      const expiresAt = new Date(request.token_expires_at);
      
      if (expiresAt > now) {
        response.dailyToken = request.daily_token;
        response.tokenExpiresAt = request.token_expires_at;
      } else {
        response.status = 'token_expired';
        response.message = 'Your access token has expired. Please request access again.';
      }
    }

    // If denied, include reason
    if (request.status === 'denied') {
      response.reason = request.decision_reason || 'No reason provided';
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Join status check error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while checking join request status' 
    });
  }
}
