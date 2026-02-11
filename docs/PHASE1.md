# Phase 1: Email Magic-Link Auth + Age Gate + Creator Onboarding + Join Requests

## Overview

Phase 1 implements a passwordless authentication system with email magic-links, age/ToS gating, creator onboarding, join request workflow, and moderation tools. All changes are incremental and do not break existing routes.

## Architecture

### Authentication Flow
1. User visits `/room/:modelname` or `/room/:modelname/:roomslug`
2. Age gate modal appears (18+ attestation required)
3. Terms of Service modal appears (acceptance required)
4. Email login modal appears (passwordless magic-link)
5. User receives email with magic link (15-minute expiration)
6. Click link → authenticated → cookie set (HttpOnly, SameSite=Strict)
7. User submits join request
8. Creator approves/denies from dashboard
9. If approved: Daily token minted (server-side only), user can join room

### Creator Onboarding Flow
1. Authenticated user (with ToS/age accepted) can become a creator
2. POST `/api/creator/onboard` with `displayName` and optional `slug`
3. System creates `creators` record, updates user role to 'creator'
4. Default "main" room created automatically
5. Creator can now manage join requests and bans from dashboard

## Database Schema

### New Tables

```sql
-- login_tokens: Magic-link tokens (hashed with SHA-256, 15-min TTL, single-use)
CREATE TABLE login_tokens (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- creators: Creator accounts linked to users
CREATE TABLE creators (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  slug VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200),
  plan VARCHAR(50) DEFAULT 'free',
  status VARCHAR(20) DEFAULT 'active',
  referral_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- join_requests: Join request workflow
CREATE TABLE join_requests (
  id UUID PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id),
  room_id INTEGER REFERENCES rooms(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  daily_token VARCHAR(500),
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMPTZ,
  decision_reason VARCHAR(500),
  ip_hash VARCHAR(255),
  device_hash VARCHAR(255)
);

-- bans: Creator ban system
CREATE TABLE bans (
  id UUID PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id),
  user_id INTEGER REFERENCES users(id),
  email VARCHAR(255),
  ip_hash VARCHAR(255),
  device_hash VARCHAR(255),
  reason VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);
```

### Extended Tables

```sql
-- users: Added role, ToS acceptance, age attestation
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'client';
ALTER TABLE users ADD COLUMN tos_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN age_attested_at TIMESTAMPTZ;

-- rooms: Added creator relationship and room metadata
ALTER TABLE rooms ADD COLUMN creator_id UUID REFERENCES creators(id);
ALTER TABLE rooms ADD COLUMN room_slug VARCHAR(100);
ALTER TABLE rooms ADD COLUMN room_type VARCHAR(50) DEFAULT 'public';
ALTER TABLE rooms ADD COLUMN enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE rooms ADD COLUMN join_mode VARCHAR(20) DEFAULT 'knock';
ALTER TABLE rooms ADD COLUMN max_participants INTEGER;
```

## API Endpoints

### Authentication (Magic-Link)

#### `POST /api/auth/start`
Initiate magic-link authentication flow.

**Request:**
```json
{
  "email": "user@example.com",
  "returnTo": "/room/testcreator" // Optional, defaults to /dashboard
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login link sent to your email",
  "email": "user@example.com"
}
```

**Rate Limit:** 5 requests per hour per email

**Notes:**
- Generates random 32-byte token, hashes with SHA-256
- Sends email via Resend API
- Token expires in 15 minutes
- In development mode, logs magic link to console

---

#### `GET /api/auth/callback?token=...&returnTo=...`
Verify magic-link token and authenticate user.

**Query Parameters:**
- `token` (required): 64-character hex token from email
- `returnTo` (optional): Redirect destination after auth

**Response:**
- Redirects to `returnTo` or `/dashboard` on success
- Sets `auth_token` cookie (HttpOnly, SameSite=Strict, 7-day expiration)
- Creates/finds user by email if doesn't exist
- Creates session in database

**Error Responses:**
- 400: Invalid token format
- 401: Token expired or already used (HTML error page)

---

#### `POST /api/auth/logout`
Clear authentication cookie (existing endpoint, compatible with Phase 1).

---

### User Acceptance

