# CamBridge: Repo Status + Coding-Agent Roadmap

_Last updated: 2026-02-11_

## 1) Current Repository State (Quick Snapshot)

- **Branch:** `work`
- **Recent activity:** multiple merged PRs focused on creator subscriptions/payment plumbing.
- **Baseline tests:** `npm test` passes (custom top-level suite).
- **Node test modules:** partially failing due environment/dependency + one syntax-level issue.

### What looks complete or near-complete

- Passwordless auth flow + creator onboarding + moderation/join-request architecture are already implemented across `api/` and dashboard pages.
- Subscription-related endpoints and webhook handlers exist (`api/creator/subscription.js`, `api/creator/subscribe.js`, `api/creator/cancel.js`, `api/webhooks/stripe.js`, `api/webhooks/ccbill.js`).
- Payment provider abstraction exists with provider selection by env (`api/providers/payments.js`).

### Current blockers discovered during checks

1. **Dependency/version mismatch in package metadata**
   - `package.json` references `@vercel/postgres: ^0.12.0`
   - `package-lock.json` is pinned to `@vercel/postgres: ^0.10.0`
   - `npm install` currently fails (`ETARGET` for `^0.12.0`).

2. **Join request handler appears syntactically broken**
   - `api/join-request.js` has malformed control flow near the success response and references out-of-scope error metadata in catch logging.
   - This currently causes `node --test ... api/join-request.test.js` to fail with `SyntaxError: Illegal return statement`.

3. **Roadmap docs are partly stale vs implementation reality**
   - `MVP_ROADMAP.md` still marks Phase 3 items as TODO even though subscription UI/endpoints/webhooks now exist in repo.

---

## 2) Recommended Implementation Roadmap (for Copilot or Codex)

## Phase A — Stabilize Build/Test Baseline (do this first)

### A1. Repair dependency installability
- Align `package.json` and `package-lock.json` on a resolvable `@vercel/postgres` version.
- Run a clean install and commit lockfile updates.

**Definition of done**
- `npm install` succeeds on fresh clone.
- No lockfile drift after install.

### A2. Fix `api/join-request.js` execution path
- Repair malformed `processJoinRequest` return path and bracket structure.
- Ensure handler returns `{status, body}` consistently.
- Fix catch logging to avoid undefined symbols.

**Definition of done**
- `node --test api/join-request.test.js` passes.

### A3. Establish deterministic API test command
- Add a script such as `"test:api": "node --test api/**/*.test.js"` (or curated list).
- Keep top-level `npm test` as smoke test if desired.

**Definition of done**
- One command validates endpoint/provider behavior without manual file listing.

---

## Phase B — Harden Subscription & Webhook Domain

### B1. Ensure webhook idempotency is consistently enforced
- Standardize use of processed-event tracking across Stripe/CCBill handlers and provider layer.
- Make duplicate-event behavior explicit in test expectations.

### B2. Validate subscription state transitions
- Confirm allowed transitions (`inactive -> active -> past_due/cancelled`) and guard invalid regressions.
- Add unit tests for transition edges.

### B3. Improve error taxonomy
- Normalize error codes and payload shape across creator subscription endpoints.

---

## Phase C — Documentation/Operational Accuracy

### C1. Update roadmap docs to reflect actual implemented scope
- Sync `MVP_ROADMAP.md`, `REPO_ANALYSIS.md`, and summary docs with present code.
- Split “implemented behind feature flags” vs “production-verified.”

### C2. Add "known issues" section
- Track remaining infra assumptions (provider credentials, webhook secrets, DB migration status, etc.).

---

## 3) Ready-to-Use Agent Backlog (Copilot/Codex Task Cards)

1. **Task Card: Dependency Baseline Repair**  
   "Align `@vercel/postgres` versions in package metadata, run install, and commit lockfile changes."

2. **Task Card: Join Request Endpoint Recovery**  
   "Fix `api/join-request.js` malformed return/control flow and make `api/join-request.test.js` green."

3. **Task Card: Unified API Test Script**  
   "Add `npm run test:api` and wire CI-ready Node test execution for all API tests."

4. **Task Card: Webhook Idempotency Matrix Tests**  
   "Add tests covering duplicate stripe/ccbill events and expected no-op behavior."

5. **Task Card: Roadmap & Status Document Refresh**  
   "Update roadmap documents to reflect completed subscription/webhook work and remaining launch blockers."

---

## 4) Suggested Agent Workflow (Copilot or Codex)

1. **Plan mode first:** produce patch plan + touched files list.
2. **Patch in narrow slices:** one task card per commit.
3. **Run tests after each slice:** avoid large speculative changes.
4. **Write migration notes in commit body:** especially for dependency/version adjustments.
5. **Open PR with risk checklist:** include rollback strategy for payment/webhook changes.

---

## 5) Suggested Branch + Commit Sequence

- **Suggested branch name:** `stabilize/test-baseline-and-roadmap-sync`
- **Suggested commits:**
  1. `fix(deps): align @vercel/postgres version with lockfile and restore npm install`
  2. `fix(api): repair join-request handler control flow and response path`
  3. `test(api): add unified node --test script for endpoint suites`
  4. `docs(roadmap): sync MVP roadmap with implemented subscription/webhook scope`

