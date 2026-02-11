import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { processStripeWebhook } from './stripe.js';
import { processCcbillWebhook } from './ccbill.js';

function stripeSignature(secret, timestamp, rawBody) {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return `t=${timestamp},v1=${digest}`;
}

function ccbillSignature(secret, rawBody) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

test('stripe webhook validates method', async () => {
  const result = await processStripeWebhook({ method: 'GET', headers: {} });
  assert.equal(result.status, 405);
});

test('stripe webhook rejects invalid signature', async () => {
  const result = await processStripeWebhook(
    { method: 'POST', headers: { 'stripe-signature': 't=1,v1=bad' }, rawBody: '{}' },
    { webhookSecret: 'whsec_test' }
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.code, 'INVALID_SIGNATURE');
});

test('stripe webhook happy path updates creator subscription', async () => {
  const payload = {
    id: 'evt_123',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_123',
        status: 'active',
        metadata: { creatorId: 'creator-stripe' }
      }
    }
  };
  const rawBody = JSON.stringify(payload);
  const signature = stripeSignature('whsec_test', '1234567890', rawBody);

  let subscriptionUpdate;
  const result = await processStripeWebhook(
    {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body: payload,
      rawBody
    },
    {
      webhookSecret: 'whsec_test',
      updateCreatorSubscriptionFn: async (creatorId, patch) => {
        subscriptionUpdate = { creatorId, patch };
        return { success: true };
      },
      hasProcessedWebhookEventFn: async () => false,
      recordProcessedWebhookEventFn: async () => ({ success: true })
    }
  );

  assert.equal(result.status, 200);
  assert.deepEqual(subscriptionUpdate, {
    creatorId: 'creator-stripe',
    patch: {
      subscription_provider: 'stripe',
      subscription_status: 'active',
      subscription_external_id: 'sub_123'
    }
  });
});

test('ccbill webhook happy path updates creator status', async () => {
  const payload = { eventType: 'subscription_cancelled', creatorId: 'creator-cc' };
  const rawBody = JSON.stringify(payload);
  const signature = ccbillSignature('cc_secret', rawBody);

  let statusUpdate;
  const result = await processCcbillWebhook(
    {
      method: 'POST',
      headers: { 'x-ccbill-signature': signature },
      body: payload,
      rawBody
    },
    {
      webhookSecret: 'cc_secret',
      updateCreatorStatusFn: async (creatorId, status) => {
        statusUpdate = { creatorId, status };
        return { success: true };
      }
    }
  );

  assert.equal(result.status, 200);
  assert.deepEqual(statusUpdate, { creatorId: 'creator-cc', status: 'cancelled' });
});
