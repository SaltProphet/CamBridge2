import test from 'node:test';
import assert from 'node:assert/strict';
import { processCreatorSubscription } from './subscription.js';

function req(overrides = {}) {
  return { method: 'GET', headers: {}, ...overrides };
}

test('creator subscription rejects non-GET methods', async () => {
  const result = await processCreatorSubscription(req({ method: 'POST' }));
  assert.equal(result.status, 405);
  assert.equal(result.body.code, 'METHOD_NOT_ALLOWED');
});

test('creator subscription requires auth', async () => {
  const result = await processCreatorSubscription(req(), {
    authenticateFn: async () => ({ authenticated: false, error: 'No token provided' })
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.code, 'UNAUTHORIZED');
});

test('creator subscription happy path returns provider status', async () => {
  const result = await processCreatorSubscription(req(), {
    authenticateFn: async () => ({ authenticated: true, user: { id: 9 } }),
    getCreatorByUserIdFn: async () => ({ id: 'creator-9', status: 'active', plan: 'free' }),
    getPaymentsProviderFn: () => ({
      getSubscriptionStatus: async () => ({ success: true, status: 'active', plan: 'pro' })
    })
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.plan, 'pro');
});
