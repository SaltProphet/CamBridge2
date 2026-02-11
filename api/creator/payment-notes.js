import { getCreatorByUserId, query } from '../db.js';
import { authenticate } from '../middleware.js';

function errorPayload(error, code, extras = {}) {
  return { error, code, ...extras };
}

function paymentsPaused() {
  return process.env.PRELAUNCH_BETA === 'true' || process.env.PAYMENTS_PAUSED === 'true';
}

/**
 * Payment notes endpoint for manual billing communications
 * Allows creators to add notes about their payment status/method
 */
export async function processPaymentNotes(req, deps = {}) {
  const {
    authenticateFn = authenticate,
    getCreatorByUserIdFn = getCreatorByUserId,
    queryfn = query
  } = deps;

  const auth = await authenticateFn(req);
  if (!auth.authenticated) {
    return { status: 401, body: errorPayload(auth.error || 'Unauthorized', 'UNAUTHORIZED') };
  }

  const creator = await getCreatorByUserIdFn(auth.user.id);
  if (!creator) {
    return { status: 403, body: errorPayload('Only creators can add payment notes', 'CREATOR_REQUIRED') };
  }

  if (req.method === 'GET') {
    // GET: Retrieve payment notes/history
    try {
      const result = await queryfn(
        'SELECT * FROM creator_payment_notes WHERE creator_id = $1 ORDER BY created_at DESC LIMIT 50',
        [creator.id]
      );

      return {
        status: 200,
        body: {
          success: true,
          creatorId: creator.id,
          notes: result.rows || []
        }
      };
    } catch (err) {
      console.error('Payment notes fetch error:', err);
      return {
        status: 500,
        body: errorPayload('Failed to fetch payment notes', 'FETCH_FAILED')
      };
    }
  } else if (req.method === 'POST') {
    if (paymentsPaused()) {
      return {
        status: 503,
        body: errorPayload('Payment communications are paused during the pre-release beta.', 'PAYMENTS_PAUSED')
      };
    }

    // POST: Add a payment note
    const { note, paymentMethod, paymentDetails } = req.body;

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return { status: 400, body: errorPayload('Note is required', 'INVALID_NOTE') };
    }

    try {
      const result = await queryfn(
        `INSERT INTO creator_payment_notes 
         (creator_id, note, payment_method, payment_details, created_at) 
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [creator.id, note.trim(), paymentMethod || null, paymentDetails || null]
      );

      return {
        status: 201,
        body: {
          success: true,
          creatorId: creator.id,
          note: result.rows?.[0] || { created_at: new Date() },
          message: 'Payment note recorded. Our team will review shortly.'
        }
      };
    } catch (err) {
      console.error('Payment note creation error:', err);
      return {
        status: 500,
        body: errorPayload('Failed to save payment note', 'CREATION_FAILED')
      };
    }
  } else {
    return { status: 405, body: errorPayload('Method not allowed', 'METHOD_NOT_ALLOWED') };
  }
}

export default async function handler(req, res) {
  try {
    const result = await processPaymentNotes(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Payment notes handler error:', error);
    return res.status(500).json(errorPayload('An error occurred while processing payment note', 'INTERNAL_ERROR'));
  }
}
