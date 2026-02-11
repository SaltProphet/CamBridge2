// Mock database for local development when no Postgres is available
// This is an in-memory store - data is lost on restart!

let mockData = {
  users: [],
  creators: [],
  rooms: [],
  sessions: [],
  rateLimits: new Map()
};

let idCounter = 1;

function generateId() {
  return `mock-${idCounter++}`;
}

// Mock SQL template tag function
export const sql = async (strings, ...values) => {
  const query = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] !== undefined ? `$${i + 1}` : '');
  }, '');
  
  console.log('Mock SQL:', query);
  console.log('Values:', values);
  
  // Parse simple INSERT queries
  if (query.includes('INSERT INTO users')) {
    const user = {
      id: generateId(),
      username: values[0],
      email: values[0],
      password_hash: values[1],
      display_name: values[2],
      is_active: values[3],
      role: values[4],
      age_attested_at: values[5],
      tos_accepted_at: values[6],
      created_at: values[7],
      updated_at: values[8]
    };
    mockData.users.push(user);
    return { rows: [user] };
  }
  
  if (query.includes('INSERT INTO creators')) {
    const creator = {
      id: generateId(),
      user_id: values[0],
      slug: values[1],
      display_name: values[2],
      plan_status: values[3],
      status: values[4],
      created_at: values[5]
    };
    mockData.creators.push(creator);
    return { rows: [creator] };
  }
  
  if (query.includes('INSERT INTO rooms')) {
    const room = {
      id: generateId(),
      creator_id: values[0],
      room_slug: values[1],
      room_name: values[2],
      room_type: values[3],
      enabled: values[4],
      join_mode: values[5],
      created_at: values[6],
      updated_at: values[7]
    };
    mockData.rooms.push(room);
    return { rows: [room] };
  }
  
  // Parse simple SELECT queries
  if (query.includes('SELECT') && query.includes('FROM users WHERE email')) {
    const email = values[0];
    const user = mockData.users.find(u => u.email === email);
    return { rows: user ? [user] : [] };
  }
  
  if (query.includes('SELECT') && query.includes('FROM users WHERE id')) {
    const id = values[0];
    const user = mockData.users.find(u => u.id === id);
    return { rows: user ? [user] : [] };
  }
  
  if (query.includes('SELECT') && query.includes('FROM creators WHERE user_id')) {
    const userId = values[0];
    const creator = mockData.creators.find(c => c.user_id === userId);
    return { rows: creator ? [creator] : [] };
  }
  
  if (query.includes('SELECT') && query.includes('FROM creators WHERE slug')) {
    const slug = values[0];
    const creator = mockData.creators.find(c => c.slug === slug);
    return { rows: creator ? [creator] : [] };
  }
  
  // CREATE TABLE queries
  if (query.includes('CREATE TABLE')) {
    console.log('Mock: Skipping CREATE TABLE');
    return { rows: [] };
  }
  
  // Default: return empty result
  console.warn('Mock SQL: Unhandled query pattern');
  return { rows: [] };
};

export default { sql };
