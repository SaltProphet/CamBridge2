// API endpoint for model logout
import { deleteSession } from '../db.js';
import { extractToken } from '../middleware.js';
import { getRequestId, logPolicyDecision } from '../logging.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const endpoint = '/api/auth/logout';

  try {
    const token = extractToken(req);
    if (!token) {
      logPolicyDecision({ requestId, endpoint, actorId: null, decision: 'deny', reason: 'missing auth token' });
      return res.status(400).json({ error: 'No token provided' });
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

    const isProduction = process.env.NODE_ENV === 'production';
    const clearCookieOptions = [
      'auth_token=',
      'Path=/',
      'Max-Age=0',
      'HttpOnly',
      'SameSite=Strict',
      ...(isProduction ? ['Secure'] : [])
    ].join('; ');

    res.setHeader('Set-Cookie', clearCookieOptions);
    logPolicyDecision({ requestId, endpoint, actorId: null, decision: 'allow', reason: 'session deleted and cookie cleared' });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', { requestId, endpoint, error: error.message });
    return res.status(500).json({ 
      error: 'An error occurred during logout' 
    });
  }
}
