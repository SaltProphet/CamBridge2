# CamBridge MVP Release Checklist

This checklist is focused on the MVP auth + access-control flows implemented in Phase 1/2.

## Required environment variables (must be set before smoke testing)

### Critical secrets (fail-fast)
- `JWT_SECRET` (required at module load by `api/middleware.js`; app throws if missing).
- Email provider secrets:
  - `EMAIL_PROVIDER` (default: `resend`)
  - For `resend`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (validated by `api/providers/email.js` + `api/env.js`).
- Video provider secrets:
  - `VIDEO_PROVIDER` (default: `daily`)
  - For `daily`: `DAILY_API_KEY` (validated by `api/providers/video.js` + `api/env.js`).

### Supporting vars (recommended)
- `APP_BASE_URL` (used for magic-link callback URL generation).
- `PAYMENTS_PROVIDER`, `PAYMENTS_MODE` (join policy behavior).

## MVP release checklist

### 1) Magic-link happy path
- [ ] `POST /api/auth/start` returns `200` with success payload.
- [ ] Magic-link email (or console provider output) includes callback URL.
- [ ] `GET /api/auth/callback?token=...` sets `auth_token` HttpOnly cookie and redirects to `returnTo` (or `/dashboard`).
- [ ] New user is auto-created if email does not exist.
- [ ] Structured policy logs emitted with `requestId`, endpoint, actor id, and decision reason.

### 2) Age / ToS acceptance flow
- [ ] User without `tos_accepted_at` / `age_attested_at` gets blocked from join request.
- [ ] API response includes `requiresAcceptance: true`.
- [ ] After acceptance (`/api/user/accept`), join request policy allows submission.

### 3) Creator onboarding + default room
- [ ] Authenticated user can complete creator onboarding (`/api/creator/onboard`).
- [ ] Creator profile is persisted and linked to user.
- [ ] Default room is created/available for creator workflows.

### 4) Join request pending / approve / deny
- [ ] Client creates join request (`POST /api/join-request`) and receives `pending` status.
- [ ] Creator can list pending queue (`GET /api/join-requests/pending`).
- [ ] Creator approve (`POST /api/join-approve`) marks request `approved` and returns token + expiry.
- [ ] Creator deny (`POST /api/join-deny`) marks request `denied` with optional reason.
- [ ] Structured policy logs emitted for deny/allow paths.

### 5) Banned user rejection
- [ ] Banned user attempting `POST /api/join-request` gets `403`.
- [ ] Response includes `banned: true` and reason.
- [ ] Structured policy log decision reason indicates ban-based denial.

### 6) Token expiry behavior
- [ ] Expired/used magic-link token is rejected by callback with error page.
- [ ] Expired session/JWT token yields `401` on authenticated endpoints.
- [ ] Approved join token expiration timestamp is returned and enforced by video provider.

### 7) Logout + cookie/session invalidation
- [ ] `POST /api/auth/logout` deletes server-side session record.
- [ ] Endpoint sets `Set-Cookie: auth_token=; Max-Age=0; HttpOnly; SameSite=Strict` (plus `Secure` in production).
- [ ] Follow-up authenticated request with old token/cookie is rejected.

## Quick smoke commands

> Replace placeholders and run against your local or preview environment.

```bash
# 1) Start magic link
curl -i -X POST http://localhost:3000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{"email":"qa@example.com","returnTo":"/dashboard"}'

# 2) Create join request (authenticated)
curl -i -X POST http://localhost:3000/api/join-request \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT" \
  -d '{"creatorSlug":"creator-slug"}'

# 3) Approve join request (creator auth)
curl -i -X POST http://localhost:3000/api/join-approve \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=CREATOR_JWT" \
  -d '{"requestId":"JOIN_REQUEST_UUID"}'

# 4) Logout
curl -i -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: auth_token=YOUR_JWT"
```
