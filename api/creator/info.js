// API endpoint to get and update creator info
// Phase 1: Returns creator profile for authenticated user
// Phase 2: Supports PUT method to update bio and displayName
import { getCreatorByUserId, updateCreatorInfo } from '../db.js';
import { authenticate, sanitizeInput } from '../middleware.js';

export default async function handler(req, res) {
  // Authenticate user
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    return res.status(401).json({ error: auth.error || 'Unauthorized' });
  }

  const userId = auth.user.id;
  
  // Get creator info
  const creator = await getCreatorByUserId(userId);
  
  if (!creator) {
    return res.status(404).json({ 
      error: 'Creator not found. Use /api/creator/onboard to create a creator account.' 
    });
  }

  // GET - Return creator info
  if (req.method === 'GET') {
    try {
      return res.status(200).json({
        id: creator.id,
        userId: creator.user_id,
        slug: creator.slug,
        displayName: creator.display_name,
        bio: creator.bio,
        plan: creator.plan,
        planStatus: creator.plan_status,
        status: creator.status,
        referralCode: creator.referral_code,
        // BETA MODE: Payment link fields
        cashappHandle: creator.cashapp_handle,
        paypalLink: creator.paypal_link,
        createdAt: creator.created_at
      });
    } catch (error) {
      console.error('Get creator info error:', error);
      return res.status(500).json({ 
        error: 'An error occurred while fetching creator info' 
      });
    }
  }

  // PUT - Update creator info
  if (req.method === 'PUT') {
    try {
      const { bio, displayName, cashappHandle, paypalLink } = req.body;
      
      const updates = {};
      
      // Validate and sanitize bio if provided
      if (bio !== undefined) {
        if (typeof bio !== 'string') {
          return res.status(400).json({ error: 'Bio must be a string' });
        }
        const sanitizedBio = sanitizeInput(bio);
        if (sanitizedBio.length > 1000) {
          return res.status(400).json({ error: 'Bio must be 1000 characters or less' });
        }
        updates.bio = sanitizedBio;
      }
      
      // Validate and sanitize displayName if provided
      if (displayName !== undefined) {
        if (typeof displayName !== 'string' || displayName.trim().length === 0) {
          return res.status(400).json({ error: 'Display name is required' });
        }
        const sanitizedDisplayName = sanitizeInput(displayName);
        if (sanitizedDisplayName.length < 2 || sanitizedDisplayName.length > 200) {
          return res.status(400).json({ error: 'Display name must be between 2 and 200 characters' });
        }
        updates.displayName = sanitizedDisplayName;
      }

      // BETA MODE: Validate and sanitize payment link fields
      if (cashappHandle !== undefined) {
        if (cashappHandle === null || cashappHandle === '') {
          updates.cashappHandle = null; // Allow clearing
        } else if (typeof cashappHandle !== 'string') {
          return res.status(400).json({ error: 'CashApp handle must be a string' });
        } else {
          const sanitizedHandle = sanitizeInput(cashappHandle.trim());
          if (sanitizedHandle.length > 255) {
            return res.status(400).json({ error: 'CashApp handle must be 255 characters or less' });
          }
          if (!/^[\w.-]+$/.test(sanitizedHandle)) {
            return res.status(400).json({ error: 'CashApp handle can only contain letters, numbers, dots, hyphens, and underscores' });
          }
          updates.cashappHandle = sanitizedHandle;
        }
      }

      if (paypalLink !== undefined) {
        if (paypalLink === null || paypalLink === '') {
          updates.paypalLink = null; // Allow clearing
        } else if (typeof paypalLink !== 'string') {
          return res.status(400).json({ error: 'PayPal link must be a string' });
        } else {
          const sanitizedLink = sanitizeInput(paypalLink.trim());
          if (sanitizedLink.length > 500) {
            return res.status(400).json({ error: 'PayPal link must be 500 characters or less' });
          }
          // Basic URL validation
          if (!sanitizedLink.startsWith('https://') && !sanitizedLink.startsWith('http://')) {
            return res.status(400).json({ error: 'PayPal link must start with http:// or https://' });
          }
          updates.paypalLink = sanitizedLink;
        }
      }
      
      // Check if there are any updates
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Update creator info
      const result = await updateCreatorInfo(creator.id, updates);
      
      if (!result.success) {
        console.error('Failed to update creator info:', result.error);
        return res.status(500).json({ error: 'Failed to update creator info' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Creator info updated successfully',
        creator: {
          id: result.creator.id,
          userId: result.creator.user_id,
          slug: result.creator.slug,
          displayName: result.creator.display_name,
          bio: result.creator.bio,
          plan: result.creator.plan,
          planStatus: result.creator.plan_status,
          status: result.creator.status,
          referralCode: result.creator.referral_code,
          // BETA MODE: Payment link fields
          cashappHandle: result.creator.cashapp_handle,
          paypalLink: result.creator.paypal_link,
          createdAt: result.creator.created_at
        }
      });
    } catch (error) {
      console.error('Update creator info error:', error);
      return res.status(500).json({ 
        error: 'An error occurred while updating creator info' 
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}
