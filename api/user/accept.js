// API endpoint to accept age attestation and ToS
// Phase 1: Server-side enforcement of age gate + ToS
import { updateUserAcceptance } from '../db.js';
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
    const { ageAttested, tosAccepted } = req.body;

    // Validate inputs
    if (typeof ageAttested !== 'boolean' || typeof tosAccepted !== 'boolean') {
      return res.status(400).json({ 
        error: 'Both ageAttested and tosAccepted must be boolean values' 
      });
    }

    // Must accept both
    if (!ageAttested || !tosAccepted) {
      return res.status(400).json({ 
        error: 'Both age attestation and ToS acceptance are required' 
      });
    }

    // Update user record
    const result = await updateUserAcceptance(auth.user.id, ageAttested, tosAccepted);
    
    if (!result.success) {
      console.error('Failed to update user acceptance:', result.error);
      return res.status(500).json({ error: 'Failed to update acceptance' });
    }

    return res.status(200).json({
      success: true,
      message: 'Age attestation and ToS acceptance recorded',
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        role: result.user.role,
        ageAttestedAt: result.user.age_attested_at,
        tosAcceptedAt: result.user.tos_accepted_at
      }
    });

  } catch (error) {
    console.error('User acceptance error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while recording acceptance' 
    });
  }
}
