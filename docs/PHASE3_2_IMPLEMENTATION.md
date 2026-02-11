# Phase 3.2 Implementation Plan: Stripe Payment Integration

**Started:** February 11, 2026  
**Target Completion:** February 18, 2026 (1 week)  
**Status:** In Progress - MVP Foundation Laid

---

## Overview

Phase 3.2 integrates Stripe as the primary payment processor for CamBridge, enabling creators to pay for subscriptions via credit card with automated recurring billing.

### What's Done
- ✅ `api/providers/stripe.js` - Payment provider with checkout session creation
- ✅ `api/webhooks/stripe-webhook.js` - Full webhook handler (session completed, invoice paid, failed, sub deleted)
- ✅ `api/webhooks/stripe.test.js` - Comprehensive test suite (12 tests)
- ✅ Planning document (this file)

### What's Next
- 🔄 Update `api/creator/subscribe.js` to route Stripe payment
- 🔄 Create Stripe payment page UI (`subscribe-stripe.html`)
- 🔄 Database schema for webhook event tracking
- 🔄 Email integration (confirmation, failure notifications)
- 🔄 End-to-end testing and validation

---

## Implementation Checklist

### Phase 3.2.1: Core Integration

#### Task 1: Subscribe Endpoint Updates
- [ ] Update `api/creator/subscribe.js`:
  - [ ] Add conditional routing by provider type
  - [ ] If provider === 'stripe': call `createCheckoutSession()`
  - [ ] Return Stripe checkout URL instead of subscription object
  - [ ] Add validation for Stripe mode (test vs prod)
  - [ ] Log provider routing for debugging

