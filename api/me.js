// GET /api/me
// Get current authenticated user from JWT cookie

import jwt from 'jsonwebtoken';
import { getUserById, getRoomsByOwnerId } from './db-simple.js';

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set in production');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function getTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith('token='));
  
  if (!tokenCookie) return null;
  
  return tokenCookie.substring(6); // Remove 'token=' prefix
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from cookie
    const token = getTokenFromCookie(req.headers.cookie);
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user from database
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get user's rooms
    const rooms = await getRoomsByOwnerId(user.id);

    // Return user data
    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      rooms
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
