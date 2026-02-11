// API endpoint to verify magic-link token and authenticate user
// Phase 1: Token verification, user creation/login, cookie setting
import crypto from 'crypto';
import { getLoginToken, markLoginTokenUsed, getUserByEmail, createUserByEmail, createSession } from '../db.js';
import { generateToken } from '../middleware.js';
import { getRequestId, logPolicyDecision } from '../logging.js';

function safeRedirectPath(returnTo) {
  if (typeof returnTo !== 'string') {
    return '/dashboard';
  }

  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return '/dashboard';
  }

  return returnTo;
}

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestId = getRequestId(req);
    const endpoint = '/api/auth/callback';
    const { token, returnTo } = req.query;

    // Validate token parameter
    if (!token || typeof token !== 'string' || token.length !== 64) {
      logPolicyDecision({ requestId, endpoint, actorId: null, decision: 'deny', reason: 'invalid token format' });
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link - CamBridge</title>
          <style>
            body { font-family: 'JetBrains Mono', monospace; background: #000; color: #fff; text-align: center; padding: 100px; }
            .error { color: #ff4444; font-size: 20px; margin-bottom: 20px; }
            .message { color: #ccc; }
          </style>
        </head>
        <body>
          <div class="error">INVALID LOGIN LINK</div>
          <div class="message">The login link is invalid or malformed.</div>
        </body>
        </html>
      `);
    }

    // Hash the token to match stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Get token from database
    const loginToken = await getLoginToken(tokenHash);
    
    if (!loginToken) {
      logPolicyDecision({ requestId, endpoint, actorId: null, decision: 'deny', reason: 'token expired or already used' });
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expired Link - CamBridge</title>
          <style>
            body { font-family: 'JetBrains Mono', monospace; background: #000; color: #fff; text-align: center; padding: 100px; }
            .error { color: #ff4444; font-size: 20px; margin-bottom: 20px; }
            .message { color: #ccc; }
          </style>
        </head>
        <body>
          <div class="error">LINK EXPIRED OR ALREADY USED</div>
          <div class="message">This login link has expired or has already been used. Please request a new one.</div>
        </body>
        </html>
      `);
    }

    // Mark token as used (single-use)
    await markLoginTokenUsed(tokenHash);

    const email = loginToken.email;
    const actorId = email;

    // Check if user exists
    let user = await getUserByEmail(email);
    
    // If user doesn't exist, create new user
    if (!user) {
      const createResult = await createUserByEmail(email);
      if (!createResult.success) {
        logPolicyDecision({ requestId, endpoint, actorId, decision: 'deny', reason: `user auto-create failed: ${createResult.error || 'unknown error'}` });
        console.error('Failed to create user:', createResult.error);
        return res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error - CamBridge</title>
            <style>
              body { font-family: 'JetBrains Mono', monospace; background: #000; color: #fff; text-align: center; padding: 100px; }
              .error { color: #ff4444; font-size: 20px; margin-bottom: 20px; }
              .message { color: #ccc; }
            </style>
          </head>
          <body>
            <div class="error">ACCOUNT CREATION FAILED</div>
            <div class="message">Unable to create your account. Please try again.</div>
          </body>
          </html>
        `);
      }
      user = createResult.user;
    }

    // Generate JWT token
    const jwtToken = generateToken(user.id, user.username);

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store session in database
    const sessionResult = await createSession(user.id, jwtToken, expiresAt);
    if (!sessionResult.success) {
      logPolicyDecision({ requestId, endpoint, actorId: user.id, decision: 'deny', reason: `session creation failed: ${sessionResult.error || 'unknown error'}` });
      console.error('Session creation failed:', sessionResult.error);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error - CamBridge</title>
          <style>
            body { font-family: 'JetBrains Mono', monospace; background: #000; color: #fff; text-align: center; padding: 100px; }
            .error { color: #ff4444; font-size: 20px; margin-bottom: 20px; }
            .message { color: #ccc; }
          </style>
        </head>
        <body>
          <div class="error">SESSION CREATION FAILED</div>
          <div class="message">Unable to create your session. Please try again.</div>
        </body>
        </html>
      `);
    }

    // Set auth cookie (HttpOnly, Secure in production, SameSite=Strict)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `auth_token=${jwtToken}`,
      'Path=/',
      `Max-Age=${7 * 24 * 60 * 60}`, // 7 days in seconds
      'HttpOnly',
      'SameSite=Strict',
      ...(isProduction ? ['Secure'] : [])
    ].join('; ');

    res.setHeader('Set-Cookie', cookieOptions);

    logPolicyDecision({ requestId, endpoint, actorId: user.id, decision: 'allow', reason: 'magic-link authentication completed' });

    // Redirect to return URL or dashboard
    const redirectUrl = returnTo || '/dashboard';
    
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error('Magic link callback error:', { requestId: getRequestId(req), endpoint: '/api/auth/callback', error: error.message });
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - CamBridge</title>
        <style>
          body { font-family: 'JetBrains Mono', monospace; background: #000; color: #fff; text-align: center; padding: 100px; }
          .error { color: #ff4444; font-size: 20px; margin-bottom: 20px; }
          .message { color: #ccc; }
        </style>
      </head>
      <body>
        <div class="error">AUTHENTICATION ERROR</div>
        <div class="message">An error occurred during authentication. Please try again.</div>
      </body>
      </html>
    `);
  }
}
