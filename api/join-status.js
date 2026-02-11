// GET /api/join-status
// Get join request status (can be used by authenticated users to see their pending requests)

import jwt from 'jsonwebtoken';
import { getJoinRequestsByOwnerId, getJoinRequestsByEmail } from './db-simple.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function getTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith('token='));
  
  if (!tokenCookie) return null;
  
  return tokenCookie.substring(6);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, email } = req.query;

    // If email is provided (public lookup)
    if (email) {
      const requests = await getJoinRequestsByEmail(email, status || null);
      return res.status(200).json({
        ok: true,
        requests
      });
    }

    // Otherwise, require authentication to see room owner's requests
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

    // Get join requests for rooms owned by this user
    const requests = await getJoinRequestsByOwnerId(decoded.userId, status || null);

    return res.status(200).json({
      ok: true,
      requests
    });
  } catch (error) {
    console.error('Join status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
