/**
 * Stripe Integration Tests
 * Tests for Stripe payment provider and webhook handling
 * 
 * Run with: node api/webhooks/stripe-webhook.test.js
 */

import test from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

// Test configuration
const TEST_WEBHOOK_SECRET = 'whsec_test_123456789';
process.env.STRIPE_SECRET_KEY = 'sk_test_51234567890';
process.env.STRIPE_PUBLIC_KEY = 'pk_test_51234567890';
process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

const { 
  createCheckoutSession, 
  constructWebhookEvent, 
  processStripeEvent 
} = await import('../providers/stripe.js');
const { handleStripeWebhook } = await import('./stripe-webhook.js');

/**
 * Helper: Create a valid Stripe webhook signature
 */
function createWebhookSignature(payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(signed)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

// Test 1: Create checkout session
test('Stripe: createCheckoutSession generates valid session', async () => {
  const session = await createCheckoutSession({
    creatorId: 'creator-123',
    creatorEmail: 'creator@example.com',
    planType: 'pro',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel'
  });

  assert(session.url, 'Session URL should exist');
  assert(session.sessionId, 'Session ID should exist');
  assert.strictEqual(session.plan, 'pro');
  assert.strictEqual(session.amount, 3000); // $30.00 in cents
  assert.strictEqual(session.currency, 'usd');
});

// Test 2: Create enterprise plan session
test('Stripe: createCheckoutSession handles enterprise plan', async () => {
  const session = await createCheckoutSession({
    creatorId: 'creator-456',
    creatorEmail: 'enterprise@example.com',
    planType: 'enterprise',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel'
  });

  assert.strictEqual(session.plan, 'enterprise');
  assert.strictEqual(session.amount, 9900); // $99.00 in cents
});

// Test 3: Webhook signature verification
test('Stripe: constructWebhookEvent verifies signature', () => {
  const payload = JSON.stringify({ type: 'test.event' });
  const signature = createWebhookSignature(payload);

  const event = constructWebhookEvent(payload, signature);
  assert.strictEqual(event.type, 'test.event');
});

// Test 4: Reject invalid signature
test('Stripe: constructWebhookEvent rejects invalid signature', () => {
  const payload = JSON.stringify({ type: 'test.event' });
  const timestamp = Math.floor(Date.now() / 1000);
  const badSignature = `t=${timestamp},v1=badsignaturehash`;

  assert.throws(
    () => constructWebhookEvent(payload, badSignature),
    { message: /Signature verification failed/ }
  );
});

// Test 5: Process checkout.session.completed event
test('Stripe: processStripeEvent handles checkout.session.completed', async () => {
  const event = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        client_reference_id: 'creator-123',
        customer: 'cus_123',
        payment_status: 'paid',
        amount_total: 3000,
        currency: 'usd',
        customer_email: 'creator@example.com'
      }
    }
  };

  const result = await processStripeEvent(event);
  assert.strictEqual(result.type, 'payment_success');
  assert.strictEqual(result.creatorId, 'creator-123');
  assert.strictEqual(result.paymentStatus, 'paid');
});

// Test 6: Process invoice.paid event
test('Stripe: processStripeEvent handles invoice.paid', async () => {
  const event = {
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_test_123',
        subscription: 'sub_test_123',
        amount_paid: 3000,
        currency: 'usd'
      }
    }
  };

  const result = await processStripeEvent(event);
  assert.strictEqual(result.type, 'invoice_paid');
  assert.strictEqual(result.invoiceId, 'in_test_123');
  assert.strictEqual(result.amountPaid, 3000);
});

// Test 7: Process invoice.payment_failed event
test('Stripe: processStripeEvent handles invoice.payment_failed', async () => {
  const event = {
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: 'in_test_456',
        subscription: 'sub_test_456',
        amount_due: 3000,
        attempt_count: 1
      }
    }
  };

  const result = await processStripeEvent(event);
  assert.strictEqual(result.type, 'payment_failed');
  assert.strictEqual(result.invoiceId, 'in_test_456');
  assert.strictEqual(result.attemptCount, 1);
});

// Test 8: Process customer.subscription.deleted event
test('Stripe: processStripeEvent handles customer.subscription.deleted', async () => {
  const event = {
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_del',
        customer: 'cus_del'
      }
    }
  };

  const result = await processStripeEvent(event);
  assert.strictEqual(result.type, 'subscription_deleted');
  assert.strictEqual(result.subscriptionId, 'sub_test_del');
});

// Test 9: Webhook handler rejects missing signature
test('Stripe: handleStripeWebhook rejects missing signature', async () => {
  const result = await handleStripeWebhook({
    method: 'POST',
    headers: {},
    body: '{}'
  });

  assert.strictEqual(result.status, 400);
  assert(result.body.error.includes('Missing signature'));
});

// Test 10: Webhook handler rejects invalid method
test('Stripe: handleStripeWebhook rejects non-POST requests', async () => {
  const result = await handleStripeWebhook({
    method: 'GET',
    headers: { 'stripe-signature': 'test' },
    body: '{}'
  });

  assert.strictEqual(result.status, 405);
  assert(result.body.code === 'METHOD_NOT_ALLOWED');
});

// Test 11: Invalid plan type
test('Stripe: createCheckoutSession rejects invalid plan', async () => {
  assert.rejects(
    () => createCheckoutSession({
      creatorId: 'creator-123',
      creatorEmail: 'creator@example.com',
      planType: 'invalid-plan',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    }),
    { message: /Invalid plan type/ }
  );
});

// Test 12: Missing required parameters
test('Stripe: createCheckoutSession validates required params', async () => {
  assert.rejects(
    () => createCheckoutSession({
      creatorId: 'creator-123'
      // Missing other required fields
    }),
    { message: /Missing required options/ }
  );
});

console.log('✅ Stripe integration tests ready');
