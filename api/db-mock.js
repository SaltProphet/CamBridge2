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
  idCounter: 100
};

function generateId() {
  return mockDb.idCounter++;
}

// Mock SQL function that mimics @vercel/postgres interface
export const sql = async (strings, ...values) => {
  try {
    const query = strings[0];
    console.log('🗄️  Mock DB:', query.substring(0, 40).trim() + '...');
    
    // CREATE TABLE rate_limits
    if (query.includes('CREATE TABLE IF NOT EXISTS rate_limits')) {
      console.log('  ✓ Rate limits table (no-op)');
      return { rows: [] };
    }
    
    // INSERT INTO rate_limits (ON CONFLICT...)
    if (query.includes('INSERT INTO rate_limits')) {
      const [key, count, expiresAt] = values;
      console.log('  ✓ Rate limit check for', key.substring(0, 30));
      // Always allow for demo
      return {
        rows: [{
          count: 1,
          retry_after_seconds: 3600
        }]
      };
    }
    
    // INSERT INTO users
    if (query.includes('INSERT INTO users')) {
      const [email, username, hash, displayName, isActive, role, ageAt, tosAt, createdAt, updatedAt] = values;
      const id = generateId();
      mockDb.users.push({
        id,
        username,
        email,
        password_hash: hash,
        display_name: displayName,
        is_active: isActive,
        role
      });
      console.log('  ✓ User created:', id, email);
      return {
        rows: [{
          id,
          username: email,
          email,
          display_name: displayName
        }]
      };
    }
    
    // SELECT from users by email
    if (query.includes('SELECT id FROM users WHERE email')) {
      const [email] = values;
      const user = mockDb.users.find(u => u.email === email);
      console.log('  ✓ User lookup:', email, user ? 'found' : 'not found');
      return { rows: user ? [{ id: user.id }] : [] };
    }
    
    // INSERT INTO creators
    if (query.includes('INSERT INTO creators')) {
      const [userId, slug, displayName, planStatus, status, createdAt] = values;
      const id = generateId();
      mockDb.creators.push({
        id,
        user_id: userId,
        slug,
        display_name: displayName,
        plan_status: planStatus,
        status
      });
      console.log('  ✓ Creator created:', id, slug);
      return {
        rows: [{
          id,
          slug
        }]
      };
    }
    
    // SELECT from creators by slug
    if (query.includes('SELECT id FROM creators WHERE slug')) {
      const [slug] = values;
      const creator = mockDb.creators.find(c => c.slug === slug);
      console.log('  ✓ Creator lookup:', slug, creator ? 'found' : 'not found');
      return { rows: creator ? [{ id: creator.id }] : [] };
    }
    
    // INSERT INTO rooms
    if (query.includes('INSERT INTO rooms')) {
      const [creatorId, roomSlug, roomName, roomType, enabled, joinMode, createdAt, updatedAt] = values;
      const id = generateId();
      mockDb.rooms.push({
        id,
        creator_id: creatorId,
        room_slug: roomSlug,
        room_name: roomName,
        room_type: roomType,
        enabled,
        join_mode: joinMode
      });
      console.log('  ✓ Room created:', id, roomSlug);
      return {
        rows: [{
          id
        }]
      };
    }
    
    // SELECT creator and rooms by slug
    if (query.includes('SELECT c.id, c.display_name, c.cashapp_handle, c.paypal_link FROM creators c')) {
      const [slug] = values;
      const creator = mockDb.creators.find(c => c.slug === slug);
      console.log('  ✓ Creator info lookup:', slug, creator ? 'found' : 'not found');
      if (!creator) return { rows: [] };
      return {
        rows: [{
          id: creator.id,
          slug: creator.slug,
          display_name: creator.display_name,
          cashapp_handle: null,
          paypal_link: null
        }]
      };
    }
    
    console.log('  ⚠️  Unknown query, returning empty rows');
    return { rows: [] };
  } catch (error) {
    console.error('  ✗ Mock DB error:', error.message);
    throw error;
  }
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
