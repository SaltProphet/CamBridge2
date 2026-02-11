import { getCreatorByUserId, updateCreatorSubscription } from '../db.js';
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

function normalizeProvider(provider) {
  if (typeof provider !== 'string') {
    return 'manual';
  }

  const cleaned = provider.trim().toLowerCase();
  if (!cleaned) {
    return 'manual';
  }

  // Validate provider is in allowed list
  const ALLOWED_PROVIDERS = ['manual', 'stripe', 'ccbill'];
  return ALLOWED_PROVIDERS.includes(cleaned) ? cleaned : 'manual';
}

export async function processCreatorSubscribe(req, deps = {}) {
  const {
    authenticateFn = authenticate,
    getCreatorByUserIdFn = getCreatorByUserId,
    updateCreatorSubscriptionFn = updateCreatorSubscription,
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

  const provider = normalizeProvider(req.body?.provider);

  // Get the payments provider for this request
  const paymentProvider = getPaymentsProviderFn();
  if (!paymentProvider) {
    return { status: 501, body: errorPayload('Payments provider not configured', 'PROVIDER_NOT_CONFIGURED') };
  }

  // Handle different providers
  if (provider === 'manual') {
    // Manual provider: update subscription to PENDING, send invoice
    try {
      await updateCreatorSubscriptionFn(creator.id, {
        subscription_provider: 'manual',
        subscription_status: 'PENDING',
        subscription_started_at: new Date(),
      });

      return {
        status: 200,
        body: {
          success: true,
          creatorId: creator.id,
          plan,
          provider: 'manual',
          message: 'Invoice created. Check your email for payment details.'
        }
      };
    } catch (err) {
      console.error('Manual subscription error:', err);
      return {
        status: 500,
        body: errorPayload('Failed to create manual subscription', 'MANUAL_SUBSCRIBE_FAILED')
      };
    }
  } else if (provider === 'stripe' || provider === 'ccbill') {
    // Stripe/CCBill: delegate to provider's subscription function
    const subscribeFn = paymentProvider?.subscribeCreator || paymentProvider?.createSubscription;
    if (!subscribeFn) {
      return { status: 501, body: errorPayload('Configured payments provider does not support subscribe operation', 'PROVIDER_NOT_SUPPORTED') };
    }

    const subscribeResult = await subscribeFn.call(paymentProvider, {
      creatorId: creator.id,
      userId: auth.user.id,
      plan,
      provider
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
        provider,
        checkoutUrl: subscribeResult.checkoutUrl,
        redirectUrl: subscribeResult.redirectUrl,
        providerResponse: subscribeResult
      }
    };
  } else {
    return {
      status: 400,
      body: errorPayload(`Unknown provider: ${provider}`, 'INVALID_PROVIDER')
    };
  }
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
