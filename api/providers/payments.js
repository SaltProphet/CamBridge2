// Phase 0: Payments Provider Abstraction
// Allows swapping payment providers (Manual, CCBill, Stripe, etc.) via configuration

import crypto from 'crypto';

/**
 * PaymentsProvider Interface
 * All payment providers must implement these methods
 */
export class PaymentsProvider {
  /**
   * Get creator subscription status
   * @param {string} creatorId - Creator identifier
   * @returns {Promise<{success: boolean, status?: string, plan?: string, expiresAt?: Date|null, error?: string}>}
   */
  async getSubscriptionStatus(creatorId) {
    throw new Error('getSubscriptionStatus() must be implemented by provider');
  }

  /**
   * Check if creator subscription is active
   * @param {string} creatorId - Creator identifier
   * @returns {Promise<{success: boolean, active?: boolean, error?: string}>}
   */
  async isSubscriptionActive(creatorId) {
    throw new Error('isSubscriptionActive() must be implemented by provider');
  }

  /**
   * Get invoice history
   * @param {string} creatorId - Creator identifier
   * @returns {Promise<{success: boolean, invoices?: Array, error?: string}>}
   */
  async getInvoices(creatorId) {
    throw new Error('getInvoices() must be implemented by provider');
  }

  /**
   * Handle webhook from payment provider
   * @param {Object|string} payload - Webhook payload
   * @param {Object} headers - Request headers
   * @returns {Promise<{success: boolean, event?: string, error?: string}>}
   */
  async handleWebhook(payload, headers) {
    throw new Error('handleWebhook() must be implemented by provider');
  }
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeHeaders(headers = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers || {})) {
    normalized[key.toLowerCase()] = value;
  }

  return normalized;
}

/**
 * Manual Payments Provider (Off-platform)
 * For creators handling payments externally
 */
export class ManualPaymentsProvider extends PaymentsProvider {
  async getSubscriptionStatus(creatorId) {
    // Manual payments: always return active with 'manual' plan
    // Creator manages their own billing off-platform
    return {
      success: true,
      status: 'active',
      plan: 'manual',
      expiresAt: null
    };
  }

  async isSubscriptionActive(creatorId) {
    return { success: true, active: true };
  }

  async getInvoices(creatorId) {
    return { success: true, invoices: [] };
  }

  async handleWebhook(payload, headers) {
    return { success: true, event: 'ignored' };
  }
}

/**
 * Database-based Payments Provider
 * Uses database to track subscription status
 */
export class DatabasePaymentsProvider extends PaymentsProvider {
  constructor(db) {
    super();
    this.db = db;
  }