#### `POST /api/user/accept`
Record age attestation and ToS acceptance.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "ageAttested": true,
  "tosAccepted": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Age attestation and ToS acceptance recorded",
  "user": {
    "id": 123,
    "username": "user123",
    "email": "user@example.com",
    "role": "client",
    "ageAttestedAt": "2026-02-11T04:00:00Z",
    "tosAcceptedAt": "2026-02-11T04:00:00Z"
  }
}
```

**Error Responses:**
- 401: Not authenticated
- 400: Both flags must be true

**Enforcement:** Required before join requests are allowed.

---

### Creator Onboarding

#### `POST /api/creator/onboard`
Convert user to creator account.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "displayName": "Jane Doe",
  "slug": "janedoe" // Optional, auto-generated if not provided
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Creator account created successfully",
  "creator": {
    "id": "uuid",
    "userId": 123,
    "slug": "janedoe",
    "displayName": "Jane Doe",
    "plan": "free",
    "status": "active",
    "createdAt": "2026-02-11T04:00:00Z"
  },
  "rooms": [
    {
      "id": 456,
      "roomName": "janedoe-main",
      "accessCode": "ABC123XY",
      "dailyRoomUrl": "https://cambridge.daily.co/janedoe-main"
    }
  ]
}
```

**Error Responses:**
- 401: Not authenticated
- 403: ToS/age not accepted
- 409: User is already a creator OR slug is taken

**Slug Rules:**
- 3-100 characters
- Lowercase letters, numbers, hyphens, underscores only
- Must be unique across all creators
- Auto-generated from displayName if not provided

---

### Join Request Workflow

#### `POST /api/join-request`
Client requests to join a creator's room.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "creatorSlug": "janedoe",
  "roomSlug": "vip", // Optional, null for main room
  "accessCode": "ABC123" // Optional, for future use
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Join request created. Waiting for creator approval.",
  "requestId": "uuid",
  "status": "pending",
  "createdAt": "2026-02-11T04:00:00Z"
}
```

**Error Responses:**
- 401: Not authenticated
- 403: ToS/age not accepted OR user is banned
- 404: Creator or room not found
- 429: Too many requests (10 per hour per user per creator)

**Ban Checking:** Enforced by user ID, email, IP hash, and device hash.

---

#### `GET /api/join-status?requestId=<uuid>`
Poll join request status.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `requestId` (required): UUID from join request creation

**Response (200) - Pending:**
```json
{
  "requestId": "uuid",
  "status": "pending",
  "createdAt": "2026-02-11T04:00:00Z",
  "decidedAt": null
}
```

**Response (200) - Approved:**
```json
{
  "requestId": "uuid",
  "status": "approved",
  "createdAt": "2026-02-11T04:00:00Z",
  "decidedAt": "2026-02-11T04:05:00Z",
  "dailyToken": "eyJhbGciOi...",
  "tokenExpiresAt": "2026-02-11T04:20:00Z"
}
```

**Response (200) - Denied:**
```json
{
  "requestId": "uuid",
  "status": "denied",
  "createdAt": "2026-02-11T04:00:00Z",
  "decidedAt": "2026-02-11T04:05:00Z",
  "reason": "Creator declined"
}
```

**Error Responses:**
- 401: Not authenticated
- 403: Request doesn't belong to authenticated user
- 404: Request not found

**Client Polling:** Recommended interval is 3-5 seconds.

---

#### `POST /api/join-approve`
Creator approves join request and mints Daily token.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "requestId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Join request approved",
  "requestId": "uuid",
  "status": "approved",
  "dailyToken": "eyJhbGciOi...",
  "tokenExpiresAt": "2026-02-11T04:20:00Z",
  "decidedAt": "2026-02-11T04:05:00Z"
}
```

**Error Responses:**
- 401: Not authenticated
- 403: User is not a creator OR doesn't own this request
- 404: Request not found
- 409: Request already decided
- 500: Failed to mint Daily token

**Daily Token:** Minted server-side only with 15-minute TTL. Never exposed to client before approval.

---

