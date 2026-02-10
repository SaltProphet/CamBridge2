// API endpoint to verify room access code
// Used by room.html to validate access before entering
import { getRoomByName } from '../db.js';
import { sanitizeInput } from '../middleware.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roomName, accessCode } = req.body;

    if (!roomName || !accessCode) {
      return res.status(400).json({ error: 'Room name and access code are required' });
    }

    // Sanitize inputs
    const cleanRoomName = sanitizeInput(roomName).toLowerCase();
    const cleanAccessCode = sanitizeInput(accessCode).toUpperCase();

    // Get room from database
    const room = await getRoomByName(cleanRoomName);

    if (!room) {
      return res.status(404).json({ 
        success: false,
        error: 'Room not found' 
      });
    }

    if (!room.is_active) {
      return res.status(403).json({ 
        success: false,
        error: 'This room is currently inactive' 
      });
    }

    // Verify access code
    if (room.access_code !== cleanAccessCode) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid access code' 
      });
    }

    // Access granted
    return res.status(200).json({
      success: true,
      message: 'Access granted',
      room: {
        roomName: room.room_name,
        dailyRoomUrl: room.daily_room_url,
        maxSessionDuration: room.max_session_duration
      }
    });

  } catch (error) {
    console.error('Verify access error:', error);
    return res.status(500).json({ 
      error: 'An error occurred while verifying access' 
    });
  }
}
