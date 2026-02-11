// Simplified database functions for minimal auth system
// Uses Vercel Postgres with pooled connections, falls back to in-memory mock

import { createPool } from '@vercel/postgres';

// Create connection pool with proper connection string
const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
const pool = connectionString ? createPool({ connectionString }) : null;

// Export sql template tag from pool
export const sql = pool ? pool.sql : null;

// In-memory mock database for testing when no Postgres is available
const mockDb = {
  users: [],
  rooms: [],
  join_requests: [],
  idCounter: 1
};

function generateUUID() {
  return `mock-uuid-${mockDb.idCounter++}`;
}

// Initialize simplified database tables
export async function initializeTables() {
  if (!sql) {
    // Mock mode - tables are already "initialized" in memory
    console.log('Using mock database - tables initialized in memory');
    return { success: true };
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
  // Use mock database if no SQL connection
  if (!sql) {
    const existing = mockDb.users.find(u => u.email === email);
    if (existing) {
      return { success: false, error: 'Email already registered' };
    }
    
    const user = {
      id: generateUUID(),
      email,
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    };
    mockDb.users.push(user);
    
    return { success: true, user: { id: user.id, email: user.email, created_at: user.created_at } };
  }
  
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
  // Use mock database if no SQL connection
  if (!sql) {
    return mockDb.users.find(u => u.email === email) || null;
  }
  
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
  // Use mock database if no SQL connection
  if (!sql) {
    const user = mockDb.users.find(u => u.id === id);
    if (!user) return null;
    return { id: user.id, email: user.email, created_at: user.created_at };
  }
  
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
  // Use mock database if no SQL connection
  if (!sql) {
    const existing = mockDb.rooms.find(r => r.slug === slug);
    if (existing) {
      return { success: false, error: 'Room slug already exists' };
    }
    
    const room = {
      id: generateUUID(),
      owner_id: ownerId,
      slug,
      created_at: new Date().toISOString()
    };
    mockDb.rooms.push(room);
    
    return { success: true, room };
  }
  
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
  // Use mock database if no SQL connection
  if (!sql) {
    return mockDb.rooms.filter(r => r.owner_id === ownerId);
  }
  
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
  // Use mock database if no SQL connection
  if (!sql) {
    return mockDb.rooms.find(r => r.slug === slug) || null;
  }
  
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
  // Use mock database if no SQL connection
  if (!sql) {
    const request = {
      id: generateUUID(),
      room_id: roomId,
      requester_email: requesterEmail,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    mockDb.join_requests.push(request);
    
    return { success: true, request };
  }
  
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
  // Use mock database if no SQL connection
  if (!sql) {
    const ownerRooms = mockDb.rooms.filter(r => r.owner_id === ownerId);
    const roomIds = ownerRooms.map(r => r.id);
    let requests = mockDb.join_requests.filter(jr => roomIds.includes(jr.room_id));
    
    if (status) {
      requests = requests.filter(jr => jr.status === status);
    }
    
    // Add room_slug
    return requests.map(jr => {
      const room = ownerRooms.find(r => r.id === jr.room_id);
      return { ...jr, room_slug: room?.slug };
    });
  }
  
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
  // Use mock database if no SQL connection
  if (!sql) {
    const request = mockDb.join_requests.find(jr => jr.id === requestId);
    if (!request) {
      return { success: false, error: 'Request not found' };
    }
    
    request.status = status;
    return { success: true, request };
  }
  
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
  // Use mock database if no SQL connection
  if (!sql) {
    let requests = mockDb.join_requests.filter(jr => jr.requester_email === email);
    
    if (status) {
      requests = requests.filter(jr => jr.status === status);
    }
    
    // Add room_slug
    return requests.map(jr => {
      const room = mockDb.rooms.find(r => r.id === jr.room_id);
      return { ...jr, room_slug: room?.slug };
    });
  }
  
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
