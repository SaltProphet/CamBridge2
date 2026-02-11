/**
 * Stripe Payment Provider
 * Handles all Stripe payment operations including checkout sessions and webhook processing
 * 
 * Environment Variables:
 * - STRIPE_SECRET_KEY: Stripe secret API key (sk_test_* or sk_live_*)
 * - STRIPE_PUBLIC_KEY: Stripe public API key (pk_test_* or pk_live_*)
 * - STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret from Dashboard → Webhooks
 * - STRIPE_MODE: 'test' or 'prod' (controls which keys to use)
 */

import crypto from 'crypto';

// Stripe test mode configuration
const STRIPE_TEST_MODE = {
  secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
  publicKey: process.env.STRIPE_PUBLIC_KEY || 'pk_test_placeholder',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  mode: 'test'
};

// Plan pricing mapping
const PLAN_PRICING = {
  pro: {
    amount: 3000, // $30.00 in cents
    currency: 'usd',
    interval: 'month',
    description: 'Pro Creator - $30/month'
  },
  enterprise: {
    amount: 9900, // $99.00 in cents
    currency: 'usd',
    interval: 'month',
    description: 'Enterprise Creator - $99/month'
  }
};

/**
 * Create a Stripe checkout session
 * @param {Object} options
 * @param {string} options.creatorId - Creator UUID
 * @param {string} options.creatorEmail - Creator email for Stripe customer
 * @param {string} options.planType - 'pro' or 'enterprise'
 * @param {string} options.successUrl - URL to redirect after success
 * @param {string} options.cancelUrl - URL to redirect on cancel
 * @returns {Promise<Object>} { url, sessionId, expiresAt }
 */
export async function createCheckoutSession(options) {
  const { creatorId, creatorEmail, planType, successUrl, cancelUrl } = options;
  
  if (!creatorId || !creatorEmail || !planType) {
    throw new Error('Missing required options: creatorId, creatorEmail, planType');
  }

  if (!PLAN_PRICING[planType]) {
    throw new Error(`Invalid plan type: ${planType}`);
  }

  if (!STRIPE_TEST_MODE.secretKey?.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }

  try {
    const plan = PLAN_PRICING[planType];
    
    // Stripe API call to create checkout session
    // Using simple implementation for Phase 3.2 MVP
    const sessionId = `cs_test_${creatorId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // In production, this would call the actual Stripe API:
    // const session = await stripe.checkout.sessions.create({
    //   customer_email: creatorEmail,
    //   client_reference_id: creatorId,
    //   line_items: [{
    //     price_data: {
    //       currency: plan.currency,
    //       product_data: {
    //         name: `CamBridge ${planType} Creator Plan`,
    //         description: plan.description
    //       },
    //       unit_amount: plan.amount,
    //       recurring: {
    //         interval: plan.interval,
    //         interval_count: 1
    //       }
    //     },
    //     quantity: 1
    //   }],
    //   mode: 'subscription',
    //   success_url: successUrl,
    //   cancel_url: cancelUrl
    // });

    return {
      url: `https://checkout.stripe.com/pay/${sessionId}`,
      sessionId,
      expiresAt,
      plan: planType,
      amount: plan.amount,
      currency: plan.currency
    };
  } catch (error) {
    throw new Error(`Failed to create Stripe checkout session: ${error.message}`);
  }
}

/**
 * Retrieve checkout session details
 * @param {string} sessionId - Stripe checkout session ID
 * @returns {Promise<Object>} Session details including payment status
 */
export async function getCheckoutSession(sessionId) {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  if (!STRIPE_TEST_MODE.secretKey?.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }

  try {
    // In production: const session = await stripe.checkout.sessions.retrieve(sessionId);
    // For MVP, return simulated data
    
    return {
      id: sessionId,
      status: 'open', // 'open', 'complete', 'expired'
      payment_status: 'unpaid', // 'paid', 'unpaid', 'no_payment_required'
      customer_email: 'creator@example.com',
      client_reference_id: 'creator-uuid',
      created: Math.floor(Date.now() / 1000),
      expires_at: Math.floor(Date.now() / 1000) + 86400
    };
  } catch (error) {
    throw new Error(`Failed to retrieve Stripe session: ${error.message}`);
  }
}

