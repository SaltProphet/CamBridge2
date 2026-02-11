import crypto from 'crypto';
import { updateCreatorStatus } from '../db.js';

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

  return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(expectedSignature));
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

export async function processStripeWebhook(req, deps = {}) {
  const {
    updateCreatorStatusFn = updateCreatorStatus,
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
  const creatorId = payload?.data?.object?.metadata?.creatorId || payload?.data?.object?.metadata?.creator_id;
  const mappedStatus = resolveStripeStatus(eventType, payload);

  if (!creatorId || !mappedStatus) {
    return { status: 200, body: { received: true, ignored: true } };
  }

  const updateResult = await updateCreatorStatusFn(creatorId, mappedStatus);
  if (!updateResult?.success) {
    return { status: 500, body: errorPayload('Failed to persist webhook event', 'WEBHOOK_PERSIST_FAILED') };
  }

  return { status: 200, body: { received: true, creatorId, status: mappedStatus } };
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
