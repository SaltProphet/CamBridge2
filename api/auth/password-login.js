// API endpoint for BETA MODE creator password login
// Authenticates user with email + password
import bcrypt from 'bcryptjs';
import { generateToken, validateEmail, consumeRateLimit, buildRateLimitKey } from '../middleware.js';
import { killSwitch } from '../policies/gates.js';
import { getRequestId, logPolicyDecision } from '../logging.js';

// Try to load real database, fall back to mock
let sqlApi = null;

async function getSqlApi() {
  if (sqlApi) return sqlApi;
  
  // If neither POSTGRES_URL nor POSTGRES_PRISMA_URL is set, use mock database immediately
  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    console.log('⚠️  POSTGRES_URL/POSTGRES_PRISMA_URL not set, using in-memory mock database');
    const mockDb = await import('../db-mock.js');
    sqlApi = mockDb.sql;
    return sqlApi;
  }
  
  try {
    const pgModule = await import('@vercel/postgres');
    sqlApi = pgModule.sql;
  } catch (e) {
    console.warn('⚠️  PostgreSQL not available, using in-memory mock database:', e.message);
    const mockDb = await import('../db-mock.js');
    sqlApi = mockDb.sql;
  }
  
  return sqlApi;
}

const LOGIN_MAX_REQUESTS = 10;
const ONE_HOUR_MS = 3600000;

// Create session in database
async function createSession(userId, token, expiresAt, sql) {
  try {
    await sql`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (${userId}, ${token}, ${expiresAt})
    `;
    return { success: true };
  } catch (error) {
    console.error('Create session error:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get sql API (real DB or mock)
    const sql = await getSqlApi();

    // Check if BETA_MODE is enabled
    if (!killSwitch.isBetaMode()) {
      return res.status(403).json({ error: 'BETA_MODE is not enabled' });
    }

    const requestId = getRequestId(req);
    const endpoint = '/api/auth/password-login';
    const { email, password } = req.body;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const actorId = normalizedEmail;

    // Rate limit check (per email)
    const rateLimitCheck = await consumeRateLimit({
      key: buildRateLimitKey('auth:password-login', `email:${normalizedEmail}`),
      maxRequests: LOGIN_MAX_REQUESTS,
      windowMs: ONE_HOUR_MS
    });
    if (!rateLimitCheck.allowed) {
      logPolicyDecision({ requestId, endpoint, actorId, decision: 'deny', reason: 'rate limit exceeded' });
      return res.status(429).json({ 
        error: 'Too many login attempts. Please try again in an hour.' 
      });
    }

    // Fetch user by email
    const userResult = await sql`
      SELECT id, username, email, password_hash, display_name, role
      FROM users
      WHERE email = ${normalizedEmail}
    `;

    if (userResult.rows.length === 0) {
      logPolicyDecision({ requestId, endpoint, actorId, decision: 'deny', reason: 'user not found' });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Check if user has password hash (password-based signup)
    if (!user.password_hash) {
      logPolicyDecision({ requestId, endpoint, actorId, decision: 'deny', reason: 'user has no password' });
      return res.status(401).json({ error: 'This account uses email-based login. Please use the magic link method.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      logPolicyDecision({ requestId, endpoint, actorId, decision: 'deny', reason: 'invalid password' });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const jwtToken = generateToken(user.id, user.username);

    // Create session record with 7-day expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createSession(user.id, jwtToken, expiresAt, sql);

    logPolicyDecision({ 
      requestId, 
      endpoint, 
      actorId, 
      decision: 'allow', 
      reason: `password login successful: user ${user.id}`
    });

    // Return success with token
    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Password login error:', error);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}
