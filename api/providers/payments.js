// Phase 0: Payments Provider Abstraction
// Allows swapping payment providers (Manual, CCBill, Segpay, Stripe, etc.) via configuration

/**
 * PaymentsProvider Interface
 * All payment providers must implement these methods
 */
export class PaymentsProvider {
  /**
   * Get creator subscription status
   * @param {string} creatorId - Creator identifier
   * @returns {Promise<{success: boolean, status?: string, plan?: string, expiresAt?: Date, error?: string}>}
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
   * @param {Object} payload - Webhook payload
   * @param {Object} headers - Request headers
   * @returns {Promise<{success: boolean, event?: string, error?: string}>}
   */
  async handleWebhook(payload, headers) {
    throw new Error('handleWebhook() must be implemented by provider');
  }
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
      expiresAt: null // No expiration for manual
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
      // Get creator from database with subscription info
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

      // Check if status is active and not expired
      const active = result.status === 'active' && 
                    (!result.expiresAt || new Date(result.expiresAt) > new Date());
      
      return { success: true, active };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getInvoices(creatorId) {
    // For database provider, invoices would be stored in a separate table
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
 * CCBill Payments Provider (placeholder for future implementation)
 */
export class CCBillPaymentsProvider extends PaymentsProvider {
  constructor(clientId, clientSecret) {
    super();
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async getSubscriptionStatus(creatorId) {
    // TODO: Implement CCBill API integration
    return { success: false, error: 'CCBill provider not yet implemented' };
  }

  async isSubscriptionActive(creatorId) {
    return { success: false, error: 'CCBill provider not yet implemented' };
  }

  async getInvoices(creatorId) {
    return { success: false, error: 'CCBill provider not yet implemented' };
  }

  async handleWebhook(payload, headers) {
    return { success: false, error: 'CCBill provider not yet implemented' };
  }
}

/**
 * Segpay Payments Provider (placeholder for future implementation)
 */
export class SegpayPaymentsProvider extends PaymentsProvider {
  constructor(clientId, clientSecret) {
    super();
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async getSubscriptionStatus(creatorId) {
    // TODO: Implement Segpay API integration
    return { success: false, error: 'Segpay provider not yet implemented' };
  }

  async isSubscriptionActive(creatorId) {
    return { success: false, error: 'Segpay provider not yet implemented' };
  }

  async getInvoices(creatorId) {
    return { success: false, error: 'Segpay provider not yet implemented' };
  }

  async handleWebhook(payload, headers) {
    return { success: false, error: 'Segpay provider not yet implemented' };
  }
}

/**
 * Factory function to get the configured payments provider
 */
export function getPaymentsProvider(db = null) {
  const provider = process.env.PAYMENTS_PROVIDER || 'manual';
  const mode = process.env.PAYMENTS_MODE || 'offplatform_flat';

  switch (provider.toLowerCase()) {
    case 'manual':
      return new ManualPaymentsProvider();
    case 'database':
      return new DatabasePaymentsProvider(db);
    case 'ccbill':
      return new CCBillPaymentsProvider(
        process.env.CCBILL_CLIENT_ID,
        process.env.CCBILL_CLIENT_SECRET
      );
    case 'segpay':
      return new SegpayPaymentsProvider(
        process.env.SEGPAY_CLIENT_ID,
        process.env.SEGPAY_CLIENT_SECRET
      );
    // Add more providers here as needed:
    // case 'stripe':
    //   return new StripePaymentsProvider(process.env.STRIPE_API_KEY);
    default:
      console.warn(`Unknown PAYMENTS_PROVIDER: ${provider}, defaulting to Manual`);
      return new ManualPaymentsProvider();
  }
}
