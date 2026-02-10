# Model Authentication System Setup Guide

## Overview
CamBridge now includes a secure authentication system for models with:
- User registration and login with JWT tokens
- Password hashing with bcrypt
- Database-backed user accounts and rooms
- Profile management
- Secure session management

## Database Setup

### Option 1: Vercel Postgres (Recommended for Vercel deployments)

1. Create a Postgres database in your Vercel project dashboard
2. Copy the connection string environment variables
3. Add to your Vercel project environment variables:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

### Option 2: Neon (Alternative)

Vercel Postgres is being migrated to Neon. Follow the Neon migration guide:
https://neon.com/docs/guides/vercel-postgres-transition-guide

### Initialize Database Tables

1. Set your `DB_INIT_SECRET` environment variable
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

# Optional
DAILY_API_KEY=your-daily-api-key
DEEPGRAM_KEY=your-deepgram-key
```

**IMPORTANT**: Never commit `.env` to version control!

## API Endpoints

### Authentication

#### Register New Model
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "modelname",
  "email": "model@example.com",
  "password": "SecurePass123",
  "displayName": "Model Display Name"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "modelname",
  "password": "SecurePass123"
}

Response:
{
  "success": true,
  "token": "jwt-token-here",
  "user": { ... }
}
```

#### Logout
```bash
POST /api/auth/logout
Authorization: Bearer {token}
```

### Profile Management

#### Get Profile
```bash
GET /api/profile
Authorization: Bearer {token}

Response:
{
  "success": true,
  "user": { ... },
  "rooms": [ ... ]
}
```

#### Update Profile
```bash
PUT /api/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "displayName": "New Display Name",
  "bio": "Model bio",
  "avatarUrl": "https://..."
}
```

### Room Management

#### List Rooms
```bash
GET /api/rooms
Authorization: Bearer {token}
```

#### Create Room
```bash
POST /api/rooms
Authorization: Bearer {token}
Content-Type: application/json

{
  "roomName": "roomname"
}
```

#### Update Room
```bash
PUT /api/rooms
Authorization: Bearer {token}
Content-Type: application/json

{
  "roomId": 1,
  "accessCode": "NEWCODE1",
  "isActive": true,
  "maxSessionDuration": 7200
}
```

## User Interface

### Model Registration
Navigate to `/register` to create a new model account.

### Model Dashboard
Navigate to `/dashboard` to login and manage your account:
- View room information
- Change access codes
- Manage profile
- Enter your room

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Password Hashing
- Uses bcrypt with 12 salt rounds
- Passwords are never stored in plain text

### JWT Tokens
- 7-day expiration
- Stored in localStorage
- Verified on every API request

### Rate Limiting
- Registration: 5 attempts per hour per IP
- Login: 10 attempts per 15 minutes per IP

### Input Validation
- Username: lowercase letters, numbers, hyphens, underscores only
- Email: valid email format
- All inputs sanitized to prevent XSS

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Test API Locally

1. Set up environment variables in `.env`
2. Initialize database with `/api/init-db`
3. Test registration at `http://localhost:3000/register`
4. Test login at `http://localhost:3000/dashboard`

## Migration from Legacy System

The old dashboard used client-side password checking with `DEMO_PASSWORD = 'modelpass'`. This has been replaced with:

1. **Server-side authentication**: Passwords checked via API
2. **Database storage**: User accounts stored in Postgres
3. **JWT tokens**: Secure session management
4. **Per-user rooms**: Each model has their own room in the database

### Migration Steps

1. Set up database and environment variables
2. Initialize database tables
3. Have existing models register new accounts at `/register`
4. Their old access codes from localStorage will no longer work
5. New access codes are stored in the database per room

## Production Deployment

### Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy
5. Run database initialization once via `/api/init-db`

### Security Checklist

- [ ] Strong `JWT_SECRET` set (random 32+ character string)
- [ ] `DB_INIT_SECRET` set and kept private
- [ ] HTTPS enabled (required for production)
- [ ] Database connection uses SSL
- [ ] Environment variables never committed to git
- [ ] Rate limiting configured
- [ ] CORS properly configured for your domain

## Troubleshooting

### Database Connection Errors
- Verify `POSTGRES_URL` is correct
- Check database is running and accessible
- Ensure SSL mode is correct for your database

### JWT Token Errors
- Check `JWT_SECRET` is set
- Verify token hasn't expired
- Clear localStorage and login again

### Registration/Login Fails
- Check database tables are initialized
- Verify password meets requirements
- Check for rate limiting

## Support

For issues or questions:
1. Check environment variables are configured
2. Verify database is initialized
3. Check browser console for errors
4. Check API logs in Vercel dashboard
