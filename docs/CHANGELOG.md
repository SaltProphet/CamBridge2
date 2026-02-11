# CamBridge Changelog

All notable changes to the CamBridge project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Phase 3.2: Stripe Payment Integration (In Progress)
- Stripe webhook integration for payment processing
- Test mode payment flow validation
- Production payment credentials management

### Added - Phase 3.1: Manual Payments & Communications ✅ COMPLETE
- **Email Service** (`api/services/email.js`):
  - Resend SDK integration with console fallback
  - Invoice email generation with 14-day due date
  - Subscription confirmation emails
  - Payment reminder emails
  - Template variable interpolation system
  
- **Email Templates** (`api/templates/manual-invoice.html`):
  - Professional HTML invoice template
  - Payment method options display (card, transfer, crypto)
  - Dashboard integration links
  - Mobile responsive design

- **Payment Communications** (`api/creator/payment-notes.js`):
  - Creator payment notes endpoint (GET/POST)
  - Payment method tracking
  - Payment details storage
  - Note history retrieval

- **Admin Billing Management** (`api/admin/manual-billing.js`):
  - Admin-only pending payment listing
  - Payment approval workflow
  - Payment rejection workflow
  - Payment reminder sending
  - Role-based access control with `requireAdmin()`

- **Dashboard UI Enhancements**:
  - Payment status card (shows when manual + pending)
  - Payment method dropdown
  - Payment details textarea
  - Payment notes history display
  - Form submission and validation

- **Database Schema**:
  - `creator_payment_notes` table for payment communications
  - Indexed queries for performance (creator_id, created_at)
  - Cascade delete for data integrity

- **Testing Infrastructure**:
  - Comprehensive test suite for manual invoice endpoint (9/9 passing)
  - Email generation tests with fallback verification
  - Payment notes storage validation
  - Admin endpoint authorization tests

- **Comprehensive Test Report** (`PHASE3_TEST_REPORT.md`):
  - Full manual payment workflow end-to-end verification
  - Security validation checklist
  - Deployment readiness assessment

### Fixed - Phase 3.1
- Email template path resolution (moved to api/templates/)
- Admin role authorization in `api/middleware.js`
- Database schema initialization for payment notes

### Changed - Phase 3.1
- Updated `api/creator/subscribe.js` to send invoice emails
- Updated `api/creator/manual-invoice.js` to integrate email service
- Enhanced `api/db.js` with creator_payment_notes table
- Enhanced `api/middleware.js` with `requireAdmin()` function
- Enhanced `dashboard.html` with payment communications UI

---

## Previous Releases

### Phase 3A: Stabilization ✅ COMPLETE

- **CRITICAL**: Fixed `api/join-request.js` malformed control flow and syntax errors
- **CRITICAL**: Fixed `@vercel/postgres` version alignment
- Dependency versions updated for stability
- Comprehensive error payloads with error codes
- API test command: `npm run test:api`

### Phase 1-2: Core Platform ✅ COMPLETE

- Email magic-link authentication
- Creator onboarding and slug management
- Multi-room support with access codes
- Join request workflow
- Payment provider abstraction
- P2P WebRTC video via Daily.co
- Speech-to-text via Deepgram
  4. Creator lookup
  5. Creator status check
  6. User compliance (age/ToS)
  7. Ban status check
  8. Rate limiting
  9. Room lookup and validation
  10. Join mode handling
  11. Participant cap enforcement
  12. Duplicate request suppression
  13. Create join request

### Removed
- Unused `checkRateLimitFn` parameter (replaced with direct `consumeRateLimit` call)

### Documentation
- Updated `CODING_AGENT_ROADMAP.md` with stabilization completion status
- Roadmap items marked complete:
  - Phase A1: Dependency installability (COMPLETE)
  - Phase A2: Join request handler repair (COMPLETE)
  - Phase A3: API test command (COMPLETE)

---

## [1.0.0-alpha] - 2026-02-10

### Overview
First production-ready alpha release with complete Phase 1 & 2 implementation.

