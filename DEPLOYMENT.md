# Deployment Guide

## Vercel Deployment

### Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Environment Variables** - Set these in Vercel project settings
3. **Database** - Postgres database (Vercel Postgres or Neon)

### Required Environment Variables

Set these in your Vercel project settings (Settings → Environment Variables):

```bash
# Database (REQUIRED)
POSTGRES_URL=postgresql://username:password@host:port/database

# Authentication (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DB_INIT_SECRET=your-secret-key-for-db-init

# Optional
DAILY_API_KEY=your-daily-api-key-optional
DEEPGRAM_KEY=your-deepgram-api-key-optional
```

⚠️ **IMPORTANT**: Generate strong random strings for `JWT_SECRET` and `DB_INIT_SECRET` in production.

### Deployment Steps

1. **Connect Repository**
   ```bash
   # Via Vercel CLI
   npm i -g vercel
   vercel
   ```
   
   Or connect via Vercel dashboard (Import Git Repository)

2. **Configure Build Settings**
   - Build Command: `echo 'Static site'` (auto-detected from vercel.json)
   - Output Directory: `.` (root directory, auto-detected from vercel.json)
   - Install Command: `npm install` (required for API dependencies)

3. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables from above
   - Apply to Production, Preview, and Development environments

4. **Deploy**
   ```bash
   vercel --prod
   ```

5. **Initialize Database**
   - Visit `https://your-domain.vercel.app/setup`
   - Click "Initialize Database" button
   - Tables will be created automatically

### Project Structure

```
/
├── api/                  # Serverless functions (Vercel auto-detects)
│   ├── auth/
│   ├── profile/
│   ├── rooms/
│   └── *.js
├── *.html                # Static HTML pages (served from root)
├── *.js                  # Static JavaScript files
├── *.css                 # Static CSS files
├── assets/               # Static assets
├── src/                  # React source (for future SPA features)
├── vercel.json           # Vercel configuration
└── vite.config.js        # Build configuration (for future use)
```

### How It Works

1. **Build Process**
   - No build step required - static files served as-is from root directory
   - `npm install` runs to install API dependencies only

2. **Vercel Deployment**
   - Static files (HTML, JS, CSS) served directly from root directory
   - API functions served from root `api/` as serverless functions
   - Vercel auto-detects API directory and creates serverless functions

3. **Routing**
   - `/` → `index.html` (auto-served by Vercel)
   - `/landing.html` → `landing.html`
   - `/register` → `register.html` (Vercel auto-handles `.html` extension)
   - `/dashboard` → `dashboard.html`
   - `/room.html` → `room.html`
   - `/api/*` → Serverless functions in `api/` directory

### Troubleshooting

#### Build Fails
- **Error**: `vite: not found`
  - **Fix**: Run `npm install` before building
  
#### API Routes Return 404
- **Cause**: API files were copied to `dist/api` instead of staying at root
  - **Fix**: Ensure `vite.config.js` does NOT copy `api` to dist
  - **Verify**: `api/` should exist at project root, not in `dist/`

#### Database Connection Fails
- **Check**: Environment variables are set in Vercel
  - Go to Project Settings → Environment Variables
  - Verify `POSTGRES_URL` is set
  - Redeploy after adding variables

#### JWT Token Errors
- **Check**: `JWT_SECRET` is set in Vercel environment variables
- **Fix**: Add JWT_SECRET and redeploy

#### Database Not Initialized
- **Visit**: `https://your-domain.vercel.app/setup`
- **Check**: `DB_INIT_SECRET` is set in environment variables
- **Run**: Click "Initialize Database" button

### Testing Deployment

1. **Health Check**: `https://your-domain.vercel.app/api/health`
   - Should return database status
   
2. **Landing Page**: `https://your-domain.vercel.app/`
   - Should show React landing page
   
3. **Setup Page**: `https://your-domain.vercel.app/setup`
   - Should show database initialization wizard
   
4. **Dashboard**: `https://your-domain.vercel.app/dashboard`
   - Should show login form

### Migration Notes

#### From Old Configuration
If you had API files in `dist/api`, they need to be at the root:
- Remove `{ src: 'api', dest: '.' }` from `vite.config.js`
- Keep `api/` directory at project root
- Vercel will auto-detect as serverless functions

#### Database Migration (Optional)
The project currently uses `@vercel/postgres`:
- Note: Check latest status - package showed deprecation warnings during development
- If migrating, consider `@neondatabase/serverless` as an alternative
- See [Neon migration guide](https://neon.com/docs/guides/vercel-postgres-transition-guide) if needed

### Security Checklist

- [ ] Strong random `JWT_SECRET` set (not the example value)
- [ ] Strong random `DB_INIT_SECRET` set (not the example value)
- [ ] Database URL uses SSL/TLS
- [ ] Environment variables set for Production environment
- [ ] CORS configured if needed for custom domains
- [ ] Rate limiting enabled on API routes (built-in)

### Support

For issues:
1. Check Vercel deployment logs
2. Visit `/api/health` to check database status
3. Check browser console for client-side errors
4. Review [AUTH_SETUP.md](AUTH_SETUP.md) for authentication setup
