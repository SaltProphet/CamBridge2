// POST /api/register
// Register new user with email and password

import bcrypt from 'bcryptjs';
import { createUser, getUserByEmail, usingMockDb } from './db-simple.js';

const DEFAULT_BCRYPT_ROUNDS = 12;
const MIN_BCRYPT_ROUNDS = 8;
const MAX_BCRYPT_ROUNDS = 15;

function getBcryptRounds() {
  const raw = process.env.BCRYPT_ROUNDS;
  if (!raw) {
    return DEFAULT_BCRYPT_ROUNDS;
  }

  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_BCRYPT_ROUNDS;
  }

  // Clamp to a safe range to avoid too-weak or too-slow hashes
  if (parsed < MIN_BCRYPT_ROUNDS) {
    return MIN_BCRYPT_ROUNDS;
  }
  if (parsed > MAX_BCRYPT_ROUNDS) {
    return MAX_BCRYPT_ROUNDS;
  }

  return parsed;
}

const BCRYPT_ROUNDS = getBcryptRounds();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password with bcrypt (12 rounds by default)
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const result = await createUser(email, passwordHash);

    if (result.success) {
      // Warn if using mock database
      if (usingMockDb) {
        console.warn('⚠️  User registered in MOCK database - data will be lost on restart!');
        console.warn(`⚠️  Email: ${email}`);
      } else {
        console.log(`✅ User registered in real database: ${email}`);
      }
      
      return res.status(200).json({ 
        ok: true,
        warning: usingMockDb ? 'Using temporary database - data will not persist' : null
      });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
