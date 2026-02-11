import { getCreatorByUserId, updateCreatorSubscription, recordProcessedWebhookEvent } from '../db.js';
import { authenticate } from '../middleware.js';

function errorPayload(error, code, extras = {}) {
  return { error, code, ...extras };
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }

  const cleaned = email.trim().toLowerCase();
  // Basic email validation
  if (!cleaned || !cleaned.includes('@')) {
    return null;
  }

  return cleaned;
}

export async function processManualInvoice(req, deps = {}) {
  const {
    authenticateFn = authenticate,
    getCreatorByUserIdFn = getCreatorByUserId,
    updateCreatorSubscriptionFn = updateCreatorSubscription,
    recordWebhookEventFn = recordProcessedWebhookEvent
  } = deps;

  const auth = await authenticateFn(req);
  if (!auth.authenticated) {
    return { status: 401, body: errorPayload(auth.error || 'Unauthorized', 'UNAUTHORIZED') };
  }

  const creator = await getCreatorByUserIdFn(auth.user.id);
  if (!creator) {
    return { status: 403, body: errorPayload('Only creators can request invoices', 'CREATOR_REQUIRED') };
  }

  if (req.method === 'GET') {
    // GET: Retrieve current invoice/subscription status
    return {
      status: 200,
      body: {
        success: true,
        creatorId: creator.id,
        subscription_status: creator.subscription_status || 'INACTIVE',
        subscription_provider: creator.subscription_provider || 'manual',
        subscription_started_at: creator.subscription_started_at,
        subscription_expires_at: creator.subscription_expires_at,
        subscription_next_billing_at: creator.subscription_next_billing_at,
        message: 'Current manual subscription status'
      }
    };
  } else if (req.method === 'POST') {
    // POST: Request invoice to be sent
    const invoiceEmail = normalizeEmail(req.body?.invoiceEmail || auth.user.email);
    const selectedPlan = req.body?.plan;

    if (!invoiceEmail) {
      return { status: 400, body: errorPayload('Valid invoice email is required', 'INVALID_EMAIL') };
    }

    if (!selectedPlan) {
      return { status: 400, body: errorPayload('Plan is required', 'INVALID_PLAN') };
    }

    try {
      // Generate unique invoice ID for idempotency
      const invoiceId = `inv_${creator.id}_${Date.now()}`;
      const invoiceData = {
        creatorId: creator.id,
        plan: selectedPlan,
        invoiceEmail,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      };

      // Record webhook event for idempotency (prevents duplicate invoice generation)
      const eventRecorded = await recordWebhookEventFn(
        'manual_invoice_requested',
        invoiceId,
        { ...invoiceData }
      );

      if (!eventRecorded) {
        return { status: 409, body: errorPayload('Invoice already requested. Check your email.', 'DUPLICATE_REQUEST') };
      }

      // Update creator subscription to PENDING manual
      await updateCreatorSubscriptionFn(creator.id, {
        subscription_provider: 'manual',
        subscription_status: 'PENDING',
        subscription_started_at: new Date(),
      });

      // TODO: In production, this would call an email service to send invoice
      // For now, log that invoice was requested
      console.log('Manual invoice requested:', {
        creator_id: creator.id,
        invoiceEmail,
        plan: selectedPlan,
        invoiceId
      });

      return {
        status: 200,
        body: {
          success: true,
          creatorId: creator.id,
          invoiceId,
          invoiceEmail,
          plan: selectedPlan,
          message: 'Invoice request created. Check your email for details.',
          subscription_status: 'PENDING'
        }
      };
    } catch (err) {
      console.error('Manual invoice error:', err);
      return {
        status: 500,
        body: errorPayload('Failed to create invoice request', 'INVOICE_CREATION_FAILED')
      };
    }
  } else {
    return { status: 405, body: errorPayload('Method not allowed', 'METHOD_NOT_ALLOWED') };
  }
}

export default async function handler(req, res) {
  try {
    const result = await processManualInvoice(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Manual invoice handler error:', error);
    return res.status(500).json(errorPayload('An error occurred while processing invoice request', 'INTERNAL_ERROR'));
  }
}
