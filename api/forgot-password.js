// POST /api/forgot-password
// Request password reset (simplified version - just returns success)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // NOTE: In a real implementation, you would:
    // 1. Check if user exists
    // 2. Generate a reset token
    // 3. Send email with reset link
    // 4. Store token in database with expiration
    
    // For now, we just return success (security best practice: don't reveal if email exists)
    console.log(`Password reset requested for: ${email}`);
    
    return res.status(200).json({ 
      ok: true, 
      message: 'If an account exists with this email, you will receive reset instructions.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
