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

    // ==================================================
    // PHASE 1: Additional tables and columns
    // ==================================================

    // Extend users table with Phase 1 fields
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'client'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS age_attested_at TIMESTAMPTZ`;

    // login_tokens table for magic links
    await sql`
      CREATE TABLE IF NOT EXISTS login_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_tokens_email ON login_tokens(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_tokens_token_hash ON login_tokens(token_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_tokens_expires_at ON login_tokens(expires_at)`;

    // creators table
    await sql`
      CREATE TABLE IF NOT EXISTS creators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(200),
        plan VARCHAR(50) DEFAULT 'free',
        status VARCHAR(20) DEFAULT 'active',
        referral_code VARCHAR(20) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_creators_slug ON creators(slug)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_creators_user_id ON creators(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status)`;

    // Extend rooms table with Phase 1 fields
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_slug VARCHAR(100)`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) DEFAULT 'public'`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS join_mode VARCHAR(20) DEFAULT 'knock'`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_participants INTEGER`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rooms_creator_id ON rooms(creator_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rooms_room_slug ON rooms(room_slug)`;

    // join_requests table
    await sql`
      CREATE TABLE IF NOT EXISTS join_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        daily_token VARCHAR(500),
        token_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        decided_at TIMESTAMPTZ,
        decision_reason VARCHAR(500),
        ip_hash VARCHAR(255),
        device_hash VARCHAR(255)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_join_requests_creator_id ON join_requests(creator_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON join_requests(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_join_requests_created_at ON join_requests(created_at)`;

    // bans table
    await sql`
      CREATE TABLE IF NOT EXISTS bans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        email VARCHAR(255),
        ip_hash VARCHAR(255),
        device_hash VARCHAR(255),
        reason VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        active BOOLEAN DEFAULT TRUE
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_bans_creator_id ON bans(creator_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bans_user_id ON bans(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bans_email ON bans(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bans_active ON bans(active)`;

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

export async function getRoomById(roomId) {
  try {
    const result = await sql`
      SELECT * FROM rooms WHERE id = ${roomId} AND is_active = true
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get room by ID error:', error);
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

// ==================================================
// PHASE 1: Magic-Link Token Operations
// ==================================================

export async function createLoginToken(email, tokenHash, expiresAt) {
  try {
    const result = await sql`
      INSERT INTO login_tokens (email, token_hash, expires_at)
      VALUES (${email}, ${tokenHash}, ${expiresAt})
      RETURNING id, email, created_at, expires_at
    `;
    return { success: true, token: result.rows[0] };
  } catch (error) {
    console.error('Create login token error:', error);
    return { success: false, error: error.message };
  }
}

export async function getLoginToken(tokenHash) {
  try {
    const result = await sql`
      SELECT * FROM login_tokens 
      WHERE token_hash = ${tokenHash} 
        AND expires_at > NOW() 
        AND used_at IS NULL
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get login token error:', error);
    return null;
  }
}

export async function markLoginTokenUsed(tokenHash) {
  try {
    await sql`
      UPDATE login_tokens 
      SET used_at = NOW() 
      WHERE token_hash = ${tokenHash}
    `;
    return { success: true };
  } catch (error) {
    console.error('Mark token used error:', error);
    return { success: false, error: error.message };
  }
}

export async function cleanExpiredLoginTokens() {
  try {
    await sql`DELETE FROM login_tokens WHERE expires_at < NOW()`;
    return { success: true };
  } catch (error) {
    console.error('Clean login tokens error:', error);
    return { success: false, error: error.message };
  }
}

// ==================================================
// PHASE 1: User Operations (Extended)
// ==================================================

export async function createUserByEmail(email, displayName = null) {
  try {
    // Generate a placeholder username from email
    let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    
    // Ensure username is not empty after sanitization
    if (!username || username.length < 3) {
      username = `user_${Math.random().toString(36).substring(2, 8)}`;
    }
    
    const result = await sql`
      INSERT INTO users (username, email, password_hash, display_name)
      VALUES (${username}, ${email}, '', ${displayName || username})
      RETURNING id, username, email, display_name, created_at
    `;
    return { success: true, user: result.rows[0] };
  } catch (error) {
    // If username conflict, try with random suffix
    if (error.code === '23505') { // unique violation
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      let uniqueUsername = `${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${randomSuffix}`;
      
      // Ensure username is valid
      if (uniqueUsername.length < 3 || uniqueUsername.startsWith('_')) {
        uniqueUsername = `user_${randomSuffix}`;
      }
      
      try {
        const result = await sql`
          INSERT INTO users (username, email, password_hash, display_name)
          VALUES (${uniqueUsername}, ${email}, '', ${displayName || uniqueUsername})
          RETURNING id, username, email, display_name, created_at
        `;
        return { success: true, user: result.rows[0] };
      } catch (retryError) {
        console.error('Create user retry error:', retryError);
        return { success: false, error: retryError.message };
      }
    }
    console.error('Create user error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserAcceptance(userId, ageAttested, tosAccepted) {
  try {
    // Build update query dynamically
    if (!ageAttested && !tosAccepted) {
      return { success: false, error: 'No acceptance flags provided' };
    }
    
    // Use template literal syntax consistently
    let result;
    if (ageAttested && tosAccepted) {
      result = await sql`
        UPDATE users
        SET age_attested_at = CURRENT_TIMESTAMP, tos_accepted_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
        RETURNING id, username, email, role, age_attested_at, tos_accepted_at
      `;
    } else if (ageAttested) {
      result = await sql`
        UPDATE users
        SET age_attested_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
        RETURNING id, username, email, role, age_attested_at, tos_accepted_at
      `;
    } else {
      result = await sql`
        UPDATE users
        SET tos_accepted_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
        RETURNING id, username, email, role, age_attested_at, tos_accepted_at
      `;
    }
    
    return { success: true, user: result.rows[0] };
  } catch (error) {
    console.error('Update user acceptance error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserRole(userId, role) {
  try {
    const result = await sql`
      UPDATE users
      SET role = ${role}
      WHERE id = ${userId}
      RETURNING id, username, email, role
    `;
    return { success: true, user: result.rows[0] };
  } catch (error) {
    console.error('Update user role error:', error);
    return { success: false, error: error.message };
  }
}

// ==================================================
// PHASE 1: Creator Operations
// ==================================================

export async function createCreator(userId, slug, displayName, referralCode = null) {
  try {
    const result = await sql`
      INSERT INTO creators (user_id, slug, display_name, referral_code)
      VALUES (${userId}, ${slug}, ${displayName}, ${referralCode})
      RETURNING *
    `;
    return { success: true, creator: result.rows[0] };
  } catch (error) {
    console.error('Create creator error:', error);
    return { success: false, error: error.message };
  }
}

export async function getCreatorBySlug(slug) {
  try {
    const result = await sql`
      SELECT c.*, u.username, u.email, u.display_name as user_display_name
      FROM creators c
      JOIN users u ON c.user_id = u.id
      WHERE c.slug = ${slug} AND c.status = 'active'
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get creator by slug error:', error);
    return null;
  }
}

export async function getCreatorByUserId(userId) {
  try {
    const result = await sql`
      SELECT * FROM creators WHERE user_id = ${userId}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get creator by user ID error:', error);
    return null;
  }
}

export async function getCreatorById(creatorId) {
  try {
    const result = await sql`
      SELECT * FROM creators WHERE id = ${creatorId}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get creator by ID error:', error);
    return null;
  }
}

// ==================================================
// PHASE 1: Join Request Operations
// ==================================================

export async function createJoinRequest(creatorId, roomId, userId, ipHash, deviceHash) {
  try {
    const result = await sql`
      INSERT INTO join_requests (creator_id, room_id, user_id, ip_hash, device_hash)
      VALUES (${creatorId}, ${roomId}, ${userId}, ${ipHash}, ${deviceHash})
      RETURNING *
    `;
    return { success: true, request: result.rows[0] };
  } catch (error) {
    console.error('Create join request error:', error);
    return { success: false, error: error.message };
  }
}

export async function getJoinRequestById(requestId) {
  try {
    const result = await sql`
      SELECT jr.*, u.username, u.email, c.slug as creator_slug
      FROM join_requests jr
      JOIN users u ON jr.user_id = u.id
      JOIN creators c ON jr.creator_id = c.id
      WHERE jr.id = ${requestId}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get join request error:', error);
    return null;
  }
}

export async function updateJoinRequestStatus(requestId, status, dailyToken = null, tokenExpiresAt = null, decisionReason = null) {
  try {
    const result = await sql`
      UPDATE join_requests
      SET status = ${status},
          daily_token = ${dailyToken},
          token_expires_at = ${tokenExpiresAt},
          decided_at = NOW(),
          decision_reason = ${decisionReason}
      WHERE id = ${requestId}
      RETURNING *
    `;
    return { success: true, request: result.rows[0] };
  } catch (error) {
    console.error('Update join request status error:', error);
    return { success: false, error: error.message };
  }
}

export async function getJoinRequestsByCreator(creatorId, status = null) {
  try {
    let result;
    if (status) {
      result = await sql`
        SELECT jr.*, u.username, u.email, u.display_name,
               r.room_name, r.room_slug
        FROM join_requests jr
        JOIN users u ON jr.user_id = u.id
        LEFT JOIN rooms r ON jr.room_id = r.id
        WHERE jr.creator_id = ${creatorId} AND jr.status = ${status}
        ORDER BY jr.created_at DESC
      `;
    } else {
      result = await sql`
        SELECT jr.*, u.username, u.email, u.display_name,
               r.room_name, r.room_slug
        FROM join_requests jr
        JOIN users u ON jr.user_id = u.id
        LEFT JOIN rooms r ON jr.room_id = r.id
        WHERE jr.creator_id = ${creatorId}
        ORDER BY jr.created_at DESC
      `;
    }
    return result.rows;
  } catch (error) {
    console.error('Get join requests by creator error:', error);
    return [];
  }
}

// ==================================================
// PHASE 1: Ban Operations
// ==================================================

export async function createBan(creatorId, userId = null, email = null, ipHash = null, deviceHash = null, reason = null) {
  try {
    const result = await sql`
      INSERT INTO bans (creator_id, user_id, email, ip_hash, device_hash, reason)
      VALUES (${creatorId}, ${userId}, ${email}, ${ipHash}, ${deviceHash}, ${reason})
      RETURNING *
    `;
    return { success: true, ban: result.rows[0] };
  } catch (error) {
    console.error('Create ban error:', error);
    return { success: false, error: error.message };
  }
}

export async function checkBan(creatorId, userId = null, email = null, ipHash = null, deviceHash = null) {
  try {
    const result = await sql`
      SELECT * FROM bans 
      WHERE creator_id = ${creatorId} 
        AND active = true
        AND (
          (user_id IS NOT NULL AND user_id = ${userId})
          OR (email IS NOT NULL AND email = ${email})
          OR (ip_hash IS NOT NULL AND ip_hash = ${ipHash})
          OR (device_hash IS NOT NULL AND device_hash = ${deviceHash})
        )
      LIMIT 1
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Check ban error:', error);
    return null;
  }
}

export async function deleteBan(banId, creatorId) {
  try {
    const result = await sql`
      UPDATE bans
      SET active = false
      WHERE id = ${banId} AND creator_id = ${creatorId}
      RETURNING *
    `;
    return { success: true, ban: result.rows[0] };
  } catch (error) {
    console.error('Delete ban error:', error);
    return { success: false, error: error.message };
  }
}

export async function getBansByCreator(creatorId) {
  try {
    const result = await sql`
      SELECT b.*, u.username, u.email as user_email
      FROM bans b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.creator_id = ${creatorId} AND b.active = true
      ORDER BY b.created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error('Get bans by creator error:', error);
    return [];
  }
}
