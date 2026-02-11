# Deployment Checklist

## Pre-Deployment

- [ ] All files committed to git
- [ ] Dependencies installed (`npm install`)
- [ ] All API files pass syntax check
- [ ] Database schema ready (`schema.sql`)
- [ ] README.md updated
- [ ] .gitignore properly configured

## Vercel Configuration

### Environment Variables (Required)
```
POSTGRES_URL=postgresql://username:password@host:port/database
JWT_SECRET=<generate-a-strong-random-secret>
```

To generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database Setup
1. Create PostgreSQL database (Vercel Postgres, Neon, Supabase, etc.)
2. Get connection string
3. Run `schema.sql` against database
4. Verify tables created

### Vercel Settings
- Build Command: `echo 'No build required'`
- Output Directory: `.`
- Install Command: `npm install`
- Framework Preset: Other

## Deployment Steps

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Set environment variables:
```bash
vercel env add POSTGRES_URL
vercel env add JWT_SECRET
```

5. Redeploy to apply env vars:
```bash
vercel --prod
```

## Post-Deployment Verification

### Test Landing Page
```bash
curl https://your-domain.vercel.app/
```
Should return HTML with "Register" and "Login" buttons.

### Test Registration
```bash
curl -X POST https://your-domain.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","ageConfirmed":true}'
```
Should return: `{"ok":true}`

### Test Login
```bash
curl -X POST https://your-domain.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' \
  -i
```
Should return: `{"ok":true}` with Set-Cookie header

### Test Auth Flow
1. Visit `/register` in browser
2. Create account
3. Login at `/login`
4. Should redirect to `/dashboard`
5. Create a room
6. Visit `/room/your-slug`

## Security Checklist

- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Database connection uses SSL
- [ ] POSTGRES_URL is not committed to git
- [ ] HttpOnly cookies enabled
- [ ] HTTPS enabled (automatic on Vercel)

## Monitoring

### Check Logs
```bash
vercel logs
```

### Database Connections
Monitor your PostgreSQL provider dashboard for:
- Connection count
- Query performance
- Error rates

## Rollback Plan

If deployment fails:
```bash
vercel rollback
```

Or redeploy previous commit:
```bash
git checkout <previous-commit>
vercel --prod
```

## Domain Setup (Optional)

1. Add custom domain in Vercel dashboard
2. Update DNS records as instructed
3. SSL certificate auto-provisioned

## Troubleshooting

### "Internal Server Error" on API calls
- Check Vercel logs: `vercel logs`
- Verify environment variables are set
- Test database connection

### "401 Unauthorized" on /api/me
- JWT_SECRET not set or incorrect
- Cookie not being sent
- Token expired

### Database connection errors
- Verify POSTGRES_URL format
- Check database provider is accessible
- Ensure SSL/TLS settings match

### Routes not working
- Verify vercel.json is in root
- Check route patterns match
- Clear Vercel cache and redeploy

## Success Criteria

✅ All pages load (/, /login, /register, /dashboard, /room/*, /terms, /privacy)
✅ User registration works
✅ Login sets cookie and redirects to dashboard
✅ Room creation works
✅ Public room pages display
✅ Logout clears session
✅ No console errors
✅ All API endpoints respond correctly
