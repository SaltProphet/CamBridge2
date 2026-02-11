import { getCreatorByUserId } from '../db.js';
import { authenticate } from '../middleware.js';
import { getPaymentsProvider } from '../providers/payments.js';

function errorPayload(error, code, extras = {}) {
  return { error, code, ...extras };
}

function normalizePlan(plan) {
  if (typeof plan !== 'string') {
    return null;
  }

  const cleaned = plan.trim().toLowerCase();
  if (!cleaned) {
    return null;
  }

  return cleaned;
}

export async function processCreatorSubscribe(req, deps = {}) {
  const {
    authenticateFn = authenticate,
    getCreatorByUserIdFn = getCreatorByUserId,
    getPaymentsProviderFn = getPaymentsProvider
  } = deps;

  if (req.method !== 'POST') {
    return { status: 405, body: errorPayload('Method not allowed', 'METHOD_NOT_ALLOWED') };
  }

  const auth = await authenticateFn(req);
  if (!auth.authenticated) {
    return { status: 401, body: errorPayload(auth.error || 'Unauthorized', 'UNAUTHORIZED') };
  }

  const creator = await getCreatorByUserIdFn(auth.user.id);
  if (!creator) {
    return { status: 403, body: errorPayload('Only creators can subscribe', 'CREATOR_REQUIRED') };
  }

  const plan = normalizePlan(req.body?.plan);
  if (!plan) {
    return { status: 400, body: errorPayload('Plan is required', 'INVALID_PLAN') };
  }

  const provider = getPaymentsProviderFn();
  const subscribeFn = provider?.subscribeCreator || provider?.createSubscription;
  if (!subscribeFn) {
    return { status: 501, body: errorPayload('Configured payments provider does not support subscribe operation', 'PROVIDER_NOT_SUPPORTED') };
  }

  const subscribeResult = await subscribeFn.call(provider, {
    creatorId: creator.id,
    userId: auth.user.id,
    plan
  });

  if (!subscribeResult?.success) {
    return {
      status: 502,
      body: errorPayload(subscribeResult?.error || 'Subscription request failed', 'SUBSCRIBE_FAILED')
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      creatorId: creator.id,
      plan,
      providerResponse: subscribeResult
    }
  };
}

export default async function handler(req, res) {
  try {
    const result = await processCreatorSubscribe(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Creator subscribe error:', error);
    return res.status(500).json(errorPayload('An error occurred while creating subscription', 'INTERNAL_ERROR'));
  }
}
