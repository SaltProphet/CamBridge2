// API endpoint for room management
import { 
  getRoomsByUserId, 
  getRoomByName, 
  createRoom, 
  updateRoom 
} from '../db.js';
import { authenticate, validateUsername, sanitizeInput } from '../middleware.js';

// Generate random access code (8 uppercase alphanumeric characters)
// Format defined by ACCESS_CODE_REGEX in db.js
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req, res) {
  try {
    // Authenticate user
    const auth = await authenticate(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: auth.error || 'Unauthorized' });
    }

    const userId = auth.user.id;

    // GET - List user's rooms
    if (req.method === 'GET') {
      const rooms = await getRoomsByUserId(userId);

      return res.status(200).json({
        success: true,
        rooms: rooms.map(room => ({
          id: room.id,
          roomName: room.room_name,
          accessCode: room.access_code,
          dailyRoomUrl: room.daily_room_url,
          isActive: room.is_active,
          maxSessionDuration: room.max_session_duration,
          createdAt: room.created_at,
          updatedAt: room.updated_at
        }))
      });
    }

    // POST - Create new room
    if (req.method === 'POST') {
      const { roomName } = req.body;

      // Validate room name
      const validation = validateUsername(roomName);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const cleanRoomName = roomName.toLowerCase().trim();

      // Check if room name already exists
      const existingRoom = await getRoomByName(cleanRoomName);
      if (existingRoom) {
        return res.status(400).json({ error: 'Room name already taken' });
      }

      // Generate access code
      const accessCode = generateAccessCode();

      // Create room
      const result = await createRoom(userId, cleanRoomName, accessCode);
      if (!result.success) {
        console.error('Room creation failed:', result.error);
        return res.status(500).json({ error: 'Failed to create room' });
      }

      return res.status(201).json({
        success: true,
        message: 'Room created successfully',
        room: {
          id: result.room.id,
          roomName: result.room.room_name,
          accessCode: result.room.access_code,
          dailyRoomUrl: result.room.daily_room_url,
          isActive: result.room.is_active,
          maxSessionDuration: result.room.max_session_duration
        }
      });
    }

    // PUT - Update room
    if (req.method === 'PUT') {
      const { roomId, accessCode, isActive, maxSessionDuration } = req.body;

      if (!roomId) {
        return res.status(400).json({ error: 'Room ID is required' });
      }

      // Prepare updates
      const updates = {};
      
      if (accessCode !== undefined) {
        updates.access_code = accessCode;
      }

      if (isActive !== undefined) {
        if (typeof isActive !== 'boolean') {
          return res.status(400).json({ error: 'isActive must be a boolean' });
        }
        updates.is_active = isActive;
      }

      if (maxSessionDuration !== undefined) {
        const duration = parseInt(maxSessionDuration, 10);
        if (isNaN(duration) || duration < 300 || duration > 28800) {
          return res.status(400).json({ 
            error: 'maxSessionDuration must be between 300 and 28800 seconds' 
          });
        }
        updates.max_session_duration = duration;
      }

      // Update room (verifies ownership and validates access code format)
      const result = await updateRoom(roomId, userId, updates);
      if (!result.success || !result.room) {
        return res.status(404).json({ 
          error: result.error || 'Room not found or you do not have permission' 
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Room updated successfully',
        room: {
          id: result.room.id,
          roomName: result.room.room_name,
          accessCode: result.room.access_code,
          isActive: result.room.is_active,
          maxSessionDuration: result.room.max_session_duration,
          updatedAt: result.room.updated_at
        }
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Rooms endpoint error:', error);
    return res.status(500).json({ 
      error: 'An error occurred' 
    });
  }
}
