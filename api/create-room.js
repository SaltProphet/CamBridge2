// POST /api/create-room
// Create a new room (authenticated users only)

import jwt from 'jsonwebtoken';
import { createRoom } from './db-simple.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function getTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith('token='));
  
  if (!tokenCookie) return null;
  
  return tokenCookie.substring(6);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = getTokenFromCookie(req.headers.cookie);
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { slug } = req.body;

    // Validate slug
    if (!slug) {
      return res.status(400).json({ error: 'Room slug is required' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug can only contain lowercase letters, numbers, and hyphens' });
    }

    if (slug.length < 3) {
      return res.status(400).json({ error: 'Slug must be at least 3 characters' });
    }

    // Create room
    const result = await createRoom(decoded.userId, slug);

    if (result.success) {
      return res.status(200).json({
        ok: true,
        room: result.room
      });
    } else {
      return res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Create room error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