### Features - Phase 1: Authentication & Creator System
- ✅ Passwordless magic-link authentication
- ✅ Email-based user registration
- ✅ Age attestation (18+) requirement
- ✅ Terms of Service acceptance
- ✅ JWT-backed session management
- ✅ HttpOnly, SameSite=Strict cookies
- ✅ Creator onboarding with slug
- ✅ Creator dashboard with analytics
- ✅ Join request workflow (request → pending → approve/deny)
- ✅ Multi-factor ban system (user ID, email, IP, device)
- ✅ Single-use login tokens (SHA-256, 15-min TTL)

### Features - Phase 2: Multi-Room & Provider Abstraction
- ✅ Multi-room support with access codes
- ✅ Room types: public, private, keyed
- ✅ Join modes: open, knock, keyed
- ✅ Participant cap enforcement (by plan)
- ✅ Pluggable provider abstraction:
  - Video provider (Daily.co)
  - Email provider (Resend/Console)
  - Payments provider (Manual/CCBill/Stripe)
  - Storage provider (NoOp/S3)
- ✅ Centralized policy gates
- ✅ Kill switches for emergency controls
- ✅ Rate limiting (5 magic-links/hour, 10 join-requests/hour)
- ✅ P2P video via Daily.co WebRTC
- ✅ Speech-to-text via Deepgram

### Features - Phase 3: Payments & Subscriptions (Partial)
- ✅ Subscription database schema
- ✅ Payment provider abstraction
- ✅ Stripe webhook handler
- ✅ CCBill webhook handler
- ⚠️ Manual payment mode only (subscription UI pending)
- ⚠️ Email notifications (console logging only)

### Database
- ✅ PostgreSQL with 37 utility functions
- ✅ Schema with users, creators, rooms, join_requests, bans, login_tokens, subscriptions
- ✅ Referential integrity and cascade rules
- ✅ Support for Vercel Postgres and Neon

### Security
- ✅ CodeQL scan: PASSING (0 critical vulnerabilities)
- ✅ Passwordless auth (no password storage)
- ✅ Parameterized SQL queries (SQL injection prevention)
- ✅ Input sanitization (XSS prevention)
- ✅ Rate limiting (brute force prevention)
- ✅ Server-side authorization (policy gates)
- ✅ No PII logging (privacy-first)
- ✅ No video recording (ghost protocol)

### Limitations
- ⚠️ No automated testing infrastructure
- ⚠️ Payment integration incomplete (manual only)
- ⚠️ Email notifications not yet implemented
- ⚠️ No production deployment verified
- ⚠️ No performance testing completed
- ⚠️ Some unused code in `src/` directory (React components)

---

## Version History

| Version | Date | Status | Focus |
|---------|------|--------|-------|
| 1.0.0-alpha | 2026-02-10 | Release | Phase 1 & 2 complete |
| 0.x-dev | 2026-01-xx | Development | Initial architecture |

---

## Known Issues

### High Priority
1. **Missing subscription UI** - Dashboard widgets for subscription management
2. **Email notifications incomplete** - Only magic-links implemented
3. **Payment processing** - Manual mode only, CCBill/Stripe not live

### Medium Priority
1. **Unused code** - `src/` directory contains unused React components
2. **Unused build config** - vite.config.js, tailwind.config.js not in use
3. **Documentation drift** - Some docs reference old feature flags

### Low Priority
1. **Large monolithic files** - app.js (40KB), room.js (33KB) could be refactored
2. **No TypeScript** - Frontend could benefit from type safety
3. **Limited test coverage** - Only smoke tests, no unit/integration tests

---

## Migration Guide

### Upgrading to Unreleased

#### 1. Update dependencies
```bash
npm install
```

#### 2. Re-run API tests (if you have a database)
```bash
npm run test:api
```

#### 3. Verify join request endpoint
Test with:
```bash
curl -X POST http://localhost:3000/api/join-request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"creatorSlug":"alice"}'
```
Expected response:
```json
{
  "success": true,
  "message": "Join request created...",
  "requestId": "...",
  "status": "pending",
  "createdAt": "..."
}
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Support

For issues or questions:
1. Check [README.md](README.md) for setup instructions
2. Review [PHASE1.md](PHASE1.md) for architecture details
3. Check [AUTH_SETUP.md](AUTH_SETUP.md) for authentication flow
4. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment options

---

## License

MIT License - See [LICENSE](LICENSE) file for details
