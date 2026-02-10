// API endpoint to initialize database tables
// This should be called once during setup
import { initializeTables } from '../db.js';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const INIT_SECRET = process.env.DB_INIT_SECRET;

  // GET method - Return status without requiring secret
  if (req.method === 'GET') {
    try {
      // Check if database is already initialized
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'rooms', 'sessions')
      `;

      const existingTables = tablesResult.rows.map(row => row.table_name);
      const initialized = existingTables.length === 3;

      return res.status(200).json({
        initialized,
        tables: {
          users: existingTables.includes('users'),
          rooms: existingTables.includes('rooms'),
          sessions: existingTables.includes('sessions')
        },
        configured: !!INIT_SECRET
      });
    } catch (error) {
      console.error('Status check error:', error);
      return res.status(500).json({
        initialized: false,
        error: 'Failed to check database status',
        details: error.message
      });
    }
  }

  // POST method - Initialize database
  if (req.method === 'POST') {
    // Accept secret from body or query parameter
    const secret = req.body?.secret || req.query?.secret;
    
    if (!INIT_SECRET) {
      return res.status(500).json({ 
        error: 'DB_INIT_SECRET environment variable is not configured' 
      });
    }
    
    if (secret !== INIT_SECRET) {
      return res.status(403).json({ error: 'Invalid secret key' });
    }

    try {
      const result = await initializeTables();
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Database tables initialized successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to initialize database'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
}
