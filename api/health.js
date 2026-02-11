// Minimal health check endpoint
// No database dependencies required
export default async function handler(req, res) {
  // Allow GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return health status
  return res.status(200).json({
    status: 'ok',
    service: 'CamBridge',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
