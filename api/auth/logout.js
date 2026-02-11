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

    // Delete session from database when bearer token is present
    if (token) {
      await deleteSession(token);
    }

    // Clear auth cookie with matching attributes
    const isProduction = process.env.NODE_ENV === 'production';
    const clearCookie = [
      'auth_token=',
      'Path=/',
      'Max-Age=0',
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'HttpOnly',
      'SameSite=Strict',
      ...(isProduction ? ['Secure'] : [])
    ].join('; ');

    res.setHeader('Set-Cookie', clearCookie);

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
