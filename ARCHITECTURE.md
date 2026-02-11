# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├── GET /
                              ├── GET /register
                              ├── GET /login
                              ├── GET /dashboard (auth)
                              └── GET /room/:slug
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     VERCEL EDGE CDN                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  index.html  │  │ login.html   │  │  room.html   │     │
│  │register.html │  │dashboard.html│  │  terms.html  │     │
│  │privacy.html  │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├── POST /api/register
                              ├── POST /api/login
                              ├── POST /api/logout
                              ├── GET  /api/me
                              ├── POST /api/rooms-create
                              ├── GET  /api/rooms-list
                              └── GET  /api/rooms-public
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              VERCEL SERVERLESS FUNCTIONS                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/*.js handlers                                   │  │
│  │                                                        │  │
│  │  ┌──────────┐              ┌──────────┐              │  │
│  │  │ lib/db.js│              │lib/auth.js│             │  │
│  │  │  (Pool)  │              │(JWT utils)│             │  │
│  │  └──────────┘              └──────────┘              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                       │
│  ┌──────────────┐              ┌──────────────┐            │
│  │    users     │              │    rooms     │            │
│  ├──────────────┤              ├──────────────┤            │
│  │ id (uuid)    │              │ id (uuid)    │            │
│  │ email        │◄─────────────│ owner_id (FK)│            │
│  │ password_hash│              │ slug         │            │
│  │ age_confirmed│              │ created_at   │            │
│  │ created_at   │              └──────────────┘            │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │
       │ 1. POST /api/register
       │    { email, password, ageConfirmed }
       ▼
┌──────────────────────┐
│  register.js         │
│  - Validate input    │
│  - Hash password     │────► PostgreSQL: INSERT user
│  - Insert user       │
└──────┬───────────────┘
       │
       │ 2. Return { ok: true }
       ▼
┌──────────────┐
│   Browser    │
│ Redirect to  │
│   /login     │
└──────┬───────┘
       │
       │ 3. POST /api/login
       │    { email, password }
       ▼
┌──────────────────────┐
│  login.js            │
│  - Lookup user       │◄──── PostgreSQL: SELECT user
│  - Verify password   │
│  - Generate JWT      │
│  - Set HttpOnly      │
│    cookie            │
└──────┬───────────────┘
       │
       │ 4. Return { ok: true }
       │    Set-Cookie: session=<JWT>
       ▼
┌──────────────┐
│   Browser    │
│ Redirect to  │
│ /dashboard   │
└──────────────┘
```

## Room Creation Flow

```
┌──────────────┐
│   Browser    │
│ (Dashboard)  │
└──────┬───────┘
       │
       │ 1. POST /api/rooms-create
       │    Cookie: session=<JWT>
       │    { slug: "my-room" }
       ▼
┌──────────────────────┐
│  rooms-create.js     │
│  - Verify JWT        │
│  - Extract user.id   │
│  - Validate slug     │────► PostgreSQL: INSERT room
│  - Insert room       │
└──────┬───────────────┘
       │
       │ 2. Return { ok: true }
       ▼
┌──────────────┐
│   Browser    │
│ Update list  │
└──────┬───────┘
       │
       │ 3. GET /api/rooms-list
       │    Cookie: session=<JWT>
       ▼
┌──────────────────────┐
│  rooms-list.js       │
│  - Verify JWT        │
│  - Get user.id       │────► PostgreSQL: SELECT rooms
│  - Query rooms       │      WHERE owner_id = user.id
└──────┬───────────────┘
       │
       │ 4. Return [{ slug: "my-room" }]
       ▼
┌──────────────┐
│   Browser    │
│ Display list │
└──────────────┘
```

## Public Room Access Flow

```
┌──────────────┐
│   Browser    │
│ /room/my-room│
└──────┬───────┘
       │
       │ 1. GET /api/rooms-public?slug=my-room
       │    (No auth required)
       ▼
┌──────────────────────┐
│  rooms-public.js     │────► PostgreSQL: SELECT room
│  - Validate slug     │      WHERE slug = "my-room"
│  - Query room        │
└──────┬───────────────┘
       │
       │ 2. Return { slug: "my-room" }
       │    or 404 if not found
       ▼
┌──────────────┐
│   Browser    │
│ Display room │
│   details    │
└──────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────┐
│ Layer 1: Input Validation                       │
│ - Email format regex                             │
│ - Password length >= 8                           │
│ - Slug format [a-z0-9-]                         │
│ - Age confirmation strict boolean                │
└─────────────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│ Layer 2: Authentication                          │
│ - JWT token verification                         │
│ - HttpOnly cookies (XSS protection)              │
│ - 7-day expiry                                   │
└─────────────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│ Layer 3: Authorization                           │
│ - User can only access own rooms                 │
│ - User can only create rooms when authenticated  │
└─────────────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│ Layer 4: Data Protection                         │
│ - Passwords hashed with bcrypt (cost: 12)        │
│ - Parameterized SQL queries (injection-proof)    │
│ - Lowercase normalization for consistency        │
└─────────────────────────────────────────────────┘
```

## Deployment Architecture

```
GitHub Repository
       │
       │ git push
       ▼
┌────────────────────────┐
│  Vercel Platform       │
│                        │
│  1. Build Phase        │
│     - npm install      │
│     - No build step    │
│                        │
│  2. Deploy Phase       │
│     - Upload HTML      │
│     - Deploy functions │
│     - Configure routes │
│                        │
│  3. Runtime            │
│     - Serve static     │
│     - Run serverless   │
│     - Connect DB       │
└────────────────────────┘
       │
       ├──► CDN (Global)
       │    - Static files
       │    - Edge caching
       │
       └──► Functions (Regional)
            - API handlers
            - Database queries
```

## Data Model

```
┌─────────────────────────────────────────────────┐
│                    users                         │
├─────────────────────────────────────────────────┤
│ id: UUID (PK)                                    │
│ email: TEXT (UNIQUE)                             │
│ password_hash: TEXT                              │
│ age_confirmed_at: TIMESTAMP                      │
│ created_at: TIMESTAMP                            │
└─────────────────────────────────────────────────┘
                    │
                    │ 1:N relationship
                    │ ON DELETE CASCADE
                    ▼
┌─────────────────────────────────────────────────┐
│                    rooms                         │
├─────────────────────────────────────────────────┤
│ id: UUID (PK)                                    │
│ owner_id: UUID (FK → users.id)                  │
│ slug: TEXT (UNIQUE)                              │
│ created_at: TIMESTAMP                            │
└─────────────────────────────────────────────────┘

Indexes:
- users.email (for login lookups)
- rooms.owner_id (for listing user's rooms)
- rooms.slug (for public room access)
```

## File Structure

```
CamBridge/
├── api/                    # Serverless functions
│   ├── register.js         # POST - User registration
│   ├── login.js            # POST - User login
│   ├── logout.js           # POST - Clear session
│   ├── me.js               # GET - Current user
│   ├── rooms-create.js     # POST - Create room
│   ├── rooms-list.js       # GET - List user's rooms
│   └── rooms-public.js     # GET - Public room info
│
├── lib/                    # Shared utilities
│   ├── db.js               # PostgreSQL pool
│   └── auth.js             # JWT utilities
│
├── index.html              # Landing page
├── register.html           # Registration form
├── login.html              # Login form
├── dashboard.html          # Room management
├── room.html               # Public room page
├── terms.html              # Terms of service
├── privacy.html            # Privacy policy
│
├── schema.sql              # Database schema
├── vercel.json             # Routing config
└── package.json            # Dependencies
```

## Request/Response Examples

### Registration
```http
POST /api/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123",
  "ageConfirmed": true
}

→ 200 OK
{
  "ok": true
}
```

### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123"
}

→ 200 OK
Set-Cookie: session=eyJhbG...; HttpOnly; Path=/; Max-Age=604800
{
  "ok": true
}
```

### Create Room
```http
POST /api/rooms-create
Cookie: session=eyJhbG...
Content-Type: application/json

{
  "slug": "my-private-room"
}

→ 200 OK
{
  "ok": true
}
```

### Public Room
```http
GET /api/rooms-public?slug=my-private-room

→ 200 OK
{
  "slug": "my-private-room"
}
```
