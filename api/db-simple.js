// Simplified database functions for minimal auth system
// Uses Vercel Postgres with pooled connections

import { createPool } from '@vercel/postgres';

// Create connection pool with proper connection string
const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
const pool = connectionString ? createPool({ connectionString }) : null;

// Export sql template tag from pool
export const sql = pool ? pool.sql : null;

// Initialize simplified database tables
export async function initializeTables() {
  if (!sql) {
    throw new Error('Database not configured. Set POSTGRES_PRISMA_URL or POSTGRES_URL environment variable.');
  }
  
  try {
    // Simplified users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;

    // Simplified rooms table
    await sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slug VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON rooms(owner_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms(slug)`;

    // Simplified join_requests table
    await sql`
      CREATE TABLE IF NOT EXISTS join_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        requester_email VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_join_requests_room_id ON join_requests(room_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status)`;

    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error: error.message };
  }
}

// User operations
export async function createUser(email, passwordHash) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    const result = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${passwordHash})
      RETURNING id, email, created_at
    `;
    return { success: true, user: result.rows[0] };
  } catch (error) {
    console.error('Create user error:', error);
    if (error.message.includes('duplicate key')) {
      return { success: false, error: 'Email already registered' };
    }
    return { success: false, error: error.message };
  }
}

export async function getUserByEmail(email) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

export async function getUserById(id) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    const result = await sql`
      SELECT id, email, created_at FROM users WHERE id = ${id}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get user by ID error:', error);
    return null;
  }
}

// Room operations
export async function createRoom(ownerId, slug) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    const result = await sql`
      INSERT INTO rooms (owner_id, slug)
      VALUES (${ownerId}, ${slug})
      RETURNING id, owner_id, slug, created_at
    `;
    return { success: true, room: result.rows[0] };
  } catch (error) {
    console.error('Create room error:', error);
    if (error.message.includes('duplicate key')) {
      return { success: false, error: 'Room slug already exists' };
    }
    return { success: false, error: error.message };
  }
}

export async function getRoomsByOwnerId(ownerId) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    const result = await sql`
      SELECT id, owner_id, slug, created_at 
      FROM rooms 
      WHERE owner_id = ${ownerId}
      ORDER BY created_at DESC
    `;
    return result.rows;
  } catch (error) {
    console.error('Get rooms error:', error);
    return [];
  }
}

export async function getRoomBySlug(slug) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    const result = await sql`
      SELECT * FROM rooms WHERE slug = ${slug}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('Get room error:', error);
    return null;
  }
}

// Join request operations
export async function createJoinRequest(roomId, requesterEmail) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    const result = await sql`
      INSERT INTO join_requests (room_id, requester_email, status)
      VALUES (${roomId}, ${requesterEmail}, 'pending')
      RETURNING id, room_id, requester_email, status, created_at
    `;
    return { success: true, request: result.rows[0] };
  } catch (error) {
    console.error('Create join request error:', error);
    return { success: false, error: error.message };
  }
}

export async function getJoinRequestsByOwnerId(ownerId, status = null) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    let query;
    if (status) {
      query = sql`
        SELECT jr.id, jr.room_id, jr.requester_email, jr.status, jr.created_at, r.slug as room_slug
        FROM join_requests jr
        JOIN rooms r ON jr.room_id = r.id
        WHERE r.owner_id = ${ownerId} AND jr.status = ${status}
        ORDER BY jr.created_at DESC
      `;
    } else {
      query = sql`
        SELECT jr.id, jr.room_id, jr.requester_email, jr.status, jr.created_at, r.slug as room_slug
        FROM join_requests jr
        JOIN rooms r ON jr.room_id = r.id
        WHERE r.owner_id = ${ownerId}
        ORDER BY jr.created_at DESC
      `;
    }
    const result = await query;
    return result.rows;
  } catch (error) {
    console.error('Get join requests error:', error);
    return [];
  }
}

export async function updateJoinRequestStatus(requestId, status) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    const result = await sql`
      UPDATE join_requests
      SET status = ${status}
      WHERE id = ${requestId}
      RETURNING id, room_id, requester_email, status, created_at
    `;
    return { success: true, request: result.rows[0] };
  } catch (error) {
    console.error('Update join request error:', error);
    return { success: false, error: error.message };
  }
}

export async function getJoinRequestsByEmail(email, status = null) {
  if (!sql) throw new Error('Database not configured');
  
  try {
    let query;
    if (status) {
      query = sql`
        SELECT jr.*, r.slug as room_slug
        FROM join_requests jr
        JOIN rooms r ON jr.room_id = r.id
        WHERE jr.requester_email = ${email} AND jr.status = ${status}
        ORDER BY jr.created_at DESC
      `;
    } else {
      query = sql`
        SELECT jr.*, r.slug as room_slug
        FROM join_requests jr
        JOIN rooms r ON jr.room_id = r.id
        WHERE jr.requester_email = ${email}
        ORDER BY jr.created_at DESC
      `;
    }
    const result = await query;
    return result.rows;
  } catch (error) {
    console.error('Get join requests by email error:', error);
    return [];
  }
}
