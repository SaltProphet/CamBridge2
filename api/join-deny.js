// API endpoint for creators to deny join requests
// Phase 1: Deny join request with optional reason
import { 
  getJoinRequestById, 
  updateJoinRequestStatus, 
  getCreatorByUserId 
} from './db.js';
import { authenticate, sanitizeInput } from './middleware.js';

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
    const { requestId, reason } = req.body;

    // Validate requestId
    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Check if user is a creator
    const creator = await getCreatorByUserId(userId);
    if (!creator) {
      return res.status(403).json({ error: 'Only creators can deny join requests' });
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

    // Sanitize reason if provided
    const sanitizedReason = reason ? sanitizeInput(reason).substring(0, 500) : null;

    // Update join request status
    const updateResult = await updateJoinRequestStatus(
      requestId,
      'denied',
      null, // no token
      null, // no token expiration
      sanitizedReason
    );

    if (!updateResult.success) {
      console.error('Failed to update join request:', updateResult.error);
      return res.status(500).json({ error: 'Failed to update join request status' });
    }

    return res.status(200).json({
      success: true,
      message: 'Join request denied',
      requestId: updateResult.request.id,
      status: updateResult.request.status,
      reason: updateResult.request.decision_reason,
      decidedAt: updateResult.request.decided_at
    });

  } catch (error) {
    console.error('Join deny error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while denying join request' 
    });
  }
}
