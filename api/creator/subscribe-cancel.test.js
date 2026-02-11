import test from 'node:test';
import assert from 'node:assert/strict';
import { processCreatorSubscribe } from './subscribe.js';
import { processCreatorCancel } from './cancel.js';

function postReq(body = {}, overrides = {}) {
  return { method: 'POST', body, headers: {}, ...overrides };
}

test('subscribe rejects unauthenticated requests', async () => {
  const result = await processCreatorSubscribe(postReq({ plan: 'pro' }), {
    authenticateFn: async () => ({ authenticated: false, error: 'Invalid token' })
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.code, 'UNAUTHORIZED');
});

test('subscribe happy path calls provider with creator ownership enforced', async () => {
  let payload;
  const result = await processCreatorSubscribe(postReq({ plan: 'pro' }), {
    authenticateFn: async () => ({ authenticated: true, user: { id: 4 } }),
    getCreatorByUserIdFn: async () => ({ id: 'creator-4' }),
    getPaymentsProviderFn: () => ({
      subscribeCreator: async (input) => {
        payload = input;
        return { success: true, subscriptionId: 'sub_1' };
      }
    })
  });

  assert.equal(result.status, 200);
  assert.equal(payload.creatorId, 'creator-4');
  assert.equal(payload.userId, 4);
});

test('cancel rejects non-POST methods', async () => {
  const result = await processCreatorCancel({ method: 'GET', headers: {} });
  assert.equal(result.status, 405);
  assert.equal(result.body.code, 'METHOD_NOT_ALLOWED');
});

test('cancel happy path calls provider', async () => {
  let payload;
  const result = await processCreatorCancel(postReq({ reason: 'requested' }), {
    authenticateFn: async () => ({ authenticated: true, user: { id: 11 } }),
    getCreatorByUserIdFn: async () => ({ id: 'creator-11' }),
    getPaymentsProviderFn: () => ({
      cancelSubscription: async (input) => {
        payload = input;
        return { success: true, cancelled: true };
      }
    })
  });

  assert.equal(result.status, 200);
  assert.equal(payload.creatorId, 'creator-11');
});
