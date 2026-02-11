import test from 'node:test';
import assert from 'node:assert/strict';
import { processJoinRequest } from './join-request.js';

function baseReq(overrides = {}) {
  return {
    method: 'POST',
    body: { creatorSlug: 'alice', roomSlug: 'vip', accessCode: 'ABC12345' },
    headers: {
      'user-agent': 'unit-test-agent',
      'x-forwarded-for': '127.0.0.1'
    },
    ...overrides
  };
}

function passingDeps(overrides = {}) {
  return {
    authenticateFn: async () => ({ authenticated: true, user: { id: 7 } }),
    killSwitchEnabledFn: () => true,
    getCreatorBySlugFn: async () => ({ id: 'creator-1', plan: 'free', status: 'active' }),
    getUserByIdFn: async () => ({ id: 7, email: 'user@example.com', age_attested_at: '2024-01-01', tos_accepted_at: '2024-01-01' }),
    getPaymentsProviderFn: () => ({ isSubscriptionActive: async () => ({ success: true, active: true }) }),
    checkCreatorStatusFn: async () => ({ allowed: true }),
    checkUserComplianceFn: () => ({ allowed: true }),
    checkBanStatusFn: async () => ({ allowed: true }),
    checkRateLimitFn: () => ({ allowed: true }),
    getRoomByNameFn: async () => ({
      id: 22,
      join_mode: 'knock',
      access_code: 'ABC12345',
      is_active: true,
      enabled: true,
      max_participants: 20
    }),
    getApprovedParticipantCountFn: async () => 0,
    hasDuplicatePendingRequestFn: async () => false,
    createJoinRequestFn: async () => ({
      success: true,
      request: { id: 'jr-1', status: 'pending', created_at: '2024-01-01T00:00:00Z' }
    }),
    updateJoinRequestStatusFn: async () => ({
      success: true,
      request: { id: 'jr-1', status: 'approved', created_at: '2024-01-01T00:00:00Z' }
    }),
    ...overrides
  };
}

test('returns consistent compliance error payload', async () => {
  const result = await processJoinRequest(
    baseReq(),
    passingDeps({ checkUserComplianceFn: () => ({ allowed: false, reason: 'Age attestation required' }) })
  );

  assert.equal(result.status, 403);
  assert.equal(result.body.error, 'Age attestation required');
  assert.equal(result.body.code, 'USER_COMPLIANCE_REQUIRED');
  assert.equal(result.body.requiresAcceptance, true);
});

test('keyed rooms require a valid access code', async () => {
  const result = await processJoinRequest(
    baseReq({ body: { creatorSlug: 'alice', roomSlug: 'vip', accessCode: 'WRONG000' } }),
    passingDeps({
      getRoomByNameFn: async () => ({
        id: 22,
        join_mode: 'keyed',
        access_code: 'ABC12345',
        is_active: true,
        enabled: true,
        max_participants: 20
      })
    })
  );

  assert.equal(result.status, 403);
  assert.equal(result.body.code, 'ACCESS_CODE_REQUIRED');
});

test('open rooms are auto-approved', async () => {
  let updatedStatus = null;
  const result = await processJoinRequest(
    baseReq(),
    passingDeps({
      getRoomByNameFn: async () => ({
        id: 22,
        join_mode: 'open',
        access_code: 'ABC12345',
        is_active: true,
        enabled: true,
        max_participants: 20
      }),
      updateJoinRequestStatusFn: async (_id, status) => {
        updatedStatus = status;
        return {
          success: true,
          request: { id: 'jr-1', status: 'approved', created_at: '2024-01-01T00:00:00Z' }
        };
      }
    })
  );

  assert.equal(updatedStatus, 'approved');
  assert.equal(result.status, 201);
  assert.equal(result.body.status, 'approved');
});

test('duplicate pending requests are suppressed', async () => {
  const result = await processJoinRequest(
    baseReq(),
    passingDeps({ hasDuplicatePendingRequestFn: async () => true })
  );

  assert.equal(result.status, 409);
  assert.equal(result.body.code, 'DUPLICATE_PENDING_REQUEST');
});

test('room cap enforcement occurs before request creation', async () => {
  let created = false;
  const result = await processJoinRequest(
    baseReq(),
    passingDeps({
      getApprovedParticipantCountFn: async () => 10,
      getCreatorBySlugFn: async () => ({ id: 'creator-1', plan: 'free', status: 'active' }),
      getRoomByNameFn: async () => ({
        id: 22,
        join_mode: 'knock',
        access_code: 'ABC12345',
        is_active: true,
        enabled: true,
        max_participants: 50
      }),
      createJoinRequestFn: async () => {
        created = true;
        return { success: true, request: { id: 'jr-1', status: 'pending', created_at: '2024-01-01T00:00:00Z' } };
      }
    })
  );

  assert.equal(result.status, 403);
  assert.equal(result.body.code, 'ROOM_CAP_REACHED');
  assert.equal(created, false);
});
