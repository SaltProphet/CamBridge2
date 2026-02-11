# Database Setup for CamBridge

## IMPORTANT: Database Configuration Required

**⚠️ WARNING:** By default, this app uses an **in-memory mock database** for local development. 

**This means:**
- ❌ All user registrations are LOST when the server restarts
- ❌ All rooms are LOST when the server restarts  
- ❌ All data is TEMPORARY and NOT PERSISTENT

## Setting Up a Real Database

### Option 1: Vercel Postgres (Recommended for Production)

1. **Create a Vercel Postgres Database:**
   - Go to https://vercel.com/dashboard
   - Select your project
   - Go to "Storage" tab
   - Click "Create Database"
   - Select "Postgres"
   - Click "Create"

2. **Get Your Connection Strings:**
   - After creating the database, Vercel will show you connection strings
   - Copy the **POSTGRES_PRISMA_URL** (this is the POOLED connection)
   - Also copy the **POSTGRES_URL** (direct connection, backup)

3. **Set Environment Variables:**

   **For Local Development:**
   Create a `.env.local` file in the root directory:
   ```bash
   POSTGRES_PRISMA_URL=postgres://username:password@host:port/database?pgbouncer=true
   POSTGRES_URL=postgres://username:password@host:port/database
   JWT_SECRET=your-super-secret-jwt-key
   ```

   **For Vercel Deployment:**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add:
     - `POSTGRES_PRISMA_URL` - The pooled connection string
     - `POSTGRES_URL` - The direct connection string
     - `JWT_SECRET` - A random secure string

4. **Initialize the Database:**
   - Deploy or run your app
   - Visit: `https://yourapp.vercel.app/api/init-db`
   - Or call: `curl https://yourapp.vercel.app/api/init-db`
   - The database tables will be created automatically

### Option 2: Other PostgreSQL Providers

You can use any PostgreSQL provider (Neon, Supabase, Railway, etc.):

1. Create a PostgreSQL database
2. Get the **pooled connection string** (usually has `?pgbouncer=true` or similar)
3. Set `POSTGRES_PRISMA_URL` to the pooled connection string
4. Set `POSTGRES_URL` to the direct connection string
5. Initialize the database by calling `/api/init-db`

## Database Schema

The app will automatically create these tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Join requests table
CREATE TABLE join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  requester_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## Checking Database Status

The app logs will tell you which database mode is active:

- ✅ `Using REAL Postgres database (pooled connection)` - **Good!** Data persists
- ❌ `USING MOCK DATABASE - DATA WILL NOT PERSIST!` - **Bad!** Need to configure database

## Troubleshooting

### "invalid_connection_string" Error

This means you're trying to use `createPool()` with a direct connection string.

**Solution:** Use `POSTGRES_PRISMA_URL` (pooled) instead of `POSTGRES_URL` (direct).

### Data Not Persisting

1. Check the server logs for database connection messages
2. Make sure `POSTGRES_PRISMA_URL` is set correctly
3. Verify the database tables exist by calling `/api/init-db`
4. Check that the connection string has proper credentials

### Mock Database in Production

If you see "USING MOCK DATABASE" in production logs:
1. You forgot to set `POSTGRES_PRISMA_URL` environment variable
2. Set it in your hosting platform's environment variables
3. Redeploy your app
