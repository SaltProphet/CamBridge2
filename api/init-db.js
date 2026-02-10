// API endpoint to initialize database tables
// This should be called once during setup
import { initializeTables } from '../db.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple security check - require secret key
  const { secret } = req.body;
  const INIT_SECRET = process.env.DB_INIT_SECRET || 'change-me-in-production';
  
  if (secret !== INIT_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
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
