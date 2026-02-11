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


function mapRoomResponse(room) {
  return {
    id: room.id,
    creatorId: room.creator_id,
    roomName: room.room_name,
    roomSlug: room.room_slug,
    roomType: room.room_type,
    accessCode: room.access_code,
    dailyRoomUrl: room.daily_room_url,
    isActive: room.is_active,
    enabled: room.enabled,
    joinMode: room.join_mode,
    maxSessionDuration: room.max_session_duration,
    maxParticipants: room.max_participants,
    createdAt: room.created_at,
    updatedAt: room.updated_at
  };
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
        rooms: rooms.map(mapRoomResponse)
      });
    }

    // POST - Create new room
    if (req.method === 'POST') {
      const { roomName, roomSlug, roomType, enabled, joinMode, maxParticipants } = req.body;

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
      const result = await createRoom(userId, cleanRoomName, accessCode, {
        roomSlug: roomSlug || cleanRoomName,
        roomType: roomType || 'public',
        enabled: enabled !== undefined ? enabled : true,
        joinMode: joinMode || 'knock',
        maxParticipants: maxParticipants !== undefined ? maxParticipants : null
      });
      if (!result.success) {
        console.error('Room creation failed:', result.error);
        return res.status(500).json({ error: 'Failed to create room' });
      }

      return res.status(201).json({
        success: true,
        message: 'Room created successfully',
        room: mapRoomResponse(result.room)
      });
    }

    // PUT - Update room
    if (req.method === 'PUT') {
      const {
        roomId,
        accessCode,
        isActive,
        maxSessionDuration,
        roomSlug,
        roomType,
        enabled,
        joinMode,
        maxParticipants
      } = req.body;

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

      if (roomSlug !== undefined) {
        if (typeof roomSlug !== 'string' || roomSlug.trim().length === 0) {
          return res.status(400).json({ error: 'roomSlug must be a non-empty string' });
        }
        updates.room_slug = sanitizeInput(roomSlug).toLowerCase();
      }

      if (roomType !== undefined) {
        if (typeof roomType !== 'string' || roomType.trim().length === 0) {
          return res.status(400).json({ error: 'roomType must be a non-empty string' });
        }
        updates.room_type = sanitizeInput(roomType).toLowerCase();
      }

      if (enabled !== undefined) {
        if (typeof enabled !== 'boolean') {
          return res.status(400).json({ error: 'enabled must be a boolean' });
        }
        updates.enabled = enabled;
      }

      if (joinMode !== undefined) {
        if (typeof joinMode !== 'string' || joinMode.trim().length === 0) {
          return res.status(400).json({ error: 'joinMode must be a non-empty string' });
        }
        updates.join_mode = sanitizeInput(joinMode).toLowerCase();
      }

      if (maxParticipants !== undefined) {
        const parsedMaxParticipants = parseInt(maxParticipants, 10);
        if (isNaN(parsedMaxParticipants) || parsedMaxParticipants < 1) {
          return res.status(400).json({ error: 'maxParticipants must be a positive integer' });
        }
        updates.max_participants = parsedMaxParticipants;
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
        room: mapRoomResponse(result.room)
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
