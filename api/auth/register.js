// API endpoint deprecated: password registration removed for MVP passwordless auth

export default async function handler(req, res) {
  // Hard-disable legacy password registration route
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(410).json({
    error: 'Password registration has been removed.',
    message: 'Use passwordless authentication via POST /api/auth/start and GET /api/auth/callback.'
  });
}
