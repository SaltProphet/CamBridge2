// POST /api/join-request
// Create a join request for a room

import { getRoomBySlug, createJoinRequest } from './db-simple.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roomSlug, requesterEmail } = req.body;

    // Validate input
    if (!roomSlug || !requesterEmail) {
      return res.status(400).json({ error: 'Room slug and email are required' });
    }

    // Validate and normalize slug format (same as create-room)
    const normalizedSlug = roomSlug.toLowerCase();
    if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
      return res.status(400).json({ error: 'Room slug can only contain lowercase letters, numbers, and hyphens' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get room using normalized slug
    const room = await getRoomBySlug(normalizedSlug);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Create join request
    const result = await createJoinRequest(room.id, requesterEmail);

    if (result.success) {
      return res.status(200).json({
        ok: true,
        request: result.request
      });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Join request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
