// API endpoint deprecated: password login removed for MVP passwordless auth

export default function handler(req, res) {
  // Legacy password login is permanently disabled
  return res.status(410).json({
    error: 'Password login endpoint has been removed'
  });
}
