import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import {
  CCBillPaymentsProvider,
  ManualPaymentsProvider,
  StripePaymentsProvider,
  getPaymentsProvider
} from '../payments.js';

const ORIGINAL_ENV = { ...process.env };

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test('getPaymentsProvider selects manual provider by default', () => {
  delete process.env.PAYMENTS_PROVIDER;
  const provider = getPaymentsProvider();
  assert.ok(provider instanceof ManualPaymentsProvider);
});

test('getPaymentsProvider selects ccbill provider and uses roadmap env names', () => {
  process.env.PAYMENTS_PROVIDER = 'ccbill';
  process.env.CCBILL_ACCOUNT_ID = 'acct';
  process.env.CCBILL_SUBACCOUNT_ID = 'subacct';
  process.env.CCBILL_FLEXFORMS_ID = 'flex';
  process.env.CCBILL_SALT = 'salt';

  const provider = getPaymentsProvider();
  assert.ok(provider instanceof CCBillPaymentsProvider);
  assert.equal(provider.accountId, 'acct');
  assert.equal(provider.subAccountId, 'subacct');
  assert.equal(provider.flexFormsId, 'flex');
  assert.equal(provider.salt, 'salt');
});

test('getPaymentsProvider selects stripe provider', () => {
  process.env.PAYMENTS_PROVIDER = 'stripe';
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

  const provider = getPaymentsProvider();
  assert.ok(provider instanceof StripePaymentsProvider);
  assert.equal(provider.secretKey, 'sk_test_123');
  assert.equal(provider.webhookSecret, 'whsec_test_123');
});

test('getPaymentsProvider falls back to manual on unknown provider', () => {
  process.env.PAYMENTS_PROVIDER = 'does-not-exist';
  const provider = getPaymentsProvider();
  assert.ok(provider instanceof ManualPaymentsProvider);
});

test('StripePaymentsProvider.handleWebhook returns error on malformed payload', async () => {
  const provider = new StripePaymentsProvider({
    secretKey: 'sk_test_123',
    webhookSecret: 'whsec_test_123',
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    }
  });

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const malformedRawPayload = '{invalid-json';
  const signedPayload = `${timestamp}.${malformedRawPayload}`;
  const signature = crypto
    .createHmac('sha256', 'whsec_test_123')
    .update(signedPayload, 'utf8')
    .digest('hex');

  const result = await provider.handleWebhook(malformedRawPayload, {
    'stripe-signature': `t=${timestamp},v1=${signature}`
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'Malformed Stripe webhook payload');
});

test('CCBillPaymentsProvider.handleWebhook returns error on malformed payload', async () => {
  const provider = new CCBillPaymentsProvider({
    accountId: 'acct',
    subAccountId: 'subacct',
    flexFormsId: 'flex',
    salt: 'salt',
    fetchImpl: async () => {
      throw new Error('fetch should not be called');
    }
  });

  const result = await provider.handleWebhook({ eventType: 'renewal' }, {
    'x-ccbill-signature': 'fake'
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'Malformed CCBill webhook payload');
});