#### Task 2: Database Schema Enhancements
- [ ] Add `webhook_events` table:
  ```sql
  CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50),           -- 'stripe', 'ccbill', etc.
    event_type VARCHAR(100),        -- 'checkout.session.completed', etc.
    external_event_id VARCHAR(255), -- Stripe event ID
    external_object_id VARCHAR(255),-- Session ID, subscription ID, etc.
    creator_id UUID REFERENCES creators(id),
    metadata JSONB,
    status VARCHAR(20),             -- 'received', 'processed', 'failed'
    error_message TEXT,
    retry_count INT DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [ ] Add indexes for query performance:
  - `provider, created_at DESC`
  - `creator_id, created_at DESC`
  - `external_event_id (unique)`

#### Task 3: Stripe Configuration Endpoints
- [ ] Create `api/admin/stripe-config.js`:
  - [ ] GET: Return Stripe mode and configuration status
  - [ ] POST: Allow updating webhook secret (admin only)
  - [ ] Validate webhook secret format
  - [ ] Log configuration changes

#### Task 4: Webhook Route Integration
- [ ] Create/register webhook route in main API:
  - [ ] `POST /api/webhooks/stripe` → `handleStripeWebhook()`
  - [ ] Raw body parsing for signature verification
  - [ ] Error handling and 200 response to prevent retries
  - [ ] Async event processing (don't block response)

### Phase 3.2.2: Frontend & UX

#### Task 5: Stripe Payment Page
- [ ] Update `subscribe.html`:
  - [ ] Add "Stripe" payment option to provider selection
  - [ ] Create checkout form with:
    - [ ] Card element (via Stripe Elements)
    - [ ] Email field (pre-filled from auth)
    - [ ] Plan display (pro $30 or enterprise $99)
    - [ ] Submit button
  - [ ] Handle Stripe checkout redirect
  - [ ] Display payment processing state

#### Task 6: Success & Error Pages
- [ ] Create `subscribe-success.html`:
  - [ ] Display subscription confirmation
  - [ ] Show next billing date
  - [ ] Link to dashboard
  - [ ] Show invoice details
  
- [ ] Create `subscribe-error.html`:
  - [ ] Display error message from Stripe
  - [ ] Show error code for support
  - [ ] Provide retry link
  - [ ] Link to contact support

#### Task 7: Dashboard Updates
- [ ] Show Stripe invoice history:
  - [ ] List recent invoices with dates and amounts
  - [ ] Link to stripe dashboard if available
  - [ ] Show next billing date

### Phase 3.2.3: Testing & Validation

#### Task 8: Unit Tests
- [ ] Stripe provider tests (already created - 12 tests):
  - [ ] Checkout session creation
  - [ ] Webhook signature verification
  - [ ] Event processing
  - [ ] Error handling
- [ ] Webhook handler tests:
  - [ ] Happy path payment success
  - [ ] Payment failure scenarios
  - [ ] Signature rejections
  - [ ] Missing/malformed events

#### Task 9: Integration Testing
- [ ] Test full payment flow:
  - [ ] User selects Stripe payment
  - [ ] Redirected to Stripe checkout
  - [ ] Complete payment in test mode
  - [ ] Webhook received and processed
  - [ ] Subscription status changed to ACTIVE
  - [ ] Dashboard shows active subscription
  
- [ ] Test error scenarios:
  - [ ] Payment declined
  - [ ] Timeout during checkout
  - [ ] Webhook signature mismatch
  - [ ] Duplicate webhook events

#### Task 10: Test Mode Validation
- [ ] Use Stripe test credit cards:
  - [ ] 4242 4242 4242 4242 - Success
  - [ ] 4000 0000 0000 0002 - Declined
  - [ ] 4000 0000 0000 0127 - 3D Secure
  
- [ ] Webhook testing:
  - [ ] Use Stripe CLI for local webhook testing
  - [ ] Simulate events from Stripe Dashboard
  - [ ] Verify webhook events are processed

### Phase 3.2.4: Documentation & Deployment

#### Task 11: Admin Documentation
- [ ] Create `STRIPE_SETUP.md`:
  - [ ] How to create Stripe account
  - [ ] Test mode vs production configuration
  - [ ] API key management
  - [ ] Webhook setup steps
  - [ ] Testing with Stripe CLI

#### Task 12: Runbooks
- [ ] Create troubleshooting guide:
  - [ ] What to do if webhook failed
  - [ ] How to manually approve failed payments
  - [ ] How to refund a payment
  - [ ] How to test webhook locally

#### Task 13: Environment Configuration
- [ ] Document environment variables:
  ```env
  STRIPE_SECRET_KEY=sk_test_xxx   # or sk_live_xxx
  STRIPE_PUBLIC_KEY=pk_test_xxx   # or pk_live_xxx
  STRIPE_WEBHOOK_SECRET=whsec_xxx
  STRIPE_MODE=test                # or 'prod'
  ```
- [ ] Add to `.env.example`

---

## File Structure

```
api/
├── providers/
│   ├── stripe.js                      ✅ CREATED
│   ├── stripe-config.js               ⏳ TO CREATE
│   └── ...other providers...
│
├── webhooks/
│   ├── stripe-webhook.js              ✅ CREATED
│   ├── stripe.test.js                 ✅ CREATED
│   ├── stripe.js                      ✅ EXISTS (old)
│   └── ...other webhooks...
│
├── admin/
│   └── stripe-config.js               ⏳ TO CREATE
│
├── creator/
│   ├── subscribe.js                   ⏳ UPDATE
│   └── ...
│
└── db.js                              ⏳ UPDATE (add webhook_events table)

Root:
├── subscribe.html                     ⏳ UPDATE
├── subscribe-success.html             ⏳ CREATE
├── subscribe-error.html               ⏳ CREATE
├── STRIPE_SETUP.md                    ⏳ CREATE
├── PHASE3_2_IMPLEMENTATION.md         ⏳ CREATE (this file)
└── ...
```

---

## Architecture Flow

```
Creator Dashboard
    ↓
[Select Payment Provider]
    ├→ Manual
    │   └→ /api/creator/subscribe?provider=manual
    │       → Creates PENDING subscription
    │       → Sends invoice email
    │
    ├→ Stripe (NEW)
    │   └→ /api/creator/subscribe?provider=stripe
    │       → Calls createCheckoutSession()
    │       → Returns { url: "https://checkout.stripe.com/..." }
    │       → Redirects to Stripe checkout
    │
    └→ CCBill (Phase 3.3)
        └→ /api/creator/subscribe?provider=ccbill
            → Generates CCBill form
            → Posts to CCBill

[Stripe Checkout Page]
    ↓
Creator enters card details
    ↓
Payment processed
    ↓
Stripe generates event
    ↓
Webhook → POST /api/webhooks/stripe
    ↓
handleStripeWebhook() processes event
    ↓
