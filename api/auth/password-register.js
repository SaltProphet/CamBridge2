// API endpoint for BETA MODE creator password registration
// Creates user + creator account without email verification
import bcrypt from 'bcryptjs';
import { sql } from '@vercel/postgres';
import { generateToken, validateEmail, consumeRateLimit, buildRateLimitKey } from '../middleware.js';
import { PolicyGates, killSwitch } from '../policies/gates.js';
import { getRequestId, logPolicyDecision } from '../logging.js';
import { createRoom } from '../db.js';

const REGISTER_MAX_REQUESTS = 5;
const ONE_HOUR_MS = 3600000;

// Validate password strength
function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

// Validate slug format and length
function validateSlug(slug) {
  if (!slug) return { valid: true, value: null }; // Optional
  if (slug.length < 3 || slug.length > 50) {
    return { valid: false, error: 'Slug must be between 3-50 characters' };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }
  return { valid: true, value: slug.toLowerCase() };
}

// Generate unique slug from display name
async function generateUniqueSlug(displayName) {
  let baseSlug = displayName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Collapse multiple hyphens
    .substring(0, 50);         // Limit length

  if (!baseSlug) {
    baseSlug = 'creator';
  }

  // Check for uniqueness and append counter if needed
  let slug = baseSlug;
  let counter = 1;
  while (counter < 1000) {
    try {
      const result = await sql`
        SELECT id FROM creators WHERE slug = ${slug}
      `;
      if (result.rows.length === 0) {
        return slug; // Found unique slug
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    } catch (error) {
      console.error('Error checking slug uniqueness:', error);
      // Return slug even on error to avoid infinite loop
      return slug;
    }
  }

  // Fallback: use timestamp
  return `${baseSlug}-${Date.now()}`;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if BETA_MODE is enabled
    if (!killSwitch.isBetaMode()) {
      return res.status(403).json({ error: 'BETA_MODE is not enabled' });
    }

    const requestId = getRequestId(req);
    const endpoint = '/api/auth/password-register';
    const { email, password, confirmPassword, displayName, desiredSlug, ageConfirm, tosAccept } = req.body;

    // Validate compliance gates
    if (!ageConfirm || !tosAccept) {
      return res.status(400).json({ error: 'Age confirmation and ToS acceptance are required' });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const actorId = normalizedEmail;

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Validate slug if provided
    let slug = null;
    if (desiredSlug) {
      const slugValidation = validateSlug(desiredSlug);
      if (!slugValidation.valid) {
        return res.status(400).json({ error: slugValidation.error });
      }
      slug = slugValidation.value;
    }

    // Validate display name
    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    if (displayName.length > 200) {
      return res.status(400).json({ error: 'Display name must be under 200 characters' });
    }

    // Rate limit check (per email)
    const rateLimitCheck = await consumeRateLimit({
      key: buildRateLimitKey('auth:password-register', `email:${normalizedEmail}`),
      maxRequests: REGISTER_MAX_REQUESTS,
      windowMs: ONE_HOUR_MS
    });
    if (!rateLimitCheck.allowed) {
      logPolicyDecision({ requestId, endpoint, actorId, decision: 'deny', reason: 'rate limit exceeded' });
      return res.status(429).json({ 
        error: 'Too many registration attempts. Please try again in an hour.' 
      });
    }

    // Check if email already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${normalizedEmail}
    `;
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Generate slug if not provided
    if (!slug) {
      slug = await generateUniqueSlug(displayName);
    } else {
      // Verify desired slug is unique
      const existingSlug = await sql`
        SELECT id FROM creators WHERE slug = ${slug}
      `;
      if (existingSlug.rows.length > 0) {
        return res.status(409).json({ error: 'Slug is already taken' });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with password hash
    const now = new Date();
    const userResult = await sql`
      INSERT INTO users (
        username, email, password_hash, display_name, is_active, 
        role, age_attested_at, tos_accepted_at, created_at, updated_at
      ) VALUES (
        ${normalizedEmail}, 
        ${normalizedEmail}, 
        ${passwordHash}, 
        ${displayName},
        true,
        'creator',
        ${now},
        ${now},
        ${now},
        ${now}
      )
      RETURNING id, username, email, display_name
    `;

    if (userResult.rows.length === 0) {
      console.error('Failed to create user');
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    const user = userResult.rows[0];
    const userId = user.id;

    // Create creator record with plan_status='beta'
    const creatorResult = await sql`
      INSERT INTO creators (
        user_id, slug, display_name, plan_status, status, created_at
      ) VALUES (
        ${userId},
        ${slug},
        ${displayName},
        'beta',
        'active',
        ${now}
      )
      RETURNING id, slug
    `;

    if (creatorResult.rows.length === 0) {
      console.error('Failed to create creator record');
      return res.status(500).json({ error: 'Failed to create creator record' });
    }

    const creator = creatorResult.rows[0];
    const creatorId = creator.id;

    // Create default "main" public room
    try {
      const roomResult = await sql`
        INSERT INTO rooms (
          creator_id, room_slug, room_name, room_type, enabled, join_mode, created_at, updated_at
        ) VALUES (
          ${creatorId},
          'main',
          'main',
          'public',
          true,
          'knock',
          ${now},
          ${now}
        )
        RETURNING id
      `;

      if (roomResult.rows.length === 0) {
        console.warn('Failed to create default room for creator');
        // Don't fail the registration, just warn
      }
    } catch (roomError) {
      console.warn('Error creating default room:', roomError);
      // Don't fail the registration
    }

    // Generate JWT token
    const jwtToken = generateToken(userId, user.username);

    logPolicyDecision({ 
      requestId, 
      endpoint, 
      actorId, 
      decision: 'allow', 
      reason: `creator registered: ${creatorId}`
    });

    // Return success with token and redirect info
    return res.status(201).json({
      success: true,
      token: jwtToken,
      user: {
        id: userId,
        email: user.email,
        displayName: user.display_name,
        role: 'creator'
      },
      creator: {
        id: creatorId,
        slug: creator.slug
      }
    });

  } catch (error) {
    console.error('Password registration error:', error);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}
