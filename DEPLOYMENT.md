# Deployment Guide

This guide provides detailed instructions for deploying CamBridge to Vercel.

## Prerequisites

- A GitHub account
- A Vercel account (free tier works great)
- Git installed locally

## Method 1: Deploy via Vercel Dashboard (Easiest)

### Step 1: Push to GitHub

1. Create a new repository on GitHub (if not already done)
2. Push your code:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click **"New Project"**
4. Select **"Import Git Repository"**
5. Choose your CamBridge repository
6. Click **"Import"**

### Step 3: Configure Project (Optional)

- **Framework Preset**: None (automatically detected)
- **Root Directory**: `./`
- **Build Command**: `npm run build` (or leave empty)
- **Output Directory**: Leave empty
- **Environment Variables**: None required for basic deployment

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete (usually 30-60 seconds)
3. Visit your deployed site at `https://your-project.vercel.app`

## Method 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy

From your project directory:

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Step 4: Follow Prompts

The CLI will ask:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No (first time) or Yes (subsequent deploys)
- **Project name?** → Accept default or enter custom name
- **Directory?** → Press Enter (current directory)

## Method 3: Deploy via GitHub Actions (CI/CD)

### Step 1: Create Vercel Token

1. Go to Vercel → Settings → Tokens
2. Create a new token
3. Copy the token

### Step 2: Add GitHub Secrets

1. Go to your GitHub repository → Settings → Secrets
2. Add these secrets:
   - `VERCEL_TOKEN`: Your Vercel token
   - `VERCEL_ORG_ID`: Your Vercel org ID (found in project settings)
   - `VERCEL_PROJECT_ID`: Your project ID (found in project settings)

### Step 3: Create Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Verifying Deployment

After deployment, test these URLs:

1. **Landing Page**: `https://your-site.vercel.app/`
2. **Login**: `https://your-site.vercel.app/login`
3. **Register**: `https://your-site.vercel.app/register`
4. **Dashboard**: `https://your-site.vercel.app/dashboard`
5. **Room**: `https://your-site.vercel.app/room/demo`
6. **Health Check**: `https://your-site.vercel.app/api/health`

All pages should load without 404 errors.

## Troubleshooting

### Issue: 404 on Routes

**Solution**: Check `vercel.json` has correct rewrites:
```json
{
  "rewrites": [
    { "source": "/login", "destination": "/login.html" },
    { "source": "/register", "destination": "/register.html" },
    { "source": "/dashboard", "destination": "/dashboard.html" },
    { "source": "/terms", "destination": "/terms.html" },
    { "source": "/privacy", "destination": "/privacy.html" },
    { "source": "/room/:slug", "destination": "/room.html" }
  ]
}
```

### Issue: API Endpoint Not Working

**Solution**: 
- Verify `api/health.js` exists
- Check Vercel build logs for errors
- Ensure the file exports a default function

### Issue: Build Fails

**Solution**:
- Check `package.json` is valid JSON
- Run `npm run build` locally to test
- Check Vercel build logs for specific errors

## Custom Domain (Optional)

### Step 1: Add Domain in Vercel

1. Go to Project Settings → Domains
2. Click "Add"
3. Enter your domain name
4. Click "Add"

### Step 2: Configure DNS

Vercel will provide DNS records. Add these to your domain registrar:

**For Apex Domain (example.com)**:
- Type: A
- Value: 76.76.21.21

**For WWW Subdomain**:
- Type: CNAME
- Value: cname.vercel-dns.com

### Step 3: Wait for SSL

SSL certificates are automatically provisioned (usually takes 1-2 minutes).

## Environment Variables (For Future Extensions)

When you add real APIs and features, you can add environment variables:

1. Go to Project Settings → Environment Variables
2. Add your variables:
   - `DATABASE_URL`: Your database connection string
   - `JWT_SECRET`: Your JWT secret key
   - Any other secrets

3. Redeploy to apply changes

## Monitoring

### View Deployment Logs

1. Go to your Vercel dashboard
2. Click on your project
3. Click on a deployment
4. View real-time logs

### View Analytics (Pro Plan)

Vercel Pro includes:
- Page views
- Response times
- Bandwidth usage
- Geographic distribution

## Rollback

If a deployment has issues:

1. Go to your Vercel dashboard
2. Find the previous working deployment
3. Click the three dots menu
4. Select "Promote to Production"

## Best Practices

1. **Test Locally First**: Always run `npm run dev` and test locally
2. **Use Preview Deployments**: Push to a branch to get a preview URL
3. **Check Build Logs**: Review logs for any warnings or errors
4. **Monitor Performance**: Use Vercel Analytics or external monitoring
5. **Version Control**: Use semantic versioning in your commits

## Next Steps

After successful deployment:

1. Add real authentication APIs
2. Integrate a database (PostgreSQL recommended)
3. Add video conferencing integration (Daily.co, Twilio, etc.)
4. Set up monitoring and error tracking
5. Add custom domain
6. Configure production environment variables

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **Project Issues**: https://github.com/SaltProphet/CamBridge2/issues
