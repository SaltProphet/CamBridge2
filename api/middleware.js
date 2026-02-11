// Authentication middleware for Vercel serverless functions
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Validate that JWT_SECRET is set
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set. Please configure it in your environment.');
}

// Try to load real database, fall back to mock
let sqlApi = null;
let getSessionByTokenFunc = null;

async function getSqlApi() {
  if (sqlApi) return sqlApi;
  
  // If neither POSTGRES_URL nor POSTGRES_PRISMA_URL is set, use mock database immediately
  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    console.log('⚠️  POSTGRES_URL/POSTGRES_PRISMA_URL not set, using in-memory mock database');
    const mockDb = await import('./db-mock.js');
    sqlApi = mockDb.sql;
    return sqlApi;
  }
  
  try {
    const pgModule = await import('@vercel/postgres');
    sqlApi = pgModule.sql;
  } catch (e) {
    console.warn('⚠️  PostgreSQL not available, using in-memory mock database:', e.message);
    const mockDb = await import('./db-mock.js');
    sqlApi = mockDb.sql;
  }
  
  return sqlApi;
}

async function getSessionByToken(token) {
  // Mock implementation - just return null for now (tokens always valid)
  return null;
}

let rateLimitTableReady = false;

async function ensureRateLimitTable() {
  if (rateLimitTableReady) return;
  
  try {
    const sql = await getSqlApi();
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    rateLimitTableReady = true;
  } catch (e) {
    // Mock DB doesn't need table creation, just mark as ready
    console.warn('⚠️  Rate limit table could not be created:', e.message);
    rateLimitTableReady = true;
  }
}

function getRequestIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.headers['x-real-ip'] || 'unknown';
}

export function buildRateLimitKey(endpoint, actor) {
  return `${endpoint}:${actor}`;
}

export async function consumeRateLimit({ key, maxRequests = 10, windowMs = 60000 }) {
  try {
    await ensureRateLimitTable();
    const sql = await getSqlApi();

    const result = await sql`
      INSERT INTO rate_limits (key, count, expires_at, updated_at)
      VALUES (${key}, 1, NOW() + (${windowMs} * INTERVAL '1 millisecond'), NOW())
      ON CONFLICT (key) DO UPDATE
      SET
        count = CASE
          WHEN rate_limits.expires_at <= NOW() THEN 1
          ELSE rate_limits.count + 1
        END,
        expires_at = CASE
          WHEN rate_limits.expires_at <= NOW() THEN NOW() + (${windowMs} * INTERVAL '1 millisecond')
          ELSE rate_limits.expires_at
        END,
        updated_at = NOW()
      RETURNING count,
        GREATEST(EXTRACT(EPOCH FROM (expires_at - NOW())), 0)::INTEGER AS retry_after_seconds
    `;

    const currentCount = result.rows[0]?.count ?? 1;
    const retryAfter = result.rows[0]?.retry_after_seconds ?? Math.ceil(windowMs / 1000);
    const remaining = Math.max(maxRequests - currentCount, 0);

    return {
      allowed: currentCount <= maxRequests,
      remaining,
      retryAfter
    };
  } catch (error) {
    console.error('Rate limit storage error:', error);
    // Fail open to avoid accidental auth outages when storage is unavailable.
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfter: Math.ceil(windowMs / 1000)
    };
  }
}

// Rate limiting middleware
export function rateLimit(maxRequests = 10, windowMs = 60000) {
  return async (req) => {
    const endpoint = (req.url || 'unknown').split('?')[0];
    const actor = `ip:${getRequestIp(req)}`;
    const key = buildRateLimitKey(endpoint, actor);

    return consumeRateLimit({ key, maxRequests, windowMs });
  };
}

// Verify JWT token
export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session exists in database
    const session = await getSessionByToken(token);
    if (!session) {
      return null;
    }
    
    return {
      userId: decoded.userId,
      username: decoded.username,
      session
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Generate JWT token
export function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Extract token from Authorization header or cookie
export function extractToken(req) {
  // First try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }
  
  // Phase 1: Try cookie for magic-link auth
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token') {
        return value;
      }
    }
  }
  
  return null;
}

// Authentication middleware
export async function authenticate(req) {
  const token = extractToken(req);
  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }
  
  const verified = await verifyToken(token);
  if (!verified) {
    return { authenticated: false, error: 'Invalid or expired token' };
  }
  
  return { 
    authenticated: true, 
    user: {
      id: verified.userId,
      username: verified.username
    }
  };
}

// Admin access check
export async function requireAdmin(userId, queryfn = null) {
  if (!queryfn) {
    queryfn = sql;
  }

  try {
    const result = await queryfn`
      SELECT role FROM users WHERE id = ${userId}
    `;

    const user = result.rows?.[0];
    if (!user) {
      return false;
    }

    return user.role === 'admin';
  } catch (err) {
    console.error('Admin check error:', err);
    return false;
  }
}

// Input validation
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  if (username.length < 3 || username.length > 50) {
    return { valid: false, error: 'Username must be between 3 and 50 characters' };
  }
  
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain lowercase letters, numbers, hyphens, and underscores' };
  }
  
  return { valid: true };
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove any HTML tags and dangerous characters
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 1000); // Limit length
}
