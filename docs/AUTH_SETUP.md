# Authentication Setup Guide (MVP: Passwordless Only)

## Overview
CamBridge uses a single MVP authentication mode:
- `POST /api/auth/start` to request a magic link by email
- `GET /api/auth/callback` to verify token, create/login user, and set `auth_token`
- `POST /api/auth/logout` to end the DB session and clear `auth_token`

Legacy password endpoints are intentionally disabled:
- `POST /api/auth/register` → `410 Gone`
- `POST /api/auth/login` → `410 Gone`

## Database Setup

### Option 1: Vercel Postgres (Recommended for Vercel deployments)
1. Create a Postgres database in your Vercel project dashboard.
2. Copy the connection string environment variables.
3. Add to your Vercel project environment variables:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

### Option 2: Neon (Alternative)
Vercel Postgres is being migrated to Neon. Follow the Neon migration guide:
https://neon.com/docs/guides/vercel-postgres-transition-guide

### Initialize Database Tables
1. Set your `DB_INIT_SECRET` environment variable.
2. Make a POST request to `/api/init-db`:

```bash
curl -X POST https://your-domain.com/api/init-db \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-db-init-secret"}'
```

## Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Required
POSTGRES_URL=postgresql://...
JWT_SECRET=your-super-secret-jwt-key
DB_INIT_SECRET=your-db-init-secret
APP_BASE_URL=https://your-domain.com

# Email provider for magic links
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@your-domain.com

# Optional
DAILY_API_KEY=your-daily-api-key
DEEPGRAM_KEY=your-deepgram-key
```

## Auth API Endpoints

### Start Login (Magic Link)
```bash
POST /api/auth/start
Content-Type: application/json

{
  "email": "user@example.com",
  "returnTo": "/dashboard"
}
```

### Complete Login (Callback)
```bash
GET /api/auth/callback?token={token}&returnTo=%2Fdashboard
```
- Verifies single-use token
- Creates user automatically if needed
- Creates DB session
- Sets `auth_token` HttpOnly cookie
- Redirects to `returnTo` (or `/dashboard`)

### Logout
```bash
POST /api/auth/logout
Authorization: Bearer {token}
```
- Deletes DB session (when bearer token is provided)
- Clears `auth_token` cookie

## Security Features
- Passwordless authentication (no password storage)
- Single-use login tokens (SHA-256 hashed, 15-minute TTL)
- HttpOnly auth cookie (`SameSite=Strict`, `Secure` in production)
- JWT-backed sessions with DB persistence
- Rate limiting on magic-link requests

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Test Auth Locally
1. Set environment variables in `.env`.
2. Initialize DB via `/api/init-db`.
3. Call `POST /api/auth/start` with a test email.
4. Open the magic link to hit `GET /api/auth/callback`.
5. Verify redirect and authenticated dashboard session.

## Troubleshooting

### Database Connection Errors
- Verify `POSTGRES_URL` is correct.
- Check database is running and accessible.
- Ensure SSL mode is correct for your database.

### Magic Link Not Delivered
- Verify `EMAIL_PROVIDER` configuration.
- Check provider API key (`RESEND_API_KEY` if using Resend).
- In development, switch to `EMAIL_PROVIDER=console` to log links locally.

### Auth Cookie / Session Issues
- Ensure `APP_BASE_URL` matches your deployed URL.
- Confirm HTTPS in production (required for `Secure` cookies).
- Clear site cookies and retry auth flow.
