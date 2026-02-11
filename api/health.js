// Health check endpoint for database status
// This endpoint is public and doesn't require authentication
import { sql } from './db.js';

export default async function handler(req, res) {
  // Allow GET requests only
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const status = {
    database: 'unknown',
    tables: {
      users: false,
      rooms: false,
      sessions: false
    },
    configured: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Check database connection
    await sql`SELECT 1`;
    status.database = 'connected';

    // Check if tables exist
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'rooms', 'sessions')
    `;

    const existingTables = tablesResult.rows.map(row => row.table_name);
    status.tables.users = existingTables.includes('users');
    status.tables.rooms = existingTables.includes('rooms');
    status.tables.sessions = existingTables.includes('sessions');

    // Check if DB_INIT_SECRET is configured
    status.configured = !!process.env.DB_INIT_SECRET;

    // Determine overall status
    const allTablesExist = status.tables.users && status.tables.rooms && status.tables.sessions;
    status.ready = status.database === 'connected' && allTablesExist;

    return res.status(200).json(status);
  } catch (error) {
    console.error('Health check error:', error);
    status.database = 'error';
    status.error = error.message;
    return res.status(503).json(status);
  }
}
