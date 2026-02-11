import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabasePaymentsProvider } from './payments.js';

test('DatabasePaymentsProvider.handleWebhook ignores duplicate event ids', async () => {
  const db = {
    hasProcessedWebhookEvent: async () => true
  };
  const provider = new DatabasePaymentsProvider(db);

  const result = await provider.handleWebhook(
    { eventId: 'evt-1', subscriptionId: 'sub-1', status: 'active' },
    { 'x-payments-provider': 'ccbill' }
  );

  assert.equal(result.success, true);
  assert.equal(result.event, 'duplicate_ignored');
  assert.equal(result.idempotent, true);
});

test('DatabasePaymentsProvider.handleWebhook updates creator by provider + external subscription id', async () => {
  let updatedPatch;
  const db = {
    hasProcessedWebhookEvent: async () => false,
    getCreatorByExternalSubscriptionId: async (providerName, externalId) => {
      assert.equal(providerName, 'segpay');
      assert.equal(externalId, 'sub-42');
      return { id: 'creator-42', subscription_status: 'inactive', subscription_external_id: 'sub-42' };
    },
    updateCreatorSubscription: async (creatorId, patch) => {
      assert.equal(creatorId, 'creator-42');
      updatedPatch = patch;
      return { success: true, creator: { id: creatorId, ...patch } };
    },
    recordProcessedWebhookEvent: async (providerName, eventId, externalId, creatorId) => {
      assert.equal(providerName, 'segpay');
      assert.equal(eventId, 'evt-42');
      assert.equal(externalId, 'sub-42');
      assert.equal(creatorId, 'creator-42');
      return { success: true, inserted: true };
    }
  };

  const provider = new DatabasePaymentsProvider(db);
  const result = await provider.handleWebhook(
    {
      eventId: 'evt-42',
      subscriptionId: 'sub-42',
      status: 'active',
      subscriptionNextBillingAt: '2026-01-01T00:00:00.000Z',
      type: 'subscription.updated'
    },
    { 'x-payments-provider': 'segpay' }
  );

  assert.equal(result.success, true);
  assert.equal(result.creatorId, 'creator-42');
  assert.equal(result.idempotent, false);
  assert.equal(updatedPatch.subscription_provider, 'segpay');
  assert.equal(updatedPatch.subscription_external_id, 'sub-42');
  assert.equal(updatedPatch.subscription_status, 'active');
  assert.equal(updatedPatch.subscription_next_billing_at, '2026-01-01T00:00:00.000Z');
});

test('DatabasePaymentsProvider.handleWebhook records unknown creator events for idempotency', async () => {
  let recorded = false;
  const db = {
    hasProcessedWebhookEvent: async () => false,
    getCreatorByExternalSubscriptionId: async () => null,
    getCreatorById: async () => null,
    recordProcessedWebhookEvent: async (providerName, eventId, externalId, creatorId) => {
      recorded = true;
      assert.equal(providerName, 'database');
      assert.equal(eventId, 'evt-missing');
      assert.equal(externalId, 'sub-missing');
      assert.equal(creatorId, null);
      return { success: true, inserted: true };
    }
  };

  const provider = new DatabasePaymentsProvider(db);
  const result = await provider.handleWebhook(
    {
      eventId: 'evt-missing',
      subscriptionId: 'sub-missing',
      status: 'past_due'
    },
    {}
  );

  assert.equal(result.success, true);
  assert.equal(result.event, 'ignored_no_creator_match');
  assert.equal(recorded, true);
});
