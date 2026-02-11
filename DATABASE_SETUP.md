# Database Setup Guide

## Quick Start

### 1. Create a PostgreSQL Database

You can use any PostgreSQL provider:
- **Vercel Postgres** (recommended for Vercel deployments)
- **Neon** (serverless PostgreSQL)
- **Supabase** (includes PostgreSQL)
- **Railway** (simple deployment)
- **Local PostgreSQL** (for development)

### 2. Run the Schema

Connect to your database and run:

```bash
psql $POSTGRES_URL < schema.sql
```

Or manually execute the contents of `schema.sql`.

### 3. Verify Tables

Check that the tables were created:

```sql
\dt
```

You should see:
- `users`
- `rooms`

### 4. Set Environment Variables

In Vercel (or your hosting platform):

```
POSTGRES_URL=your-database-connection-string
JWT_SECRET=a-long-random-secret-string
```

For local development, create a `.env` file:

```
POSTGRES_URL=postgresql://localhost:5432/cambridge
JWT_SECRET=dev-secret-change-in-production
```

## Database Schema

### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  age_confirmed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### rooms table
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing the Database

### Create a test user (via psql)

```sql
INSERT INTO users (email, password_hash, age_confirmed_at)
VALUES ('test@example.com', '$2a$12$testhashedpassword', NOW())
RETURNING id;
```

### Create a test room

```sql
INSERT INTO rooms (owner_id, slug)
VALUES ('user-uuid-from-above', 'test-room');
```

### Query rooms by owner

```sql
SELECT slug FROM rooms WHERE owner_id = 'user-uuid';
```

## Security Notes

- **Never commit real connection strings** to git
- **Use strong JWT secrets** (at least 32 random characters)
- **Enable SSL** for database connections in production
- **Passwords are hashed** with bcrypt cost factor 12

## Troubleshooting

### "relation does not exist"
Run `schema.sql` to create tables.

### "invalid connection string"
Check your `POSTGRES_URL` format: `postgresql://user:pass@host:port/db`

### "JWT must be provided"
Set the `JWT_SECRET` environment variable.

### "uuid-ossp extension not found"
Run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
