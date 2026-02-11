# Test Credentials for Manual Testing

## Quick Reference

| Field | Value |
|-------|-------|
| **Email** | `test@cambridge.app` |
| **Password** | `TestPassword123!` |
| **Creator Slug** | `test-creator` |
| **Display Name** | Test Creator |

## Setup Instructions

### Step 1: Create the Test User in Database

Run this script to add the test user to your database:

```bash
node scripts/create-test-user.js
```

This will:
- Create a test user with the credentials above
- Set plan_status to 'beta' (works with BETA_MODE)
- Confirm age and ToS automatically
- If user already exists, it will display the credentials

### Step 2: Start Your Development Server

Ensure BETA_MODE is enabled in `.env.local`:

```bash
BETA_MODE=true
JWT_SECRET=test-secret-key-for-local-development-only-not-secure
```

Then start your server:
```bash
npm run dev
```

### Step 3: Login with Test Account

Navigate to the creator login page:
```
http://localhost:3000/public/pages/creator-login.html
```

Or if using index.html as entry point:
```
http://localhost:3000/index.html
```

Enter the test credentials:
- **Email**: `test@cambridge.app`
- **Password**: `TestPassword123!`

## What You Can Test

✅ **Creator Login**
- Test password-based authentication
- Verify JWT token generation
- Check session management

✅ **Creator Dashboard**
- View creator profile
- Manage payment links (CashApp, PayPal)
- See list of rooms

✅ **Room Access**
- Test creator room access
- Verify payment buttons display
- Test payment link functionality

✅ **Admin Features**
- Verify BETA_MODE bypass for payment gates
- Check rate limiting (10 logins/hour per email)
- Test age/ToS gate still enforces rules

## Resetting Test User

To remove the test user and create a fresh one:

```sql
-- Delete test user
DELETE FROM creators WHERE email = 'test@cambridge.app';

-- Then run the script again
node scripts/create-test-user.js
```

## Frontend Testing Checklist

- [ ] Login with test@cambridge.app / TestPassword123!
- [ ] Check that JWT token is stored in localStorage
- [ ] Check that HttpOnly cookie is set
- [ ] Verify redirect to creator dashboard
- [ ] Check payment links section works
- [ ] Logout and verify token is cleared
- [ ] Try rate limit (login 11 times) - should get rate limit error on 11th
- [ ] Try invalid password - should get error
- [ ] Try wrong email - should get error

## Troubleshooting

**Error: "BETA_MODE is not enabled"**
- Add `BETA_MODE=true` to `.env.local`
- Restart your development server

**Error: "test@cambridge.app not found"**
- Run: `node scripts/create-test-user.js`
- Verify database connection in `.env.local`

**Error: Database connection failed**
- Check `POSTGRES_URL_NON_POOLING` in `.env.local`
- Ensure PostgreSQL is running
- For local testing without DB, use mock credentials

## Manual Testing Without Database

If you don't have a database connected, you can:

1. **Mock the API Response**
   - Use browser DevTools to intercept and mock the login response
   - Or modify the frontend to skip API calls in test mode

2. **Use a Mock Token**
   - Generate a test JWT token locally
   - Store it in localStorage manually via console:
   ```javascript
   localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   // Then refresh and navigate to dashboard
   ```

3. **Test Endpoints Individually**
   - Use `curl` or Postman to test endpoints
   - Or check API response in browser Network tab

## Next Steps

- **Load Testing**: Create multiple test users with different scenarios
- **Integration Testing**: Test full user flow (signup → login → dashboard → payment)
- **Security Testing**: Test rate limits, XSS prevention, CSRF protection
- **Browser Testing**: Test in Firefox, Chrome, Safari, mobile browsers

---

**Last Updated**: February 11, 2026
**Test Data**: Created for BETA MODE testing only - never use in production