/**
 * Verify Stripe webhook signature
 * @param {Buffer} body - Raw request body
 * @param {string} signature - Stripe-Signature header value
 * @returns {Object} Parsed webhook event
 * @throws {Error} If signature verification fails
 */
export function constructWebhookEvent(body, signature) {
  const webhookSecret = STRIPE_TEST_MODE.webhookSecret;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  if (!signature) {
    throw new Error('Stripe-Signature header missing');
  }

  try {
    // Parse signature: t=timestamp,v1=hash
    const splits = signature.split(',');
    let timestamp = null;
    let hash = null;

    for (const part of splits) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') hash = value;
    }

    if (!timestamp || !hash) {
      throw new Error('Invalid signature format');
    }

    // Verify timestamp is recent (within 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const signedTime = parseInt(timestamp);
    if (Math.abs(currentTime - signedTime) > 300) {
      throw new Error('Signature timestamp too old');
    }

    // Reconstruct signed content
    const signedContent = `${timestamp}.${body.toString()}`;
    
    // Verify HMAC-SHA256 signature
    const expectedHash = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedContent)
      .digest('hex');

    // Use timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))) {
      throw new Error('Signature verification failed');
    }

    // Parse and return event
    const event = typeof body === 'string' ? JSON.parse(body) : body;
    return event;
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

/**
 * Handle Stripe webhook events
 * @param {Object} event - Stripe webhook event object
 * @returns {Object} Processing result with status and details
 */
export async function processStripeEvent(event) {
  if (!event || !event.type) {
    throw new Error('Invalid webhook event');
  }

  const eventType = event.type;
  const data = event.data.object;

  switch (eventType) {
    case 'checkout.session.completed':
      return {
        type: 'payment_success',
        sessionId: data.id,
        customerId: data.customer,
        creatorId: data.client_reference_id,
        paymentStatus: data.payment_status,
        amountTotal: data.amount_total,
        currency: data.currency,
        email: data.customer_email,
        metadata: data.metadata || {}
      };

    case 'invoice.paid':
      return {
        type: 'invoice_paid',
        invoiceId: data.id,
        subscriptionId: data.subscription,
        amountPaid: data.amount_paid,
        currency: data.currency,
        metadata: data.metadata || {}
      };

    case 'invoice.payment_failed':
      return {
        type: 'payment_failed',
        invoiceId: data.id,
        subscriptionId: data.subscription,
        amountDue: data.amount_due,
        attemptCount: data.attempt_count,
        metadata: data.metadata || {}
      };

    case 'customer.subscription.deleted':
      return {
        type: 'subscription_deleted',
        subscriptionId: data.id,
        customerId: data.customer,
        metadata: data.metadata || {}
      };

    default:
      return {
        type: 'unhandled_event',
        eventType,
        data: { id: data.id }
      };
  }
}

/**
 * Get Stripe configuration status
 * @returns {Object} Configuration status and warnings
 */
export function getConfigStatus() {
  const status = {
    configured: false,
    mode: STRIPE_TEST_MODE.mode,
    warnings: []
  };

  if (!STRIPE_TEST_MODE.secretKey || STRIPE_TEST_MODE.secretKey.includes('placeholder')) {
    status.warnings.push('STRIPE_SECRET_KEY not configured');
  } else if (STRIPE_TEST_MODE.secretKey.startsWith('sk_test_')) {
    status.mode = 'test';
    status.configured = true;
  } else if (STRIPE_TEST_MODE.secretKey.startsWith('sk_live_')) {
    status.mode = 'prod';
    status.configured = true;
  }

  if (!STRIPE_TEST_MODE.webhookSecret || STRIPE_TEST_MODE.webhookSecret.includes('placeholder')) {
    status.warnings.push('STRIPE_WEBHOOK_SECRET not configured');
  }

  return status;
}

export default {
  createCheckoutSession,
  getCheckoutSession,
  constructWebhookEvent,
  processStripeEvent,
  getConfigStatus,
  PLAN_PRICING
};
