// Authentication middleware for Vercel serverless functions
import jwt from 'jsonwebtoken';
import { getSessionByToken } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Rate limiting storage (in-memory, will reset on cold starts)
const rateLimitStore = new Map();

// Rate limiting middleware
export function rateLimit(maxRequests = 10, windowMs = 60000) {
  return (req) => {
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const key = `${ip}:${req.url}`;
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry || now - entry.resetTime > windowMs) {
      entry = { count: 0, resetTime: now };
      rateLimitStore.set(key, entry);
    }
    
    // Check limit
    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    // Increment counter
    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count };
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

// Extract token from Authorization header
export function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
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
