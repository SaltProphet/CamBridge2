// API endpoint for model logout
import { deleteSession } from '../db.js';
import { extractToken } from '../middleware.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    // Delete session from database
    await deleteSession(token);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      error: 'An error occurred during logout' 
    });
  }
}