Database updated:
├→ subscription status → ACTIVE
├→ next_billing_at → +1 month
└→ webhook_events logged

Dashboard shows:
├→ "Active Subscription"
├→ "Stripe - Recurring Monthly"
└→ "Next Billing: [date]"
```

---

## Key Decisions

### Q: Why separate stripe-webhook.js from stripe.js?
**A:** `stripe.js` contains provider implementation (API calls). `stripe-webhook.js` handles webhook routing and database updates. Keeps concerns separated and testable.

### Q: Why create webhook_events table?
**A:** Audit trail for payment events. Helps debug webhook failures and replay events if needed.

### Q: Why test mode first?
**A:** Safer iteration. Stripe test keys let us develop without real money. Easy to switch to production keys.

### Q: How do we handle webhook failures?
**A:** Event is logged in `webhook_events` with error message. Admin can query failed events and manually retry. Phase 4 will add auto-retry logic.

### Q: What about refunds?
**A:** Phase 4 scope. For MVP, admin manually processes refunds via Stripe dashboard.

---

## Success Criteria

Before moving to Phase 3.3 (CCBill):

- ✅ `createCheckoutSession()` returns valid Stripe URLs
- ✅ Webhook signature verification working without false positives
- ✅ `checkout.session.completed` event updates subscription to ACTIVE
- ✅ `invoice.paid` event updates next_billing_at
- ✅ `invoice.payment_failed` event logs failure
- ✅ Dashboard shows active Stripe subscriptions
- ✅ All tests passing (25+ tests total)
- ✅ Payment flow tested end-to-end with Stripe test cards
- ✅ Webhook handler tested with Stripe CLI
- ✅ Admin can view webhook event history
- ✅ Documentation complete

---

## Testing Strategy

### Local Testing (Without Real Stripe Account)
```bash
# Run tests
node api/webhooks/stripe.test.js

# Expected output:
# ✅ 12 tests passing
# ✅ Webhook signature verification working
# ✅ Event processing validated
```

### Staging Testing (With Stripe Test Mode Account)
```bash
# 1. Create Stripe account
# 2. Get test mode API keys
# 3. Set environment variables:
export STRIPE_SECRET_KEY=sk_test_xxx
export STRIPE_PUBLIC_KEY=pk_test_xxx  
export STRIPE_WEBHOOK_SECRET=whsec_xxx

# 4. Deploy to staging
# 5. Use Stripe test card: 4242 4242 4242 4242
# 6. Verify webhook processing with Stripe CLI

stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

### Production Testing (Before Launch)
- Feature flags to route percentage of users to Stripe
- Smoke tests for payment completion
- Monitor webhook processing latency
- Ready rollback plan if needed

---

## Timeline

| Date | Task | Status |
|------|------|--------|
| Feb 11 | Provider skeleton + tests created | ✅ |
| Feb 12 | Subscribe endpoint updated | ⏳ |
| Feb 13 | Database schema + webhook routes | ⏳ |
| Feb 14 | Frontend (subscribe page + success/error) | ⏳ |
| Feb 15 | Email integration + configuration | ⏳ |
| Feb 16 | Full integration testing | ⏳ |
| Feb 17 | Admin docs + runbooks | ⏳ |
| Feb 18 | Final validation → Phase 3.3 ready | ⏳ |

---

## Blockers & Risks

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Webhook signature verification fails | Low | Comprehensive tests + Stripe SDK usage |
| Test mode settings not matching prod | Medium | Clear documentation + environment checks |
| Stripe API rate limits | Low | Implemented retry logic + error handling |
| Webhook event duplication | Medium | Idempotent event handlers + ID tracking |
| Payment delay between checkout and webhook | Medium | Dashboard polling + timeout handling |

---

## Next Phase (3.3) Preview

After Phase 3.2 is complete:
- Add CCBill as backup payment processor
- Implement payment provider failover
- Add invoice PDF generation
- Automated payment reminders
- Chargeback handling

---

## Commands for Quick Reference

```bash
# Run Stripe tests only
node api/webhooks/stripe.test.js

# Run all tests
npm run test:api

# Check Stripe configuration
curl http://localhost:3000/api/admin/stripe-config

# Test webhook locally (requires Stripe CLI)
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

---

**Last Updated:** February 11, 2026  
**Next Review:** After webhook integration complete (Feb 12, 2026)
