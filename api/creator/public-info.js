// Public API endpoint to get creator payment information
// No authentication required - only returns public-facing data

// Try to load real database, fall back to mock
let sqlApi = null;

async function getSqlApi() {
  if (sqlApi) return sqlApi;
  
  try {
    const pgModule = await import('@vercel/postgres');
    sqlApi = pgModule.sql;
  } catch (e) {
    console.warn('⚠️  PostgreSQL not available, using in-memory mock database');
    const mockDb = await import('../db-mock.js');
    sqlApi = mockDb.sql;
  }
  
  return sqlApi;
}

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = await getSqlApi();
    const { slug } = req.query;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Creator slug is required' });
    }

    // Fetch public creator information by slug
    const result = await sql`
      SELECT 
        id,
        slug,
        display_name,
        cashapp_handle,
        paypal_link,
        status
      FROM creators
      WHERE slug = ${slug.toLowerCase()} AND status = 'active'
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const creator = result.rows[0];

    // Return only public data
    return res.status(200).json({
      slug: creator.slug,
      displayName: creator.display_name,
      cashappHandle: creator.cashapp_handle,
      paypalLink: creator.paypal_link
    });

  } catch (error) {
    console.error('Get public creator info error:', error);
    return res.status(500).json({ error: 'An error occurred while fetching creator info' });
  }
}
