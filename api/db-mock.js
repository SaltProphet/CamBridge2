/**
 * In-memory mock database for local development and testing
 * Used when POSTGRES_URL is not available
 * DO NOT use in production
 */

const mockDb = {
  users: [],
  creators: [],
  rooms: [],
  tokens: [],
  idCounter: 1
};

function generateId() {
  return mockDb.idCounter++;
}

export const sql = async (strings, ...values) => {
  const query = strings[0];
  
  // INSERT INTO users (...)
  if (query.includes('INSERT INTO users')) {
    const email = values[1]; // email is typically the 2nd parameter
    const displayName = values[3];
    const passwordHash = values[2];
    const now = values[4]; // created_at
    
    const id = generateId();
    mockDb.users.push({
      id,
      username: email,
      email,
      password_hash: passwordHash,
      display_name: displayName,
      is_active: true,
      role: 'creator',
      created_at: now,
      updated_at: now
    });
    
    return {
      rows: [{
        id,
        username: email,
        email,
        display_name: displayName
      }]
    };
  }
  
  // SELECT id FROM users WHERE email = ...
  if (query.includes('SELECT id FROM users WHERE email')) {
    const email = values[0];
    const user = mockDb.users.find(u => u.email === email);
    return { rows: user ? [{ id: user.id }] : [] };
  }
  
  // INSERT INTO creators (...)
  if (query.includes('INSERT INTO creators')) {
    const userId = values[0];
    const slug = values[1];
    const displayName = values[2];
    const creatorId = generateId();
    const now = values[4];
    
    mockDb.creators.push({
      id: creatorId,
      user_id: userId,
      slug,
      display_name: displayName,
      plan_status: values[3], // 'beta'
      status: 'active',
      created_at: now
    });
    
    return {
      rows: [{
        id: creatorId,
        slug
      }]
    };
  }
  
  // SELECT id FROM creators WHERE slug = ...
  if (query.includes('SELECT id FROM creators WHERE slug')) {
    const slug = values[0];
    const creator = mockDb.creators.find(c => c.slug === slug);
    return { rows: creator ? [{ id: creator.id }] : [] };
  }
  
  // INSERT INTO rooms (...)
  if (query.includes('INSERT INTO rooms')) {
    const roomId = generateId();
    mockDb.rooms.push({
      id: roomId,
      creator_id: values[0],
      room_slug: values[1],
      room_name: values[2],
      room_type: values[3],
      enabled: values[4],
      join_mode: values[5],
      created_at: values[6]
    });
    
    return {
      rows: [{
        id: roomId
      }]
    };
  }
  
  return { rows: [] };
};

export function resetMockDb() {
  mockDb.users = [];
  mockDb.creators = [];
  mockDb.rooms = [];
  mockDb.idCounter = 1;
}

export function getMockDb() {
  return mockDb;
}
