/**
 * Stripe Webhook Handler
 * Processes incoming Stripe webhook events for payment and subscription updates
 * 
 * Routes:
 * - POST /api/webhooks/stripe - Main webhook endpoint
 * 
 * Environment Variables:
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret from Stripe Dashboard
 * - DATABASE_URL: PostgreSQL connection string
 */

import { constructWebhookEvent, processStripeEvent } from '../providers/stripe.js';
import { sql } from '@vercel/postgres';

/**
 * Main webhook handler
 * @param {Object} req - Request object with body and headers
 * @param {Object} deps - Dependencies (sql function, etc.)
 * @returns {Object} { status, body }
 */
export async function handleStripeWebhook(req, deps = {}) {
  const sqlFn = deps.sql || sql;
  const body = req.body;
  const signature = req.headers?.['stripe-signature'];

  // Validate HTTP method
  if (req.method !== 'POST') {
    return { 
      status: 405, 
      body: { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } 
    };
  }

  // Validate signature
  if (!signature) {
    console.error('[Stripe] Missing Stripe-Signature header');
    return { 
      status: 400, 
      body: { error: 'Missing signature', code: 'MISSING_SIGNATURE' } 
    };
  }

  try {
    // Verify and parse webhook
    const event = constructWebhookEvent(body, signature);
    console.log(`[Stripe] Webhook received: ${event.type} (id: ${event.id})`);

    // Process event based on type
    const result = await processStripeEvent(event);

    switch (result.type) {
      case 'payment_success':
        return await handlePaymentSuccess(result, sqlFn);

      case 'invoice_paid':
        return await handleInvoicePaid(result, sqlFn);

      case 'payment_failed':
        return await handlePaymentFailed(result, sqlFn);

      case 'subscription_deleted':
        return await handleSubscriptionDeleted(result, sqlFn);

      case 'unhandled_event':
        console.log(`[Stripe] Unhandled event type: ${result.eventType}`);
        return { 
          status: 200, 
          body: { received: true, message: 'Event received but not processed' } 
        };

      default:
        return { 
          status: 200, 
          body: { received: true, processed: false } 
        };
    }
  } catch (error) {
    console.error(`[Stripe] Webhook error: ${error.message}`);

    // Log suspicious activity
    if (error.message.includes('Signature verification failed')) {
      console.error('[Stripe] SECURITY: Invalid webhook signature detected');
    }

    // Always return 200 to prevent Stripe retries on validation errors
    return { 
      status: 200, 
      body: { 
        error: error.message, 
        code: 'WEBHOOK_ERROR',
        timestamp: new Date().toISOString()
      } 
    };
  }
}

/**
 * Handle successful payment
 * Updates subscription status to ACTIVE and sends confirmation email
 */
async function handlePaymentSuccess(result, sqlFn) {
  const { 
    sessionId, 
    creatorId, 
    paymentStatus, 
    amountTotal, 
    email, 
    metadata 
  } = result;

  try {
    // Verify payment was actually paid
    if (paymentStatus !== 'paid') {
      console.warn(`[Stripe] Session ${sessionId} payment status: ${paymentStatus}`);
      // Only process if fully paid, otherwise wait for invoice.paid event
      if (paymentStatus !== 'no_payment_required') {
        return { 
          status: 200, 
          body: { received: true, message: 'Payment not yet completed' } 
        };
      }
    }

    // Get creator subscription info
    const creatorQuery = await sqlFn`
      SELECT id, email, display_name, subscription_plan 
      FROM creators 
      WHERE id = ${creatorId}
    `;

    if (creatorQuery.rows.length === 0) {
      console.error(`[Stripe] Creator not found: ${creatorId}`);
      return { 
        status: 200, 
        body: { error: 'Creator not found', code: 'CREATOR_NOT_FOUND' } 
      };
    }

    const creator = creatorQuery.rows[0];

    // Update subscription status
    const updateQuery = await sqlFn`
      UPDATE creators 
      SET 
        subscription_status = 'ACTIVE',
        subscription_provider = 'stripe',
        subscription_external_id = ${sessionId},
        subscription_next_billing_at = now() + interval '1 month',
        updated_at = now()
      WHERE id = ${creatorId}
      RETURNING *
    `;

    const updatedCreator = updateQuery.rows[0];
    console.log(`[Stripe] Subscription activated for creator: ${creatorId}`);

    // Log webhook event for audit trail
    await sqlFn`
      INSERT INTO webhook_events (
        provider, event_type, external_event_id, external_object_id, 
        creator_id, metadata, status, created_at
      )
      VALUES (
        'stripe', 'checkout.session.completed', ${sessionId}, ${sessionId},
        ${creatorId}, ${JSON.stringify(metadata || {})}, 'processed', now()
      )
    `;

    // TODO: In Phase 3.2 full implementation, send confirmation email
    // await sendSubscriptionConfirmationEmail({
    //   creatorEmail: email,
    //   creatorName: creator.display_name,
    //   plan: creator.subscription_plan,
    //   nextBillingDate: updatedCreator.subscription_next_billing_at
    // });

    return {
      status: 200,
      body: {
        received: true,
        processed: true,
        creatorId,
        subscription_status: 'ACTIVE',
        next_billing_at: updatedCreator.subscription_next_billing_at,
        message: 'Subscription activated successfully'
      }
    };
  } catch (error) {
    console.error(`[Stripe] Error handling payment success: ${error.message}`);
    throw error;
  }
}

/**
 * Handle invoice paid event
 * Updates subscription for recurring billing
 */
