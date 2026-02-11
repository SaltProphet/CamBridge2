# CamBridge

A minimalist video room platform. Create your room, share the link, control who joins.

## Features

- **Clean & Simple**: Black and white minimalist design
- **Private Rooms**: Each creator gets their own custom URL
- **Age Verified**: 18+ only platform
- **Privacy First**: Peer-to-peer video, no recording

## Setup

### Environment Variables

Create a `.env` file or set these in your Vercel project:

```bash
# Required for production
POSTGRES_URL=your_postgres_connection_string
POSTGRES_PRISMA_URL=your_postgres_pooled_connection_string
JWT_SECRET=your_jwt_secret_key_here

# Optional - for local dev
NODE_ENV=development

# BETA MODE - Set to 'true' to enable registration
BETA_MODE=true
```

### Local Development

```bash
# Install dependencies
npm install

# Run locally (mock database if no Postgres configured)
npm run dev

# The app will use in-memory mock database if POSTGRES_URL is not set
```

### Database Schema

The app auto-creates these tables on first use:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  role VARCHAR(50),
  age_attested_at TIMESTAMPTZ,
  tos_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creators table
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  slug VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  plan_status VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms table  
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id),
  room_slug VARCHAR(100),
  room_name VARCHAR(255),
  room_type VARCHAR(50),
  enabled BOOLEAN DEFAULT true,
  join_mode VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (optional)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Other Platforms

CamBridge is a standard Node.js app and can be deployed to any platform that supports:
- Node.js 18+
- PostgreSQL database
- Serverless functions

## API Endpoints

- `POST /api/auth/password-register` - Create account
- `POST /api/auth/password-login` - Login
- `GET /api/creator/info` - Get creator profile (auth required)
- `POST /api/auth/logout` - Logout

## Pages

- `/` - Landing page
- `/register` - Create account
- `/login` - Login
- `/dashboard` - User dashboard (shows room link)
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy
- `/:slug` - Creator's video room (TODO)

## License

MIT
