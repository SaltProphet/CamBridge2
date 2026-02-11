// API endpoint to initiate magic-link authentication
// Phase 1: Email-based passwordless login
// Phase 0: Uses email provider abstraction and policy gates
import crypto from 'crypto';
import { createLoginToken } from '../db.js';
import { validateEmail } from '../middleware.js';
import { getEmailProvider } from '../providers/email.js';
import { PolicyGates } from '../policies/gates.js';
import { getRequestId, logPolicyDecision } from '../logging.js';
import { assertProviderSecrets } from '../env.js';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

// Email-based rate limiting storage
const emailRateLimitStore = new Map();

// Rate limit: 5 requests per hour per email
function checkEmailRateLimit(email) {
  const now = Date.now();
  const windowMs = 3600000; // 1 hour
  const maxRequests = 5;
  
  let entry = emailRateLimitStore.get(email);
  if (!entry || now - entry.resetTime > windowMs) {
    entry = { count: 0, resetTime: now };
    emailRateLimitStore.set(email, entry);
  }
  
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestId = getRequestId(req);
    const endpoint = '/api/auth/start';
    const { email, returnTo } = req.body;

    // Phase 0: Check signup policy (kill switch)
    const signupCheck = PolicyGates.checkSignupPolicies();
    if (!signupCheck.allowed) {
      logPolicyDecision({ requestId, endpoint, actorId: null, decision: 'deny', reason: signupCheck.reason || 'signup policy blocked' });
      return res.status(403).json({ error: signupCheck.reason });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const actorId = normalizedEmail;

    // Rate limit check (per email)
    const rateLimitCheck = checkEmailRateLimit(normalizedEmail);
    if (!rateLimitCheck.allowed) {
      logPolicyDecision({ requestId, endpoint, actorId, decision: 'deny', reason: 'rate limit exceeded' });
      return res.status(429).json({ 
        error: 'Too many login attempts. Please try again in an hour.' 
      });
    }

    // Generate random token (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');
    
    // Hash token for storage (SHA-256)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Set expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Store hashed token in database
    const result = await createLoginToken(normalizedEmail, tokenHash, expiresAt);
    if (!result.success) {
      console.error('Failed to create login token:', result.error);
      return res.status(500).json({ error: 'Failed to create login token' });
    }

    // Construct magic link URL
    const returnPath = returnTo || '/dashboard';
    const magicLinkUrl = `${APP_BASE_URL}/api/auth/callback?token=${token}&returnTo=${encodeURIComponent(returnPath)}`;

    // Phase 0: Send email via provider abstraction
    const emailProviderName = process.env.EMAIL_PROVIDER || 'resend';
    assertProviderSecrets('email', emailProviderName);
    const emailProvider = getEmailProvider();
    const emailResult = await emailProvider.sendMagicLink(normalizedEmail, magicLinkUrl);

    if (!emailResult.success) {
      logPolicyDecision({ requestId, endpoint, actorId, decision: 'deny', reason: `email send failed: ${emailResult.error || 'unknown error'}` });
      console.error('Email sending error:', emailResult.error);
      
      // For development, log the magic link
      if (process.env.NODE_ENV === 'development' || process.env.EMAIL_PROVIDER === 'console') {
        console.log('\n=== DEVELOPMENT MODE ===');
        console.log('Magic Link:', magicLinkUrl);
        console.log('========================\n');
      }
      
      return res.status(500).json({ 
        error: 'Failed to send email. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { magicLink: magicLinkUrl })
      });
    }

    logPolicyDecision({ requestId, endpoint, actorId, decision: 'allow', reason: 'magic link sent' });
    
    return res.status(200).json({
      success: true,
      message: 'Login link sent to your email',
      email: normalizedEmail
    });

  } catch (error) {
    console.error('Magic link start error:', { requestId: getRequestId(req), endpoint: '/api/auth/start', error: error.message });
    return res.status(500).json({ 
      error: 'An error occurred. Please try again.' 
    });
  }
}