#### `POST /api/join-deny`
Creator denies join request.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "requestId": "uuid",
  "reason": "Not available right now" // Optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Join request denied",
  "requestId": "uuid",
  "status": "denied",
  "reason": "Not available right now",
  "decidedAt": "2026-02-11T04:05:00Z"
}
```

**Error Responses:**
- 401: Not authenticated
- 403: User is not a creator OR doesn't own this request
- 404: Request not found
- 409: Request already decided

---

### Creator Moderation

#### `POST /api/creator/ban`
Ban a user from creator's rooms.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "userId": 123, // Optional if email provided
  "email": "banned@example.com", // Optional if userId provided
  "reason": "Violation of terms" // Optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User banned successfully",
  "ban": {
    "id": "uuid",
    "userId": 123,
    "email": "banned@example.com",
    "reason": "Violation of terms",
    "createdAt": "2026-02-11T04:00:00Z"
  }
}
```

**Error Responses:**
- 401: Not authenticated
- 403: User is not a creator
- 400: Neither userId nor email provided OR attempting to ban self

**Ban Enforcement:** Checked at join-request gate by user ID, email, IP hash, device hash.

---

#### `POST /api/creator/unban`
Remove a ban.

**Headers:**
- `Authorization: Bearer <token>`

**Request:**
```json
{
  "banId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User unbanned successfully",
  "banId": "uuid"
}
```

**Error Responses:**
- 401: Not authenticated
- 403: User is not a creator
- 404: Ban not found OR doesn't belong to creator

---

#### `GET /api/creator/bans`
List active bans for creator.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "user_id": 123,
    "username": "user123",
    "email": "banned@example.com",
    "reason": "Violation of terms",
    "created_at": "2026-02-11T04:00:00Z"
  }
]
```

**Error Responses:**
- 401: Not authenticated
- 403: User is not a creator

---

#### `GET /api/creator/info`
Get creator info for authenticated user.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "userId": 123,
  "slug": "janedoe",
  "displayName": "Jane Doe",
  "plan": "free",
  "status": "active",
  "createdAt": "2026-02-11T04:00:00Z"
}
```

**Error Responses:**
- 401: Not authenticated
- 404: User is not a creator

---

#### `GET /api/join-requests/pending`
List pending join requests for creator.

**Headers:**
- `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "user_id": 123,
    "username": "user123",
    "email": "user@example.com",
    "display_name": "John Doe",
    "room_id": 456,
    "room_name": "janedoe-vip",
    "room_slug": "vip",
    "status": "pending",
    "created_at": "2026-02-11T04:00:00Z"
  }
]
```

**Error Responses:**
- 401: Not authenticated
- 403: User is not a creator

---

## Environment Variables

### Required for Phase 1

```bash
# Postgres connection (existing)
POSTGRES_URL=postgresql://username:password@host:port/database

# JWT secret (existing)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Daily.co API key (NOW REQUIRED for token minting)
DAILY_API_KEY=your-daily-api-key

# Email service (Resend)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@cambridge.app

# Application base URL (for magic-link redirects)
APP_BASE_URL=https://cambridge.app
```

### Optional

```bash
# Database init secret (existing)
DB_INIT_SECRET=your-secret-key-for-db-init

# Deepgram API key (existing, optional)
DEEPGRAM_KEY=your-deepgram-api-key-optional

# Node environment
NODE_ENV=production
```

---

## Local Testing

### 1. Database Setup

```bash
# Run migration script
psql $POSTGRES_URL -f scripts/phase1-migration.sql
```

### 2. Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
nano .env
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
# For Vercel CLI
vercel dev

# OR use any static file server
python -m http.server 8000
```

### 5. Test Magic-Link Flow

1. Visit `http://localhost:3000/room/testcreator`
2. Age gate modal should appear → check 18+ box → confirm
3. ToS modal should appear → check acceptance box → accept
4. Email login modal should appear → enter email → click "Send Magic Link"
5. Check console for magic link (in dev mode) OR check email inbox
6. Click magic link → should redirect back to room page
7. Join request modal should appear → "Requesting access..."

### 6. Test Creator Dashboard

