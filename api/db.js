// Database utility functions
// Using Vercel Postgres (migrating to Neon)
import { sql } from '@vercel/postgres';

// Initialize database tables
export async function initializeTables() {
  try {
    // Users table for model accounts
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        bio TEXT,
        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Rooms table for model private rooms
    await sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        room_name VARCHAR(50) UNIQUE NOT NULL,
        access_code VARCHAR(8) NOT NULL,
        daily_room_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        max_session_duration INTEGER DEFAULT 7200,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Sessions table for active sessions
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rooms_user_id ON rooms(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rooms_room_name ON rooms(room_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;

    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error: error.message };
  }
}

// User operations
export async function createUser(username, email, passwordHash, displayName) {
  try {
    const result = await sql`
      INSERT INTO users (username, email, password_hash, display_name)
      VALUES (${username}, ${email}, ${passwordHash}, ${displayName})
      RETURNING id, username, email, display_name, created_at
    `;
    return { success: true, user: result.rows[0] };
  } catch (error) {
    console.error('Create user error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserByUsername(username) {
  try {
    const result = await sql`
      SELECT * FROM users WHERE username = ${username} AND is_active = true
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

export async function getUserByEmail(email) {
  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email} AND is_active = true
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

export async function getUserById(userId) {
  try {
    const result = await sql`
      SELECT id, username, email, display_name, bio, avatar_url, is_active, created_at
      FROM users WHERE id = ${userId} AND is_active = true
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

export async function updateUser(userId, updates) {
  try {
    const { display_name, bio, avatar_url } = updates;
    
    // Build dynamic SET clause only for provided fields
    const setClauses = [];
    const values = [userId];
    let paramIndex = 2;
    
    if (display_name !== undefined) {
      setClauses.push(`display_name = $${paramIndex}`);
      values.push(display_name);
      paramIndex++;
    }
    
    if (bio !== undefined) {
      setClauses.push(`bio = $${paramIndex}`);
      values.push(bio);
      paramIndex++;
    }
    
    if (avatar_url !== undefined) {
      setClauses.push(`avatar_url = $${paramIndex}`);
      values.push(avatar_url);
      paramIndex++;
    }
    
    if (setClauses.length === 0) {
      // No fields to update
      return getUserById(userId).then(user => ({ success: true, user }));
    }
    
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    
    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, username, email, display_name, bio, avatar_url, updated_at
    `;
    
    const result = await sql.query(query, values);
    return { success: true, user: result.rows[0] };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, error: error.message };
  }
}

// Room operations
export async function createRoom(userId, roomName, accessCode) {
  try {
    const dailyRoomUrl = `https://cambridge.daily.co/${roomName}-private`;
    const result = await sql`
      INSERT INTO rooms (user_id, room_name, access_code, daily_room_url)
      VALUES (${userId}, ${roomName}, ${accessCode}, ${dailyRoomUrl})
      RETURNING *
    `;
    return { success: true, room: result.rows[0] };
  } catch (error) {
    console.error('Create room error:', error);
    return { success: false, error: error.message };
  }
}

export async function getRoomsByUserId(userId) {
  try {
    const result = await sql`
      SELECT * FROM rooms WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error('Get rooms error:', error);
    return [];
  }
}

export async function getRoomByName(roomName) {
  try {
    const result = await sql`
      SELECT * FROM rooms WHERE room_name = ${roomName} AND is_active = true
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get room error:', error);
    return null;
  }
}

// Access code format constant
const ACCESS_CODE_REGEX = /^[A-Z0-9]{8}$/;

export async function updateRoom(roomId, userId, updates) {
  try {
    const { access_code, is_active, max_session_duration } = updates;

    // Build dynamic SET clause only for provided fields
    const setClauses = [];
    const values = [roomId, userId];
    let paramIndex = 3;

    if (access_code !== undefined) {
      // Validate access code format
      if (!ACCESS_CODE_REGEX.test(access_code)) {
        return { 
          success: false, 
          error: 'Access code must be 8 uppercase alphanumeric characters' 
        };
      }
      setClauses.push(`access_code = $${paramIndex}`);
      values.push(access_code);
      paramIndex++;
    }

    if (is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    if (max_session_duration !== undefined) {
      setClauses.push(`max_session_duration = $${paramIndex}`);
      values.push(max_session_duration);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      // No fields to update
      return { success: false, error: 'No fields to update' };
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE rooms
      SET ${setClauses.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await sql.query(query, values);
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Room not found or unauthorized' };
    }
    
    return { success: true, room: result.rows[0] };
  } catch (error) {
    console.error('Update room error:', error);
    return { success: false, error: error.message };
  }
}

// Session operations
export async function createSession(userId, token, expiresAt) {
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

export async function getSessionByToken(token) {
  try {
    const result = await sql`
      SELECT s.*, u.username, u.email
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token} AND s.expires_at > NOW() AND u.is_active = true
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

export async function deleteSession(token) {
  try {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
    return { success: true };
  } catch (error) {
    console.error('Delete session error:', error);
    return { success: false, error: error.message };
  }
}

export async function cleanExpiredSessions() {
  try {
    await sql`DELETE FROM sessions WHERE expires_at < NOW()`;
    return { success: true };
  } catch (error) {
    console.error('Clean sessions error:', error);
    return { success: false, error: error.message };
  }
}
