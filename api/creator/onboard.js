// API endpoint for creator onboarding
// Phase 1: Convert user to creator with slug and default rooms
import { createCreator, createRoom, getUserById, getCreatorByUserId, updateUserRole } from '../db.js';
import { authenticate, sanitizeInput } from '../middleware.js';

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
    
    // Get full user details to check ToS/age acceptance
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Enforce ToS and age acceptance
    if (!user.tos_accepted_at || !user.age_attested_at) {
      return res.status(403).json({ 
        error: 'You must accept the Terms of Service and age attestation before becoming a creator',
        requiresAcceptance: true
      });
    }

    // Check if user is already a creator
    const existingCreator = await getCreatorByUserId(userId);
    if (existingCreator) {
      return res.status(409).json({ 
        error: 'User is already a creator',
        creator: {
          id: existingCreator.id,
          slug: existingCreator.slug,
          displayName: existingCreator.display_name
        }
      });
    }

    const { displayName, slug } = req.body;

    // Validate display name
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const sanitizedDisplayName = sanitizeInput(displayName);
    if (sanitizedDisplayName.length < 2 || sanitizedDisplayName.length > 200) {
      return res.status(400).json({ error: 'Display name must be between 2 and 200 characters' });
    }

    // Generate or validate slug
    let creatorSlug;
    if (slug) {
      // Validate custom slug
      const slugPattern = /^[a-z0-9_-]{3,100}$/;
      if (!slugPattern.test(slug)) {
        return res.status(400).json({ 
          error: 'Slug must be 3-100 characters and contain only lowercase letters, numbers, hyphens, and underscores' 
        });
      }
      creatorSlug = slug;
    } else {
      // Auto-generate slug from display name
      creatorSlug = sanitizedDisplayName
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);
      
      // Add random suffix if slug is too short
      if (creatorSlug.length < 3) {
        creatorSlug = `creator-${Math.random().toString(36).substring(2, 8)}`;
      }
    }

    // Create creator record
    const creatorResult = await createCreator(userId, creatorSlug, sanitizedDisplayName);
    if (!creatorResult.success) {
      console.error('Failed to create creator:', creatorResult.error);
      
      // Handle duplicate slug error
      if (creatorResult.error.includes('unique') || creatorResult.error.includes('duplicate')) {
        return res.status(409).json({ 
          error: 'This slug is already taken. Please choose a different one.',
          suggestedSlug: `${creatorSlug}-${Math.random().toString(36).substring(2, 6)}`
        });
      }
      
      return res.status(500).json({ error: 'Failed to create creator account' });
    }

    const creator = creatorResult.creator;

    // Update user role to 'creator'
    await updateUserRole(userId, 'creator');

    // Create default rooms (main public room)
    const mainRoomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const mainRoomResult = await createRoom(userId, `${creatorSlug}-main`, mainRoomCode);
    
    if (!mainRoomResult.success) {
      console.error('Failed to create main room:', mainRoomResult.error);
      // Non-critical - creator is still created
    }

    return res.status(201).json({
      success: true,
      message: 'Creator account created successfully',
      creator: {
        id: creator.id,
        userId: creator.user_id,
        slug: creator.slug,
        displayName: creator.display_name,
        plan: creator.plan,
        status: creator.status,
        createdAt: creator.created_at
      },
      rooms: mainRoomResult.success ? [{
        id: mainRoomResult.room.id,
        roomName: mainRoomResult.room.room_name,
        accessCode: mainRoomResult.room.access_code,
        dailyRoomUrl: mainRoomResult.room.daily_room_url
      }] : []
    });

  } catch (error) {
    console.error('Creator onboarding error:', error);
    return res.status(500).json({ 
      error: 'An error occurred during creator onboarding' 
    });
  }
}