1. Open creator dashboard (existing auth flow)
2. "Join Requests" card should appear (if you're a creator)
3. Should see pending request from previous test
4. Click "Approve" → request disappears
5. Client should receive approval and Daily token

### 7. Test Ban Enforcement

1. In creator dashboard, ban a user by email
2. That user attempts to join → should see "You are banned" error
3. Unban the user → should be able to request again

---

## Acceptance Checklist

- [ ] Client lands on `/room/testcreator` → sees age gate modal
- [ ] Age gate: check box enables button, submit works
- [ ] ToS modal appears after age gate → check box enables button
- [ ] Email login modal appears after ToS → enter email → receives magic link
- [ ] Magic link in email (or console in dev) → click → authenticated
- [ ] Cookie `auth_token` is set (HttpOnly, SameSite=Strict)
- [ ] Join request modal appears → "Waiting for approval..."
- [ ] Creator dashboard shows pending request in "Join Requests" card
- [ ] Creator clicks "Approve" → Daily token minted server-side
- [ ] Client receives approval → "Access approved! Enter room" button appears
- [ ] Client clicks enter → joins Daily room with token
- [ ] If user not accepted ToS/age → join-request returns 403
- [ ] If user banned → join-request returns 403 with ban reason
- [ ] Creator can ban user by email → user can't join
- [ ] Creator can unban user → user can join again
- [ ] Existing `/room/*`, `/dashboard`, `/api/*` routes still work
- [ ] No console errors during flow
- [ ] Rate limits enforced (5 magic links per hour per email)
- [ ] Rate limits enforced (10 join requests per hour per user per creator)

---

## Security Notes

1. **Magic-Link Tokens**: Hashed with SHA-256, single-use, 15-minute TTL
2. **Daily API Key**: Never exposed to client, used server-side only
3. **Cookies**: HttpOnly, SameSite=Strict, Secure in production
4. **Rate Limiting**: Implemented for auth and join requests
5. **Input Validation**: All user inputs sanitized and validated
6. **Ban Enforcement**: Multi-factor (user ID, email, IP hash, device hash)
7. **ToS/Age Gate**: Server-side enforcement, not just UI
8. **No Breaking Changes**: Existing auth system still works

---

## Known Limitations (Phase 1)

1. **Email Polling**: Client polls for join status (no WebSocket yet)
2. **Dashboard Polling**: Creator dashboard polls for new requests (10-second interval)
3. **No User Profiles**: Magic-link creates minimal user account
4. **No Password Recovery**: Not needed for passwordless system
5. **No Multi-Device Session Management**: One cookie per browser
6. **No Join Request History**: Only shows pending requests
7. **Ban System**: Manual only, no automatic abuse detection

---

## Troubleshooting

### Magic Link Not Received
- Check spam/junk folder
- Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are correct
- In dev mode, check console for magic link
- Check Resend dashboard for delivery errors

### Daily Token Minting Fails
- Verify `DAILY_API_KEY` is set and valid
- Check Daily.co API limits/quota
- Ensure room name matches pattern `{slug}-{roomslug}-{type}`
- Check server logs for Daily API error details

### Join Request Not Appearing
- Ensure creator status: check user role is 'creator'
- Refresh dashboard manually or wait for auto-refresh (10s)
- Check console for API errors
- Verify creator owns the room being requested

### Ban Not Working
- Ensure ban is `active = true`
- Check ban matches user ID, email, IP hash, or device hash
- Ban enforcement happens at join-request creation, not room entry

---

## Next Steps (Phase 2+)

1. WebSocket support for real-time join request notifications
2. Email notifications for creators when requests arrive
3. Join request history and analytics
4. Automatic ban suggestions based on behavior
5. Multi-room join requests (request access to all rooms)
6. Custom ToS per creator
7. User profile management (avatar, bio, etc.)
8. Two-factor authentication option
9. Session management (view/revoke all sessions)
10. Creator analytics dashboard (requests, approvals, denials)

---

## Migration from Existing System

For users with existing password-based accounts:
- Existing auth system continues to work unchanged
- Users can initiate password reset to transition to magic-link
- OR: Add migration endpoint to convert password accounts to magic-link
- Existing JWT tokens remain valid

For creators:
- Existing model accounts can be migrated to creator accounts
- Run onboarding flow to create `creators` record
- Link existing rooms to creator via `creator_id`

---

## Support

For issues or questions:
- Check logs: `/api/health` for database status
- Check environment: All required vars set?
- Check migration: Run `phase1-migration.sql` again (idempotent)
- Check GitHub issues for known problems
- Contact support with error logs and steps to reproduce
