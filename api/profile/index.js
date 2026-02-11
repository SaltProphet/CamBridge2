// API endpoint for getting and updating model profile
import { getUserById, updateUser, getRoomsByUserId } from '../db.js';
import { authenticate, sanitizeInput } from '../middleware.js';

export default async function handler(req, res) {
  try {
    // Authenticate user
    const auth = await authenticate(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: auth.error || 'Unauthorized' });
    }

    const userId = auth.user.id;

    // GET - Fetch profile
    if (req.method === 'GET') {
      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's rooms
      const rooms = await getRoomsByUserId(userId);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at
        },
        rooms: rooms.map(room => ({
          id: room.id,
          roomName: room.room_name,
          accessCode: room.access_code,
          dailyRoomUrl: room.daily_room_url,
          isActive: room.is_active,
          maxSessionDuration: room.max_session_duration,
          createdAt: room.created_at
        }))
      });
    }

    // PUT - Update profile
    if (req.method === 'PUT') {
      const { displayName, bio, avatarUrl } = req.body;

      // Sanitize inputs
      const updates = {
        display_name: displayName ? sanitizeInput(displayName) : null,
        bio: bio ? sanitizeInput(bio) : null,
        avatar_url: avatarUrl ? sanitizeInput(avatarUrl) : null
      };

      // Validate avatar URL if provided
      if (updates.avatar_url) {
        try {
          new URL(updates.avatar_url);
        } catch {
          return res.status(400).json({ error: 'Invalid avatar URL' });
        }
      }

      const result = await updateUser(userId, updates);
      if (!result.success) {
        console.error('Update user failed:', result.error);
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          displayName: result.user.display_name,
          bio: result.user.bio,
          avatarUrl: result.user.avatar_url
        }
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Profile endpoint error:', error);
    return res.status(500).json({ 
      error: 'An error occurred' 
    });
  }
}
