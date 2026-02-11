// API endpoint for model login
import bcrypt from 'bcryptjs';
import { getUserByUsername, createSession } from '../db.js';
import { generateToken, rateLimit } from '../middleware.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting: 10 login attempts per 15 minutes
  const rateLimitCheck = await rateLimit(10, 900000)(req);
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({ 
      error: 'Too many login attempts. Please try again later.' 
    });
  }

  try {
    const { username, password } = req.body;

    // Validate inputs
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get user from database
    const user = await getUserByUsername(username.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.username);

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store session in database
    const sessionResult = await createSession(user.id, token, expiresAt);
    if (!sessionResult.success) {
      console.error('Session creation failed:', sessionResult.error);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    // Return success with token
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        bio: user.bio,
        avatarUrl: user.avatar_url
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'An error occurred during login' 
    });
  }
}
