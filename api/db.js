// Database connection wrapper
// Uses Vercel Postgres with pooled connections, falls back to mock

let sqlApi = null;
let usingMock = false;

async function initDb() {
  if (sqlApi) return { sql: sqlApi, usingMock };
  
  // Check if we have Postgres URL configured
  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    console.log('⚠️  No POSTGRES_URL or POSTGRES_PRISMA_URL configured');
    console.log('⚠️  Using in-memory mock database - data will NOT persist!');
    const mockDb = await import('./db-mock.js');
    sqlApi = mockDb.sql;
    usingMock = true;
    return { sql: sqlApi, usingMock };
  }
  
  try {
    const { sql: pgSql } = await import('@vercel/postgres');
    sqlApi = pgSql;
    usingMock = false;
    console.log('✓ Connected to Vercel Postgres');
    return { sql: sqlApi, usingMock };
  } catch (e) {
    console.warn('⚠️  Failed to load @vercel/postgres:', e.message);
    console.warn('⚠️  Using in-memory mock database - data will NOT persist!');
    const mockDb = await import('./db-mock.js');
    sqlApi = mockDb.sql;
    usingMock = true;
    return { sql: sqlApi, usingMock };
  }
}

// Initialize immediately
const dbPromise = initDb();

// Export sql function that waits for initialization
export const sql = async (strings, ...values) => {
  const { sql: sqlFunc } = await dbPromise;
  return sqlFunc(strings, ...values);
};

// Export function to create sessions
export async function createSession(userId, token, expiresAt) {
  const { sql: sqlFunc, usingMock } = await dbPromise;
  
  if (usingMock) {
    console.log('Mock: Session creation skipped');
    return;
  }
  
  try {
    await sqlFunc`
      INSERT INTO sessions (user_id, token, expires_at, created_at)
      VALUES (${userId}, ${token}, ${expiresAt}, NOW())
    `;
  } catch (error) {
    console.error('Session creation failed:', error.message);
    throw error;
  }
}

export default { sql, createSession };
