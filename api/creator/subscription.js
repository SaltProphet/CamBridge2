import { getCreatorByUserId } from '../db.js';
import { authenticate } from '../middleware.js';
import { getPaymentsProvider } from '../providers/payments.js';

function errorPayload(error, code, extras = {}) {
  return { error, code, ...extras };
}

export async function processCreatorSubscription(req, deps = {}) {
  const {
    authenticateFn = authenticate,
    getCreatorByUserIdFn = getCreatorByUserId,
    getPaymentsProviderFn = getPaymentsProvider
  } = deps;

  if (req.method !== 'GET') {
    return { status: 405, body: errorPayload('Method not allowed', 'METHOD_NOT_ALLOWED') };
  }

  const auth = await authenticateFn(req);
  if (!auth.authenticated) {
    return { status: 401, body: errorPayload(auth.error || 'Unauthorized', 'UNAUTHORIZED') };
  }

  const creator = await getCreatorByUserIdFn(auth.user.id);
  if (!creator) {
    return { status: 403, body: errorPayload('Only creators can access subscription status', 'CREATOR_REQUIRED') };
  }

  const provider = getPaymentsProviderFn();
  const providerStatus = provider?.getSubscriptionStatus
    ? await provider.getSubscriptionStatus(creator.id)
    : { success: false, error: 'Provider does not support subscription status lookup' };

  return {
    status: 200,
    body: {
      success: true,
      creatorId: creator.id,
      status: providerStatus.success ? (providerStatus.status || creator.status) : creator.status,
      plan: providerStatus.success ? (providerStatus.plan || creator.plan) : creator.plan,
      providerStatus
    }
  };
}

export default async function handler(req, res) {
  try {
    const result = await processCreatorSubscription(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Creator subscription fetch error:', error);
    return res.status(500).json(errorPayload('An error occurred while fetching subscription status', 'INTERNAL_ERROR'));
  }
}
