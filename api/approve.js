// POST /api/approve
// Approve a join request (authenticated users only)

import jwt from 'jsonwebtoken';
import { updateJoinRequestStatus } from './db-simple.js';

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

    const { requestId } = req.body;

    // Validate input
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Update request status to approved
    const result = await updateJoinRequestStatus(requestId, 'approved');

    if (result.success) {
      return res.status(200).json({
        ok: true,
        request: result.request
      });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Approve request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
