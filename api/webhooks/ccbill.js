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

function verifyCcbillSignature(signature, rawBody, secret) {
  if (!signature || !secret) {
    return false;
  }

  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}

function resolveCcbillStatus(eventType) {
  const normalized = String(eventType || '').toLowerCase();

  if (['subscription_created', 'subscription_renewed', 'subscription_reactivated', 'active'].includes(normalized)) {
    return 'active';
  }

  if (['subscription_cancelled', 'subscription_canceled', 'cancelled', 'canceled', 'expired'].includes(normalized)) {
    return 'cancelled';
  }

  if (['subscription_suspended', 'past_due'].includes(normalized)) {
    return 'past_due';
  }

  return null;
}

export async function processCcbillWebhook(req, deps = {}) {
  const {
    updateCreatorStatusFn = updateCreatorStatus,
    webhookSecret = process.env.CCBILL_WEBHOOK_SECRET
  } = deps;

  if (req.method !== 'POST') {
    return { status: 405, body: errorPayload('Method not allowed', 'METHOD_NOT_ALLOWED') };
  }

  const rawBody = getRawBody(req);
  const signature = req.headers?.['x-ccbill-signature'];
  const signatureValid = verifyCcbillSignature(signature, rawBody, webhookSecret);
  if (!signatureValid) {
    return { status: 401, body: errorPayload('Invalid webhook signature', 'INVALID_SIGNATURE') };
  }

  const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody || '{}');
  const creatorId = payload?.creatorId || payload?.creator_id || payload?.customFields?.creatorId;
  const mappedStatus = resolveCcbillStatus(payload?.eventType || payload?.event_type || payload?.subscriptionStatus);

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
    const result = await processCcbillWebhook(req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('CCBill webhook error:', error);
    return res.status(500).json(errorPayload('An error occurred while processing ccbill webhook', 'INTERNAL_ERROR'));
  }
}
