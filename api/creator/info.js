// Simple endpoint to get creator info for dashboard
import { verifyToken } from '../middleware.js';

// Try to load real database, fall back to mock
let sqlApi = null;

async function getSqlApi() {
  if (sqlApi) return sqlApi;
  
  // If POSTGRES_URL is not set, use mock database immediately
  if (!process.env.POSTGRES_URL) {
    console.log('⚠️  POSTGRES_URL not set, using in-memory mock database');
    const mockDb = await import('../db-mock.js');
    sqlApi = mockDb.sql;
    return sqlApi;
  }
  
  try {
    const pgModule = await import('@vercel/postgres');
    sqlApi = pgModule.sql;
  } catch (e) {
    console.warn('⚠️  PostgreSQL not available, using in-memory mock database:', e.message);
    const mockDb = await import('../db-mock.js');
    sqlApi = mockDb.sql;
  }
  
  return sqlApi;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const sql = await getSqlApi();

    // Get user info
    const userResult = await sql`
      SELECT id, email, display_name, username
      FROM users
      WHERE id = ${decoded.id}
    `;

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get creator info
    const creatorResult = await sql`
      SELECT id, slug, display_name, plan_status, status
      FROM creators
      WHERE user_id = ${decoded.id}
    `;

    if (creatorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    const creator = creatorResult.rows[0];

    return res.status(200).json({
      email: user.email,
      displayName: creator.display_name || user.display_name,
      slug: creator.slug,
      planStatus: creator.plan_status,
      status: creator.status
    });

  } catch (error) {
    console.error('Error fetching creator info:', error);
    return res.status(500).json({ error: 'Failed to fetch creator info' });
  }
}