async function handleInvoicePaid(result, sqlFn) {
  const { invoiceId, subscriptionId, amountPaid, metadata } = result;

  try {
    // Find creator by subscription ID
    const creatorQuery = await sqlFn`
      SELECT id, email, display_name, subscription_plan 
      FROM creators 
      WHERE subscription_external_id = ${subscriptionId}
    `;

    if (creatorQuery.rows.length === 0) {
      console.warn(`[Stripe] Creator not found for subscription: ${subscriptionId}`);
      return { 
        status: 200, 
        body: { error: 'Creator not found', code: 'CREATOR_NOT_FOUND' } 
      };
    }

    const creator = creatorQuery.rows[0];

    // Update next billing date
    const updateQuery = await sqlFn`
      UPDATE creators 
      SET 
        subscription_next_billing_at = now() + interval '1 month',
        updated_at = now()
      WHERE id = ${creator.id}
      RETURNING subscription_next_billing_at
    `;

    console.log(`[Stripe] Invoice ${invoiceId} processed for creator: ${creator.id}`);

    // Log event
    await sqlFn`
      INSERT INTO webhook_events (
        provider, event_type, external_event_id, external_object_id,
        creator_id, metadata, status, created_at
      )
      VALUES (
        'stripe', 'invoice.paid', ${invoiceId}, ${subscriptionId},
        ${creator.id}, ${JSON.stringify({ amount_paid: amountPaid, ...metadata })}, 
        'processed', now()
      )
    `;

    return {
      status: 200,
      body: {
        received: true,
        processed: true,
        invoiceId,
        subscription_id: subscriptionId,
        next_billing_at: updateQuery.rows[0].subscription_next_billing_at,
        message: 'Invoice payment recorded'
      }
    };
  } catch (error) {
    console.error(`[Stripe] Error handling invoice paid: ${error.message}`);
    throw error;
  }
}

/**
 * Handle payment failure
 * Logs failure and optionally sends reminder
 */
async function handlePaymentFailed(result, sqlFn) {
  const { invoiceId, subscriptionId, amountDue, attemptCount, metadata } = result;

  try {
    // Find creator
    const creatorQuery = await sqlFn`
      SELECT id, email, display_name 
      FROM creators 
      WHERE subscription_external_id = ${subscriptionId}
    `;

    if (creatorQuery.rows.length === 0) {
      console.warn(`[Stripe] Creator not found for failed payment: ${subscriptionId}`);
      return { 
        status: 200, 
        body: { error: 'Creator not found', code: 'CREATOR_NOT_FOUND' } 
      };
    }

    const creator = creatorQuery.rows[0];

    console.warn(`[Stripe] Payment failed - Invoice: ${invoiceId}, Attempt: ${attemptCount}`);

    // Log event
    await sqlFn`
      INSERT INTO webhook_events (
        provider, event_type, external_event_id, external_object_id,
        creator_id, metadata, status, created_at
      )
      VALUES (
        'stripe', 'invoice.payment_failed', ${invoiceId}, ${subscriptionId},
        ${creator.id}, 
        ${JSON.stringify({ 
          amount_due: amountDue, 
          attempt_count: attemptCount,
          ...metadata 
        })},
        'processed', now()
      )
    `;

    // TODO: In Phase 3.2 full implementation, send payment failure email
    // After 3 attempts, send to admin for manual intervention
    // if (attemptCount >= 3) {
    //   await sendPaymentFailureAlert({
    //     creatorEmail: creator.email,
    //     amountDue,
    //     subscriptionId
    //   });
    // }

    return {
      status: 200,
      body: {
        received: true,
        processed: true,
        invoiceId,
        subscription_id: subscriptionId,
        attempt_count: attemptCount,
        message: 'Payment failure logged'
      }
    };
  } catch (error) {
    console.error(`[Stripe] Error handling payment failure: ${error.message}`);
    throw error;
  }
}

/**
 * Handle subscription deletion
 * Cancels creator subscription
 */
async function handleSubscriptionDeleted(result, sqlFn) {
  const { subscriptionId, customerId, metadata } = result;

  try {
    // Find and update creator
    const updateQuery = await sqlFn`
      UPDATE creators 
      SET 
        subscription_status = 'INACTIVE',
        subscription_canceled_at = now(),
        updated_at = now()
      WHERE subscription_external_id = ${subscriptionId}
      RETURNING id, email, display_name
    `;

    if (updateQuery.rows.length === 0) {
      console.warn(`[Stripe] Creator not found for subscription cancellation: ${subscriptionId}`);
      return { 
        status: 200, 
        body: { error: 'Creator not found', code: 'CREATOR_NOT_FOUND' } 
      };
    }

    const creator = updateQuery.rows[0];
    console.log(`[Stripe] Subscription canceled for creator: ${creator.id}`);

    // Log event
    await sqlFn`
      INSERT INTO webhook_events (
        provider, event_type, external_event_id, external_object_id,
        creator_id, metadata, status, created_at
      )
      VALUES (
        'stripe', 'customer.subscription.deleted', ${subscriptionId}, ${subscriptionId},
        ${creator.id}, ${JSON.stringify(metadata || {})}, 'processed', now()
      )
    `;

    return {
      status: 200,
      body: {
        received: true,
        processed: true,
        subscription_id: subscriptionId,
        creator_id: creator.id,
        message: 'Subscription canceled'
      }
    };
  } catch (error) {
    console.error(`[Stripe] Error handling subscription deletion: ${error.message}`);
    throw error;
  }
}

export default {
  handleStripeWebhook,
  handlePaymentSuccess,
  handleInvoicePaid,
  handlePaymentFailed,
  handleSubscriptionDeleted
};
