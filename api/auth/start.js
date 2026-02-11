// API endpoint to initiate magic-link authentication
// Phase 1: Email-based passwordless login
import crypto from 'crypto';
import { Resend } from 'resend';
import { createLoginToken } from '../db.js';
import { validateEmail, rateLimit } from '../middleware.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@cambridge.app';

// Rate limit: 5 requests per hour per email
const emailRateLimit = rateLimit(5, 3600000); // 1 hour in ms

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, returnTo } = req.body;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit check (per email)
    const rateLimitCheck = emailRateLimit(req);
    if (!rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded for email: ${normalizedEmail}`);
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

    // Send email via Resend
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: normalizedEmail,
        subject: 'Your CamBridge Login Link',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'JetBrains Mono', monospace; background: #000; color: #fff; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .header { color: #00ff88; font-size: 24px; letter-spacing: 0.2rem; margin-bottom: 20px; }
              .content { line-height: 1.6; color: #ccc; }
              .button { 
                display: inline-block; 
                background: #00ff88; 
                color: #000; 
                padding: 12px 24px; 
                text-decoration: none; 
                font-weight: bold;
                margin: 20px 0;
                letter-spacing: 0.1rem;
              }
              .footer { color: #555; font-size: 12px; margin-top: 40px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">CAMBRIDGE</div>
              <div class="content">
                <p>Click the button below to log in to your CamBridge account:</p>
                <a href="${magicLinkUrl}" class="button">LOG IN TO CAMBRIDGE</a>
                <p>This link will expire in 15 minutes.</p>
                <p>If you didn't request this login link, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>CamBridge - Privacy-First Video Bridge</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log(`Magic link sent to ${normalizedEmail}`);
      
      return res.status(200).json({
        success: true,
        message: 'Login link sent to your email',
        email: normalizedEmail
      });

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // For development, log the magic link
      if (process.env.NODE_ENV === 'development') {
        console.log('\n=== DEVELOPMENT MODE ===');
        console.log('Magic Link:', magicLinkUrl);
        console.log('========================\n');
      }
      
      return res.status(500).json({ 
        error: 'Failed to send email. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { magicLink: magicLinkUrl })
      });
    }

  } catch (error) {
    console.error('Magic link start error:', error);
    return res.status(500).json({ 
      error: 'An error occurred. Please try again.' 
    });
  }
}
