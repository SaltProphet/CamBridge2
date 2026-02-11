import { getCreatorByUserId, updateCreatorSubscription, query } from '../db.js';
import { authenticate, requireAdmin } from '../middleware.js';
import { sendSubscriptionConfirmationEmail, sendPaymentReminderEmail } from '../services/email.js';

function errorPayload(error, code, extras = {}) {
  return { error, code, ...extras };
}

/**
 * Admin endpoint for managing manual billing
 * View pending payments, approve subscriptions, send reminders
 */
export async function processManualBillingAdmin(req, deps = {}) {
  const {
    authenticateFn = authenticate,
    requireAdminFn = requireAdmin,
    getCreatorByUserIdFn = getCreatorByUserId,
    updateCreatorSubscriptionFn = updateCreatorSubscription,
    queryfn = query
  } = deps;

  const auth = await authenticateFn(req);
  if (!auth.authenticated) {
    return { status: 401, body: errorPayload(auth.error || 'Unauthorized', 'UNAUTHORIZED') };
  }

  // Check admin permissions
  const isAdmin = await requireAdminFn(auth.user.id);
  if (!isAdmin) {
    return { status: 403, body: errorPayload('Admin access required', 'ADMIN_REQUIRED') };
  }

  if (req.method === 'GET') {
    // GET: List all pending manual payments
    try {
      const result = await queryfn(
        `SELECT c.id, c.user_id, u.email, c.display_name, 
                c.subscription_status, c.subscription_started_at, c.subscription_provider,
                (SELECT COUNT(*) FROM creator_payment_notes WHERE creator_id = c.id) as note_count
         FROM creators c
         JOIN users u ON c.user_id = u.id
         WHERE c.subscription_provider = 'manual' AND c.subscription_status = 'PENDING'
         ORDER BY c.subscription_started_at DESC
         LIMIT 100`,
        []
      );

      return {
        status: 200,
        body: {
          success: true,
          pending: result.rows || [],
          total: (result.rows || []).length
        }
      };
    } catch (err) {
      console.error('Fetch pending payments error:', err);
      return {
        status: 500,
        body: errorPayload('Failed to fetch pending payments', 'FETCH_FAILED')
      };
    }
  } else if (req.method === 'POST') {
    // POST: Approve payment and activate subscription
    const { creatorId, action } = req.body;

    if (!creatorId) {
      return { status: 400, body: errorPayload('Creator ID is required', 'MISSING_CREATOR_ID') };
    }

    if (!action || !['approve', 'reject', 'remind'].includes(action)) {
      return { status: 400, body: errorPayload('Action must be approve, reject, or remind', 'INVALID_ACTION') };
    }

    try {
      // Get creator details
      const creatorResult = await queryfn(
        'SELECT * FROM creators WHERE id = $1',
        [creatorId]
      );

      const creator = creatorResult.rows?.[0];
      if (!creator) {
        return { status: 404, body: errorPayload('Creator not found', 'CREATOR_NOT_FOUND') };
      }

      const userResult = await queryfn(
        'SELECT * FROM users WHERE id = $1',
        [creator.user_id]
      );

      const user = userResult.rows?.[0];
      if (!user) {
        return { status: 404, body: errorPayload('User not found', 'USER_NOT_FOUND') };
      }

      if (action === 'approve') {
        // Approve subscription and activate
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        await updateCreatorSubscriptionFn(creator.id, {
          subscription_status: 'ACTIVE',
          subscription_next_billing_at: nextBillingDate,
          subscription_external_id: `manual_${creator.id}_${Date.now()}`
        });

        // Send confirmation email
        await sendSubscriptionConfirmationEmail({
          to: user.email,
          creatorId: creator.id,
          plan: creator.subscription_plan || 'pro',
          billingDate: nextBillingDate.toLocaleDateString()
        });

        return {
          status: 200,
          body: {
            success: true,
            message: 'Subscription approved and activated',
            creator: {
              id: creator.id,
              email: user.email,
              display_name: creator.display_name,
              status: 'ACTIVE'
            },
            emailSent: true
          }
        };
      } else if (action === 'reject') {
        // Reject payment
        await updateCreatorSubscriptionFn(creator.id, {
          subscription_status: 'INACTIVE',
          subscription_provider: 'manual',
          subscription_canceled_at: new Date()
        });

        return {
          status: 200,
          body: {
            success: true,
            message: 'Manual payment rejected and subscription cancelled',
            creator: {
              id: creator.id,
              email: user.email,
              status: 'INACTIVE'
            }
          }
        };
      } else if (action === 'remind') {
        // Send payment reminder
        const invoiceId = `inv_${creator.id}_${Date.now()}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        await sendPaymentReminderEmail({
          to: user.email,
          creatorId: creator.id,
          invoiceId: invoiceId,
          plan: creator.subscription_plan || 'pro',
          dueDate: dueDate.toLocaleDateString()
        });

        return {
          status: 200,
          body: {
            success: true,
            message: 'Payment reminder sent',
            creator: {
              id: creator.id,
              email: user.email,
              display_name: creator.display_name
            },
            emailSent: true
          }
        };
      }
    } catch (err) {
      console.error('Manual billing action error:', err);
      return {
        status: 500,
        body: errorPayload(`Failed to ${action} payment`, 'ACTION_FAILED')
      };
    }
  } else {
    return { status: 405, body: errorPayload('Method not allowed', 'METHOD_NOT_ALLOWED') };
  }
}

export default async function handler(req, res) {
  try {
    const result = await processManualBillingAdmin(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Manual billing admin handler error:', error);
    return res.status(500).json(errorPayload('An error occurred processing manual billing', 'INTERNAL_ERROR'));
  }
}
