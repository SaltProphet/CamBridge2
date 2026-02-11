import { sql } from '@vercel/postgres';
import { withCORS } from './middleware.js';

/**
 * Handle access request form submission
 * POST /api/request-access
 * Body: { email: string, handle: string, note?: string }
 */
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { email, handle, note } = req.body;
        
        // Validate required fields
        if (!email || !handle) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: 'Email and handle are required'
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }
        
        // Check if database is configured
        const isDatabaseConfigured = process.env.POSTGRES_URL || 
                                     process.env.DATABASE_URL;
        
        if (isDatabaseConfigured) {
            try {
                // Create table if it doesn't exist
                await sql`
                    CREATE TABLE IF NOT EXISTS access_requests (
                        id SERIAL PRIMARY KEY,
                        email VARCHAR(255) NOT NULL,
                        handle VARCHAR(255) NOT NULL,
                        note TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        status VARCHAR(50) DEFAULT 'pending'
                    )
                `;
                
                // Insert the access request using parameterized query
                await sql`
                    INSERT INTO access_requests (email, handle, note)
                    VALUES (${email}, ${handle}, ${note || null})
                `;
                
                console.log('[Access Request] Stored in database:', { email, handle });
            } catch (dbError) {
                console.error('[Access Request] Database error:', dbError);
                // Continue to return success even if DB fails
                console.log('[Access Request] Fallback - logging payload:', { email, handle, note });
            }
        } else {
            // Database not configured - log in development
            console.log('[Access Request] Database not configured - logging payload:', {
                email,
                handle,
                note: note || '(none)',
                timestamp: new Date().toISOString()
            });
        }
        
        // Always return success
        return res.status(200).json({ 
            success: true,
            message: 'Request submitted successfully'
        });
        
    } catch (error) {
        console.error('[Access Request] Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to process request. Please try again later.'
        });
    }
}

export default withCORS(handler);
