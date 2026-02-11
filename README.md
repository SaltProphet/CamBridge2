# CamBridge - Minimal Auth + Room System

A minimal, deterministic authentication and room management system.

## Features

- User registration with email/password and age verification
- JWT-based authentication with HttpOnly cookies
- Room creation and management
- Public room pages
- Clean URL routing via Vercel

## File Structure

```
/
  index.html          - Landing page
  register.html       - Registration form
  login.html          - Login form
  dashboard.html      - Create rooms and view your rooms
  room.html           - Public room page
  terms.html          - Terms of service
  privacy.html        - Privacy policy

/api
  register.js         - POST /api/register
  login.js            - POST /api/login
  logout.js           - POST /api/logout
  me.js               - GET /api/me
  rooms-create.js     - POST /api/rooms-create
  rooms-list.js       - GET /api/rooms-list
  rooms-public.js     - GET /api/rooms-public

/lib
  db.js               - PostgreSQL connection pool
  auth.js             - JWT sign/verify utilities
```

## Database Schema

Two tables only:

### users
- id (uuid, primary key)
- email (text, unique)
- password_hash (text)
- age_confirmed_at (timestamp)
- created_at (timestamp)

### rooms
- id (uuid, primary key)
- owner_id (uuid, foreign key to users)
- slug (text, unique)
- created_at (timestamp)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file with:

```
POSTGRES_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 3. Initialize Database

Run the SQL schema:

```bash
psql $POSTGRES_URL < schema.sql
```

### 4. Deploy to Vercel

```bash
vercel
```

Set environment variables in Vercel dashboard:
- `POSTGRES_URL`
- `JWT_SECRET`

## API Endpoints

### POST /api/register
**Input:** `{ email, password, ageConfirmed }`  
**Returns:** `{ ok: true }` or `{ ok: false, error: "..." }`

### POST /api/login
**Input:** `{ email, password }`  
**Returns:** `{ ok: true }` (sets HttpOnly cookie)

### POST /api/logout
**Returns:** `{ ok: true }` (clears cookie)

### GET /api/me
**Returns:** `{ ok: true, user: { id, email } }` (requires auth)

### POST /api/rooms-create
**Input:** `{ slug }`  
**Returns:** `{ ok: true }` (requires auth)

### GET /api/rooms-list
**Returns:** Array of rooms owned by current user (requires auth)

### GET /api/rooms-public?slug=...
**Returns:** Public room info

## User Flow

1. Visitor → `/` → Click Register
2. `/register` → POST `/api/register` → Redirect `/login`
3. `/login` → POST `/api/login` → Cookie set → Redirect `/dashboard`
4. `/dashboard` → Create room → `/room/myroom` → Public page loads

## Security

- Passwords hashed with bcrypt (cost: 12)
- JWT tokens expire after 7 days
- HttpOnly cookies prevent XSS attacks
- All emails stored lowercase
- All slugs stored lowercase

## License

MIT
