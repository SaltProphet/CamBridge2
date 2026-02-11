// API endpoint for model registration
import bcrypt from 'bcryptjs';
import { createUser, getUserByUsername, getUserByEmail, createRoom } from '../db.js';
import { 
  validateUsername, 
  validateEmail, 
  validatePassword, 
  sanitizeInput,
  rateLimit
} from '../middleware.js';

// Generate random access code (8 uppercase alphanumeric characters)
// Format defined by ACCESS_CODE_REGEX in db.js
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting: 5 registration attempts per hour
  const rateLimitCheck = await rateLimit(5, 3600000)(req);
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ 
      error: 'Too many registration attempts. Please try again later.' 
    });
  }

  try {
    const { username, email, password, displayName } = req.body;

    // Validate inputs
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.error });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Sanitize inputs
    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanDisplayName = sanitizeInput(displayName || cleanUsername);

    // Check if username already exists
    const existingUser = await getUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const existingEmail = await getUserByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await createUser(
      cleanUsername,
      cleanEmail,
      passwordHash,
      cleanDisplayName
    );

    if (!userResult.success) {
      console.error('User creation failed:', userResult.error);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    const user = userResult.user;

    // Create default room for the model
    const accessCode = generateAccessCode();
    const roomResult = await createRoom(user.id, cleanUsername, accessCode);

    if (!roomResult.success) {
      console.error('Room creation failed:', roomResult.error);
      // User was created but room creation failed
      // Could delete user or just continue without room
    }

    // Return success (without password hash)
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at
      },
      room: roomResult.success ? {
        roomName: roomResult.room.room_name,
        accessCode: roomResult.room.access_code
      } : null
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'An error occurred during registration' 
    });
  }
}