  async getSubscriptionStatus(creatorId) {
    try {
      const creator = await this.db.getCreatorById(creatorId);
      if (!creator) {
        return { success: false, error: 'Creator not found' };
      }

      return {
        success: true,
        status: creator.status || 'active',
        plan: creator.plan || 'free',
        expiresAt: creator.subscription_expires_at || null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async isSubscriptionActive(creatorId) {
    try {
      const result = await this.getSubscriptionStatus(creatorId);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const active = result.status === 'active' &&
        (!result.expiresAt || new Date(result.expiresAt) > new Date());

      return { success: true, active };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getInvoices(creatorId) {
    return { success: true, invoices: [] };
  }

  async handleWebhook(payload, headers) {
    try {
      const provider = String(
        headers?.['x-payments-provider'] ||
        payload?.provider ||
        'database'
      ).toLowerCase();

      const externalEventId = payload?.eventId || payload?.event_id || payload?.id || null;
      const externalSubscriptionId = payload?.subscriptionId || payload?.subscription_id || payload?.externalSubscriptionId || null;

      if (!externalEventId) {
        return { success: false, error: 'Missing external event identifier' };
      }

      if (this.db?.hasProcessedWebhookEvent) {
        const alreadyProcessed = await this.db.hasProcessedWebhookEvent(provider, externalEventId);
        if (alreadyProcessed) {
          return { success: true, event: 'duplicate_ignored', idempotent: true };
        }
      }

      let creator = null;
      if (externalSubscriptionId && this.db?.getCreatorByExternalSubscriptionId) {
        creator = await this.db.getCreatorByExternalSubscriptionId(provider, externalSubscriptionId);
      }

      if (!creator && payload?.creatorId && this.db?.getCreatorById) {
        creator = await this.db.getCreatorById(payload.creatorId);
      }

      if (!creator) {
        if (this.db?.recordProcessedWebhookEvent) {
          await this.db.recordProcessedWebhookEvent(provider, externalEventId, externalSubscriptionId, null);
        }
        return { success: true, event: 'ignored_no_creator_match', idempotent: false };
      }

      const patch = {
        subscription_provider: provider,
        subscription_external_id: externalSubscriptionId || creator.subscription_external_id,
        subscription_status: payload?.subscriptionStatus || payload?.status || creator.subscription_status || 'inactive'
      };

      if (Object.prototype.hasOwnProperty.call(payload || {}, 'subscriptionStartedAt')) {
        patch.subscription_started_at = payload.subscriptionStartedAt;
      }
      if (Object.prototype.hasOwnProperty.call(payload || {}, 'subscriptionExpiresAt')) {
        patch.subscription_expires_at = payload.subscriptionExpiresAt;
      }
      if (Object.prototype.hasOwnProperty.call(payload || {}, 'subscriptionNextBillingAt')) {
        patch.subscription_next_billing_at = payload.subscriptionNextBillingAt;
      }
      if (Object.prototype.hasOwnProperty.call(payload || {}, 'subscriptionCanceledAt')) {
        patch.subscription_canceled_at = payload.subscriptionCanceledAt;
      }

      const updated = await this.db.updateCreatorSubscription(creator.id, patch);
      if (!updated?.success) {
        return { success: false, error: updated?.error || 'Failed to update creator subscription' };
      }

      if (this.db?.recordProcessedWebhookEvent) {
        await this.db.recordProcessedWebhookEvent(provider, externalEventId, externalSubscriptionId, creator.id);
      }

      return {
        success: true,
        event: payload?.type || payload?.eventType || 'processed',
        creatorId: creator.id,
        idempotent: false
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * CCBill Payments Provider
 */
export class CCBillPaymentsProvider extends PaymentsProvider {
  constructor({ accountId, subAccountId, flexFormsId, salt, fetchImpl = fetch }) {
    super();
    this.accountId = accountId;
    this.subAccountId = subAccountId;
    this.flexFormsId = flexFormsId;
    this.salt = salt;
    this.fetchImpl = fetchImpl;
    this.apiBaseUrl = process.env.CCBILL_API_BASE_URL || 'https://api.ccbill.com';
  }

  async request(pathname, { method = 'GET', body } = {}) {
    if (!this.accountId || !this.subAccountId || !this.flexFormsId || !this.salt) {
      return { success: false, error: 'CCBill provider is not configured' };
    }

    try {
      const url = new URL(pathname, this.apiBaseUrl);
      const requestBody = body ? JSON.stringify(body) : undefined;
      const response = await this.fetchImpl(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CCBill-Account-Id': this.accountId,
          'X-CCBill-Subaccount-Id': this.subAccountId,
          'X-CCBill-FlexForms-Id': this.flexFormsId,
          'X-CCBill-Signature': crypto
            .createHash('sha256')
            .update(`${method}:${url.pathname}:${this.salt}`)
            .digest('hex')
        },
        body: requestBody
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          success: false,
          error: data?.error || `CCBill API request failed with status ${response.status}`
        };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getSubscriptionStatus(creatorId) {
    if (!creatorId) {
      return { success: false, error: 'creatorId is required' };
    }

    const result = await this.request(`/v1/subscriptions/${encodeURIComponent(creatorId)}`);
    if (!result.success) {
      return result;
    }

    const subscription = result.data?.subscription;
    return {
      success: true,
      status: subscription?.status || 'inactive',
      plan: subscription?.plan || 'unknown',
      expiresAt: normalizeDate(subscription?.expiresAt)
    };
  }

  async isSubscriptionActive(creatorId) {
    const result = await this.getSubscriptionStatus(creatorId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const active = result.status === 'active' &&
      (!result.expiresAt || new Date(result.expiresAt) > new Date());

    return { success: true, active };
  }

  async getInvoices(creatorId) {
    if (!creatorId) {
      return { success: false, error: 'creatorId is required' };
    }

    const result = await this.request(`/v1/subscriptions/${encodeURIComponent(creatorId)}/invoices`);
    if (!result.success) {
      return result;
    }

    return { success: true, invoices: result.data?.invoices || [] };
  }

  async handleWebhook(payload, headers) {
    try {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { success: false, error: 'Invalid webhook payload' };
      }

      const normalizedHeaders = normalizeHeaders(headers);
      const incomingSignature = normalizedHeaders['x-ccbill-signature'];
      if (!incomingSignature) {
        return { success: false, error: 'Missing CCBill webhook signature' };
      }

      if (!this.salt) {
        return { success: false, error: 'CCBill webhook secret is not configured' };
      }

      const subscriptionId = payload.subscriptionId;
      const eventType = payload.eventType;
      if (!subscriptionId || !eventType) {
        return { success: false, error: 'Malformed CCBill webhook payload' };
      }

      const expectedSignature = crypto
        .createHash('sha256')
        .update(`${subscriptionId}:${eventType}:${this.salt}`)
        .digest('hex');

      if (incomingSignature !== expectedSignature) {
        return { success: false, error: 'Invalid CCBill webhook signature' };
      }

      return {
        success: true,
        event: eventType,
        creatorId: payload.creatorId || subscriptionId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Stripe Payments Provider
 */
export class StripePaymentsProvider extends PaymentsProvider {
  constructor({ secretKey, webhookSecret, fetchImpl = fetch }) {
    super();
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
    this.fetchImpl = fetchImpl;
    this.apiBaseUrl = 'https://api.stripe.com';
  }

  resolvePlanPricing(plan) {
    const normalized = String(plan || '').toLowerCase();
    const pricing = {
      pro: {
        amount: 3000,
        currency: 'usd',
        name: 'CamBridge Pro Creator Plan',
        description: 'Pro Creator - $30/month'
      },
      enterprise: {
        amount: 9900,
        currency: 'usd',
        name: 'CamBridge Enterprise Creator Plan',
        description: 'Enterprise Creator - $99/month'
      }
    };

    return pricing[normalized] || null;
  }

  async request(pathname, params = {}) {
    if (!this.secretKey) {
      return { success: false, error: 'Stripe provider is not configured' };
    }

    try {
      const body = new URLSearchParams(params);
      const response = await this.fetchImpl(`${this.apiBaseUrl}${pathname}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          success: false,
          error: data?.error?.message || `Stripe API request failed with status ${response.status}`
        };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async subscribeCreator({ creatorId, creatorEmail, plan, successUrl, cancelUrl }) {
    if (!creatorId || !creatorEmail || !plan) {
      return { success: false, error: 'creatorId, creatorEmail, and plan are required' };
    }

    const pricing = this.resolvePlanPricing(plan);
    if (!pricing) {
      return { success: false, error: `Unsupported plan: ${plan}` };
    }

    if (!successUrl || !cancelUrl) {
      return { success: false, error: 'successUrl and cancelUrl are required' };
    }

    const priceId = String(
      plan === 'enterprise'
        ? process.env.STRIPE_PRICE_ENTERPRISE || ''
        : process.env.STRIPE_PRICE_PRO || ''
    );

    const params = {
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: creatorEmail,
      client_reference_id: creatorId,
      'metadata[creatorId]': creatorId,
      'metadata[plan]': plan,
      'line_items[0][quantity]': '1'
    };

    if (priceId) {
      params['line_items[0][price]'] = priceId;
    } else {
      params['line_items[0][price_data][currency]'] = pricing.currency;
      params['line_items[0][price_data][product_data][name]'] = pricing.name;
      params['line_items[0][price_data][product_data][description]'] = pricing.description;
      params['line_items[0][price_data][recurring][interval]'] = 'month';
      params['line_items[0][price_data][unit_amount]'] = String(pricing.amount);
    }

    const result = await this.request('/v1/checkout/sessions', params);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      checkoutUrl: result.data?.url || null,
      sessionId: result.data?.id || null,
      provider: 'stripe'
    };
  }

  async cancelSubscription({ externalSubscriptionId }) {
    if (!externalSubscriptionId) {
      return { success: false, error: 'externalSubscriptionId is required' };
    }

    const result = await this.request(`/v1/subscriptions/${externalSubscriptionId}`, {
      cancel_at_period_end: 'true'
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      subscriptionId: result.data?.id || externalSubscriptionId,
      cancelAtPeriodEnd: result.data?.cancel_at_period_end || true,
      status: result.data?.status || 'canceled'
    };
  }

  async getCustomerByCreatorId(creatorId) {
    const customerSearch = await this.request('/v1/customers/search', {
      query: `metadata['creator_id']:'${creatorId}'`,
      limit: '1'
    });

    if (!customerSearch.success) {
      return customerSearch;
    }

    const customer = customerSearch.data?.data?.[0];
    if (!customer) {
      return { success: true, customer: null };
    }

    return { success: true, customer };
  }

  async getSubscriptionStatus(creatorId) {
    if (!creatorId) {
      return { success: false, error: 'creatorId is required' };
    }

    const customerResult = await this.getCustomerByCreatorId(creatorId);
    if (!customerResult.success) {
      return { success: false, error: customerResult.error };
    }

    if (!customerResult.customer) {
      return { success: true, status: 'inactive', plan: null, expiresAt: null };
    }

    const subscriptionsResult = await this.request('/v1/subscriptions', {
      customer: customerResult.customer.id,
      status: 'all',
      limit: '1'
    });

    if (!subscriptionsResult.success) {
      return { success: false, error: subscriptionsResult.error };
    }

    const subscription = subscriptionsResult.data?.data?.[0];
    if (!subscription) {
      return { success: true, status: 'inactive', plan: null, expiresAt: null };
    }

    return {
      success: true,
      status: subscription.status || 'inactive',
      plan: subscription.items?.data?.[0]?.price?.nickname || subscription.items?.data?.[0]?.price?.id || null,
      expiresAt: normalizeDate(subscription.current_period_end ? subscription.current_period_end * 1000 : null)
    };
  }

  async isSubscriptionActive(creatorId) {
    const result = await this.getSubscriptionStatus(creatorId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const activeStatuses = new Set(['active', 'trialing']);
    const active = activeStatuses.has(result.status) &&
      (!result.expiresAt || new Date(result.expiresAt) > new Date());

    return { success: true, active };
  }

  async getInvoices(creatorId) {
    if (!creatorId) {
      return { success: false, error: 'creatorId is required' };
    }

    const customerResult = await this.getCustomerByCreatorId(creatorId);
    if (!customerResult.success) {
      return { success: false, error: customerResult.error };
    }

    if (!customerResult.customer) {
      return { success: true, invoices: [] };
    }

    const invoicesResult = await this.request('/v1/invoices', {
      customer: customerResult.customer.id,
      limit: '20'
    });

    if (!invoicesResult.success) {
      return { success: false, error: invoicesResult.error };
    }

    const invoices = (invoicesResult.data?.data || []).map((invoice) => ({
      id: invoice.id,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      createdAt: normalizeDate(invoice.created ? invoice.created * 1000 : null)
    }));

    return { success: true, invoices };
  }

  async handleWebhook(payload, headers) {
    try {
      const normalizedHeaders = normalizeHeaders(headers);
      const signatureHeader = normalizedHeaders['stripe-signature'];
      if (!signatureHeader) {
        return { success: false, error: 'Missing Stripe webhook signature' };
      }

      if (!this.webhookSecret) {
        return { success: false, error: 'Stripe webhook secret is not configured' };
      }

      const rawPayload =
        typeof payload === 'string'
          ? payload
          : typeof payload?.rawBody === 'string'
            ? payload.rawBody
            : JSON.stringify(payload);

      if (!rawPayload || rawPayload === 'undefined') {
        return { success: false, error: 'Invalid webhook payload' };
      }

      const parsedSignature = signatureHeader
        .split(',')
        .map((part) => part.trim())
        .reduce((acc, part) => {
          const [key, value] = part.split('=');
          acc[key] = value;
          return acc;
        }, {});

      if (!parsedSignature.t || !parsedSignature.v1) {
        return { success: false, error: 'Malformed Stripe webhook signature' };
      }

      const signedPayload = `${parsedSignature.t}.${rawPayload}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(parsedSignature.v1, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        return { success: false, error: 'Invalid Stripe webhook signature' };
      }

      let event;
      try {
        event = typeof payload === 'string'
          ? JSON.parse(payload)
          : payload && typeof payload === 'object' && typeof payload.rawBody === 'string'
            ? JSON.parse(payload.rawBody)
            : payload;
      } catch (error) {
        return { success: false, error: 'Malformed Stripe webhook payload' };
      }

      if (!event || typeof event !== 'object' || !event.type) {
        return { success: false, error: 'Malformed Stripe webhook payload' };
      }

      return {
        success: true,
        event: event.type,
        eventId: event.id || null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Factory function to get the configured payments provider
 */
export function getPaymentsProvider(db = null) {
  const provider = (process.env.PAYMENTS_PROVIDER || 'manual').toLowerCase();

  switch (provider) {
    case 'manual':
      return new ManualPaymentsProvider();
    case 'database':
      return new DatabasePaymentsProvider(db);
    case 'ccbill':
      return new CCBillPaymentsProvider({
        accountId: process.env.CCBILL_ACCOUNT_ID,
        subAccountId: process.env.CCBILL_SUBACCOUNT_ID,
        flexFormsId: process.env.CCBILL_FLEXFORMS_ID,
        salt: process.env.CCBILL_SALT
      });
    case 'stripe':
      return new StripePaymentsProvider({
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
      });
    default:
      console.warn(`Unknown PAYMENTS_PROVIDER: ${provider}, defaulting to Manual`);
      return new ManualPaymentsProvider();
  }
}
