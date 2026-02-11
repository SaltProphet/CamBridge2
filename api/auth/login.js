// API endpoint deprecated: password login removed for MVP passwordless auth

export default async function handler(req, res) {
  // Hard-disable legacy password login route
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(410).json({
    error: 'Password login has been removed.',
    message: 'Use passwordless authentication via POST /api/auth/start and GET /api/auth/callback.'
  });
}
