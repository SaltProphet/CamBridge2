import { getCreatorByUserId } from '../db.js';
import { authenticate } from '../middleware.js';
import { getPaymentsProvider } from '../providers/payments.js';

function errorPayload(error, code, extras = {}) {
  return { error, code, ...extras };
}

export async function processCreatorCancel(req, deps = {}) {
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
    return { status: 403, body: errorPayload('Only creators can cancel subscriptions', 'CREATOR_REQUIRED') };
  }

  const provider = getPaymentsProviderFn();
  const cancelFn = provider?.cancelSubscription || provider?.unsubscribeCreator;
  if (!cancelFn) {
    return { status: 501, body: errorPayload('Configured payments provider does not support cancel operation', 'PROVIDER_NOT_SUPPORTED') };
  }

  const cancelResult = await cancelFn.call(provider, {
    creatorId: creator.id,
    userId: auth.user.id,
    reason: req.body?.reason || null,
    externalSubscriptionId: creator.subscription_external_id || null
  });

  if (!cancelResult?.success) {
    return {
      status: 502,
      body: errorPayload(cancelResult?.error || 'Cancel request failed', 'CANCEL_FAILED')
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      creatorId: creator.id,
      providerResponse: cancelResult
    }
  };
}

export default async function handler(req, res) {
  try {
    const result = await processCreatorCancel(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Creator cancel error:', error);
    return res.status(500).json(errorPayload('An error occurred while cancelling subscription', 'INTERNAL_ERROR'));
  }
}
