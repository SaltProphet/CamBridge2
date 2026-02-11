import crypto from 'crypto';
import {
  updateCreatorSubscription,
  hasProcessedWebhookEvent,
  recordProcessedWebhookEvent,
  getCreatorByExternalSubscriptionId
} from '../db.js';

function errorPayload(error, code, extras = {}) {
  return { error, code, ...extras };
}

function getRawBody(req) {
  if (typeof req.rawBody === 'string') {
    return req.rawBody;
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  return JSON.stringify(req.body || {});
}

function verifyStripeSignature(signatureHeader, rawBody, webhookSecret) {
  if (!signatureHeader || !webhookSecret) {
    return false;
  }

  const parts = Object.fromEntries(
    signatureHeader
      .split(',')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
  );

  const timestamp = parts.t;
  const expectedSignature = parts.v1;
  if (!timestamp || !expectedSignature) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const computedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  const computedBuffer = Buffer.from(computedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (computedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, expectedBuffer);
}

function resolveStripeStatus(eventType, payload) {
  if (eventType === 'customer.subscription.deleted') {
    return 'cancelled';
  }

  if (eventType === 'invoice.payment_failed') {
    return 'past_due';
  }

  const subscriptionStatus = payload?.data?.object?.status;
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return 'active';
  }

  if (subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') {
    return 'past_due';
  }

  if (subscriptionStatus === 'canceled' || subscriptionStatus === 'incomplete_expired') {
    return 'cancelled';
  }

  return null;
}

function resolveSubscriptionId(eventType, payload) {
  const dataObject = payload?.data?.object || {};

  if (eventType === 'checkout.session.completed') {
    return dataObject.subscription || null;
  }

  if (eventType?.startsWith('invoice.')) {
    return dataObject.subscription || null;
  }

  if (eventType?.startsWith('customer.subscription.')) {
    return dataObject.id || null;
  }

  return dataObject.subscription || null;
}

function resolveNextBillingAt(payload) {
  const dataObject = payload?.data?.object || {};
  const periodEnd = dataObject?.current_period_end;
  if (periodEnd) {
    return new Date(periodEnd * 1000);
  }

  const linePeriodEnd = dataObject?.lines?.data?.[0]?.period?.end;
  if (linePeriodEnd) {
    return new Date(linePeriodEnd * 1000);
  }

  return null;
}

export async function processStripeWebhook(req, deps = {}) {
  const {
    updateCreatorSubscriptionFn = updateCreatorSubscription,
    hasProcessedWebhookEventFn = hasProcessedWebhookEvent,
    recordProcessedWebhookEventFn = recordProcessedWebhookEvent,
    getCreatorByExternalSubscriptionIdFn = getCreatorByExternalSubscriptionId,
    webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  } = deps;

  if (req.method !== 'POST') {
    return { status: 405, body: errorPayload('Method not allowed', 'METHOD_NOT_ALLOWED') };
  }

  const rawBody = getRawBody(req);
  const signature = req.headers?.['stripe-signature'];
  const signatureValid = verifyStripeSignature(signature, rawBody, webhookSecret);
  if (!signatureValid) {
    return { status: 401, body: errorPayload('Invalid webhook signature', 'INVALID_SIGNATURE') };
  }

  const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody || '{}');
  const eventType = payload?.type;
  const eventId = payload?.id || null;
  const dataObject = payload?.data?.object || {};
  const metadata = dataObject?.metadata || {};
  const creatorIdFromMeta = metadata?.creatorId || metadata?.creator_id || dataObject?.client_reference_id;
  const subscriptionId = resolveSubscriptionId(eventType, payload);
  const mappedStatus = resolveStripeStatus(eventType, payload);

  if (eventId && hasProcessedWebhookEventFn) {
    const alreadyProcessed = await hasProcessedWebhookEventFn('stripe', eventId);
    if (alreadyProcessed) {
      return { status: 200, body: { received: true, idempotent: true } };
    }
  }

  let creatorId = creatorIdFromMeta;
  if (!creatorId && subscriptionId && getCreatorByExternalSubscriptionIdFn) {
    const creator = await getCreatorByExternalSubscriptionIdFn('stripe', subscriptionId);
    creatorId = creator?.id || null;
  }

  if (!creatorId || !mappedStatus) {
    if (eventId && recordProcessedWebhookEventFn) {
      await recordProcessedWebhookEventFn('stripe', eventId, subscriptionId, creatorId || null);
    }
    return { status: 200, body: { received: true, ignored: true } };
  }

  const patch = {
    subscription_provider: 'stripe',
    subscription_status: mappedStatus
  };

  if (subscriptionId) {
    patch.subscription_external_id = subscriptionId;
  }

  if (eventType === 'checkout.session.completed') {
    patch.subscription_started_at = new Date();
    const nextBilling = resolveNextBillingAt(payload);
    patch.subscription_next_billing_at = nextBilling || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  if (eventType === 'invoice.paid') {
    const nextBilling = resolveNextBillingAt(payload);
    if (nextBilling) {
      patch.subscription_next_billing_at = nextBilling;
    }
  }

  if (eventType === 'customer.subscription.deleted') {
    patch.subscription_canceled_at = new Date();
  }

  const updateResult = await updateCreatorSubscriptionFn(creatorId, patch);
  if (!updateResult?.success) {
    return { status: 500, body: errorPayload('Failed to persist webhook event', 'WEBHOOK_PERSIST_FAILED') };
  }

  if (eventId && recordProcessedWebhookEventFn) {
    await recordProcessedWebhookEventFn('stripe', eventId, subscriptionId, creatorId);
  }

  return {
    status: 200,
    body: {
      received: true,
      creatorId,
      status: mappedStatus,
      subscriptionId
    }
  };
}

export default async function handler(req, res) {
  try {
    const result = await processStripeWebhook(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return res.status(500).json(errorPayload('An error occurred while processing stripe webhook', 'INTERNAL_ERROR'));
  }
}
