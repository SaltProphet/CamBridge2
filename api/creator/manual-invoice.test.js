import { test } from 'node:test';
import assert from 'node:assert';
import { processManualInvoice } from './manual-invoice.js';

test('Manual Invoice Endpoint', async (t) => {
  // Mock dependencies
  const mockAuth = { authenticated: true, user: { id: 'user-123' }, error: null };
  const mockCreator = { id: 'creator-456', subscription_status: 'INACTIVE' };
  const mockUpdates = [];
  const mockEvents = [];

  const deps = {
    authenticateFn: async () => mockAuth,
    getCreatorByUserIdFn: async () => mockCreator,
    updateCreatorSubscriptionFn: async (creatorId, patch) => {
      mockUpdates.push({ creatorId, patch });
    },
    recordWebhookEventFn: async (type, id, data) => {
      mockEvents.push({ type, id, data });
      return true; // First request succeeds
    }
  };

  await t.test('GET returns current subscription status', async () => {
    const req = { method: 'GET' };
    const result = await processManualInvoice(req, deps);

    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.success, true);
    assert.strictEqual(result.body.subscription_status, 'INACTIVE');
    assert.strictEqual(result.body.subscription_provider, 'manual');
  });

  await t.test('POST creates invoice request', async () => {
    mockUpdates.length = 0;
    mockEvents.length = 0;

    const req = {
      method: 'POST',
      body: {
        plan: 'pro',
        invoiceEmail: 'creator@example.com'
      }
    };

    const result = await processManualInvoice(req, deps);

    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.success, true);
    assert.strictEqual(result.body.plan, 'pro');
    assert.strictEqual(result.body.subscription_status, 'PENDING');
    
    // Verify subscription was updated
    assert.strictEqual(mockUpdates.length, 1);
    assert.strictEqual(mockUpdates[0].patch.subscription_status, 'PENDING');
    
    // Verify event was recorded
    assert.strictEqual(mockEvents.length, 1);
    assert.strictEqual(mockEvents[0].type, 'manual_invoice_requested');
  });

  await t.test('POST rejects unauthorized requests', async () => {
    const badDeps = {
      ...deps,
      authenticateFn: async () => ({ authenticated: false, error: 'Unauthorized' })
    };

    const req = {
      method: 'POST',
      body: { plan: 'pro', invoiceEmail: 'test@example.com' }
    };

    const result = await processManualInvoice(req, badDeps);
    assert.strictEqual(result.status, 401);
    assert.strictEqual(result.body.code, 'UNAUTHORIZED');
  });

  await t.test('POST rejects non-creators', async () => {
    const badDeps = {
      ...deps,
      getCreatorByUserIdFn: async () => null
    };

    const req = {
      method: 'POST',
      body: { plan: 'pro', invoiceEmail: 'test@example.com' }
    };

    const result = await processManualInvoice(req, badDeps);
    assert.strictEqual(result.status, 403);
    assert.strictEqual(result.body.code, 'CREATOR_REQUIRED');
  });

  await t.test('POST rejects invalid email', async () => {
    const req = {
      method: 'POST',
      body: { plan: 'pro', invoiceEmail: 'not-an-email' }
    };

    const result = await processManualInvoice(req, deps);
    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.body.code, 'INVALID_EMAIL');
  });

  await t.test('POST rejects missing plan', async () => {
    const req = {
      method: 'POST',
      body: { invoiceEmail: 'creator@example.com' }
    };

    const result = await processManualInvoice(req, deps);
    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.body.code, 'INVALID_PLAN');
  });

  await t.test('POST prevents duplicate invoice requests', async () => {
    mockUpdates.length = 0;
    mockEvents.length = 0;

    const badDeps = {
      ...deps,
      recordWebhookEventFn: async () => false // Duplicate detected
    };

    const req = {
      method: 'POST',
      body: { plan: 'pro', invoiceEmail: 'creator@example.com' }
    };

    const result = await processManualInvoice(req, badDeps);
    assert.strictEqual(result.status, 409);
    assert.strictEqual(result.body.code, 'DUPLICATE_REQUEST');
  });

  await t.test('rejects unsupported HTTP methods', async () => {
    const req = { method: 'DELETE' };
    const result = await processManualInvoice(req, deps);

    assert.strictEqual(result.status, 405);
    assert.strictEqual(result.body.code, 'METHOD_NOT_ALLOWED');
  });
});
