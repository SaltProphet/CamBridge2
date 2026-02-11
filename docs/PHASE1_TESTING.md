# Phase 1 Testing Guide

## Overview
This guide provides comprehensive testing procedures for Phase 1: Email Magic-Link Auth, Age Gate, Creator Onboarding, and Join Request Workflow.

## Prerequisites

### 1. Database Setup
```bash
# Run the Phase 1 migration
psql $POSTGRES_URL -f scripts/phase1-migration.sql

# Or use the API endpoint
curl -X POST http://localhost:3000/api/init-db \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-db-init-secret"}'
```

### 2. Environment Variables
Ensure these are set in your environment:
```bash
# Required
POSTGRES_URL=postgresql://...
JWT_SECRET=your-jwt-secret
DAILY_API_KEY=your-daily-api-key
RESEND_API_KEY=your-resend-api-key
APP_BASE_URL=http://localhost:3000

# Optional (for testing)
EMAIL_PROVIDER=console  # Logs emails to console instead of sending
NODE_ENV=development
```

### 3. Start Development Server
```bash
# Using Vercel CLI (recommended)
vercel dev

# Or any static server
python -m http.server 3000
```

## Test Scenarios

### Scenario 1: New User - Complete Flow

#### Step 1: Age Gate and ToS
1. Navigate to `http://localhost:3000/room/testcreator`
2. **Expected**: Age gate modal appears
3. Try clicking "CONFIRM" without checking the box
4. **Expected**: Button is disabled
5. Check the "I am 18 years of age or older" box
6. **Expected**: Button becomes enabled
7. Click "CONFIRM"
8. **Expected**: ToS modal appears

#### Step 2: Terms of Service
1. Try clicking "ACCEPT" without checking the box
2. **Expected**: Button is disabled
3. Scroll through the ToS text
4. Check the "I accept the Terms of Service" box
5. **Expected**: Button becomes enabled
6. Click "ACCEPT"
7. **Expected**: Email login modal appears

#### Step 3: Magic-Link Authentication
1. Enter an invalid email (e.g., "notanemail")
2. **Expected**: Error message "Invalid email format"
3. Enter a valid email: `test@example.com`
4. Click "SEND MAGIC LINK"
5. **Expected**: Button changes to "SENDING..." then "SENT"
6. **Expected**: Success message appears
7. If EMAIL_PROVIDER=console, check server logs for the magic link
8. Copy the magic link URL from console
9. Open the magic link in the same browser
10. **Expected**: Redirected to `/room/testcreator`
11. **Expected**: Cookie `auth_token` is set (check DevTools → Application → Cookies)

#### Step 4: Join Request
1. After magic-link callback, join request modal should appear
2. **Expected**: "Requesting access to room..." message with loading spinner
3. **Expected**: Status changes to "Waiting for creator approval..."
4. Modal starts polling every 3 seconds

### Scenario 2: Creator Onboarding

#### Step 1: Become a Creator
1. Authenticate using magic-link (Scenario 1, Steps 1-3)
2. Open browser console and run:
```javascript
fetch('/api/creator/onboard', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1].split(';')[0]}`
  },
  body: JSON.stringify({
    displayName: 'Test Creator',
    slug: 'testcreator'
  })
}).then(r => r.json()).then(console.log)
```
3. **Expected**: Response with creator account and default room created
4. **Expected**: `creator_id` returned, `slug` is 'testcreator'
5. **Expected**: Main room created: `testcreator-main`

#### Step 2: Verify Creator Status
```javascript
fetch('/api/creator/info', {
  headers: {
    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1].split(';')[0]}`
  }
}).then(r => r.json()).then(console.log)
```
**Expected**: Creator info returned with slug, plan, status

### Scenario 3: Creator Dashboard - Join Requests

#### Step 1: Access Dashboard as Creator
1. Navigate to `http://localhost:3000/dashboard.html`
2. Login with creator account credentials
3. **Expected**: Dashboard loads
4. **Expected**: "Join Requests" card is visible
5. **Expected**: "Banned Users" card is visible

#### Step 2: View Pending Requests
1. In another browser/incognito window, complete Scenario 1 to create a join request
2. Return to creator dashboard
3. Wait up to 10 seconds (auto-poll interval)
4. **Expected**: Pending join request appears in "Join Requests" card
5. **Expected**: Shows user email, username, room, and timestamp

#### Step 3: Approve Join Request
1. Click "Approve" button on a pending request
2. **Expected**: Success message
3. **Expected**: Request disappears from list
4. **Expected**: Daily token is minted (check API logs)
5. In the requesting user's browser:
6. **Expected**: Status changes to "Access approved! You can now enter the room."
7. **Expected**: "ENTER ROOM" button appears
8. Click "ENTER ROOM"
9. **Expected**: Video call starts with Daily.co iframe
10. **Expected**: User joins with the minted token

#### Step 4: Deny Join Request
1. Create another join request (Scenario 1 from different browser)
2. In creator dashboard, click "Deny" on the request
3. Enter a reason: "Not available right now"
4. **Expected**: Request disappears from pending list
5. In requesting user's browser:
6. **Expected**: Status changes to "Access denied: Not available right now"

### Scenario 4: Ban Management

#### Step 1: Ban a User by Email
1. In creator dashboard, open browser console:
```javascript
fetch('/api/creator/ban', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1].split(';')[0]}`
  },
  body: JSON.stringify({
    email: 'banned@example.com',
    reason: 'Violation of terms'
  })
}).then(r => r.json()).then(console.log)
```
2. **Expected**: Ban created successfully
3. Refresh the "Banned Users" card
4. **Expected**: Banned user appears in the list

#### Step 2: Test Ban Enforcement
1. In another browser, go through magic-link auth as `banned@example.com`
2. After authentication, attempt to create a join request
3. **Expected**: Error "You are banned from this creator's rooms"
4. **Expected**: No join request is created

#### Step 3: Unban User
1. In creator dashboard, click "Unban" button
2. **Expected**: Confirmation dialog
3. Confirm unban
4. **Expected**: User removed from banned list
5. Banned user can now create join requests again

### Scenario 5: Rate Limiting

#### Test 1: Magic-Link Rate Limit (5 per hour)
1. Send 5 magic-link requests for the same email
2. **Expected**: All succeed
3. Send a 6th request within the hour
4. **Expected**: 429 error "Too many login attempts. Please try again in an hour."

#### Test 2: Join Request Rate Limit (10 per hour per creator)
1. As authenticated user, create 10 join requests for the same creator
2. **Expected**: All succeed
3. Try to create an 11th request within the hour
4. **Expected**: 429 error "Too many join requests. Please try again later."

### Scenario 6: Security Tests

#### Test 1: Token Expiration
1. Generate a magic-link token
2. Wait 16 minutes
3. Try to use the expired token
4. **Expected**: "LINK EXPIRED OR ALREADY USED" error page

#### Test 2: Single-Use Tokens
1. Generate and use a magic-link token
2. Try to use the same token again
3. **Expected**: "LINK EXPIRED OR ALREADY USED" error page

#### Test 3: Cookie Security
1. Inspect auth_token cookie in DevTools
2. **Expected**: HttpOnly flag is set
3. **Expected**: SameSite=Strict
4. **Expected**: Secure flag (in production)

#### Test 4: Server-Side Enforcement
1. Try to create a join request without ToS acceptance:
```javascript
// Clear ToS acceptance from database first
fetch('/api/join-request', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1].split(';')[0]}`
  },
  body: JSON.stringify({
    creatorSlug: 'testcreator'
  })
}).then(r => r.json()).then(console.log)
```
2. **Expected**: 403 error with requiresAcceptance flag

### Scenario 7: Kill Switches

#### Test 1: Disable Signups
```bash
KILL_SWITCH_SIGNUPS=false vercel dev
```
1. Try to initiate magic-link auth
2. **Expected**: 403 error "New signups are temporarily disabled"

#### Test 2: Disable Join Approvals
```bash
KILL_SWITCH_JOIN_APPROVALS=false vercel dev
```
1. Try to approve a join request
2. **Expected**: 403 error "Join approvals are temporarily disabled"

## API Testing with curl

### Test Magic-Link Start
```bash
curl -X POST http://localhost:3000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "returnTo": "/room/testcreator"}'
```

### Test User Accept
```bash
curl -X POST http://localhost:3000/api/user/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"ageAttested": true, "tosAccepted": true}'
```

### Test Creator Onboard
```bash
curl -X POST http://localhost:3000/api/creator/onboard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"displayName": "Test Creator", "slug": "testcreator"}'
```

### Test Join Request
```bash
curl -X POST http://localhost:3000/api/join-request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"creatorSlug": "testcreator", "roomSlug": null}'
```

### Test Join Approve
```bash
curl -X POST http://localhost:3000/api/join-approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CREATOR_TOKEN" \
  -d '{"requestId": "REQUEST_UUID"}'
```

### Test Ban User
```bash
curl -X POST http://localhost:3000/api/creator/ban \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CREATOR_TOKEN" \
  -d '{"email": "banned@example.com", "reason": "Violation of terms"}'
```

## Database Verification

### Check Tables Created
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('login_tokens', 'creators', 'join_requests', 'bans');
```

### Check User Roles
```sql
SELECT id, username, email, role, age_attested_at, tos_accepted_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check Creators
```sql
SELECT c.*, u.email 
FROM creators c 
JOIN users u ON c.user_id = u.id;
```

### Check Join Requests
```sql
SELECT jr.*, u.email, c.slug 
FROM join_requests jr 
JOIN users u ON jr.user_id = u.id 
JOIN creators c ON jr.creator_id = c.id 
ORDER BY jr.created_at DESC;
```

### Check Bans
```sql
SELECT b.*, c.slug as creator_slug, u.email as user_email 
FROM bans b 
JOIN creators c ON b.creator_id = c.id 
LEFT JOIN users u ON b.user_id = u.id 
WHERE b.active = true;
```

## Troubleshooting

### Magic-Link Not Received
- Check EMAIL_PROVIDER is set to 'console' for local testing
- Check server logs for magic link URL
- Verify RESEND_API_KEY if using Resend
- Check spam folder if using real email

### Daily Token Minting Fails
- Verify DAILY_API_KEY is set
- Check Daily.co API limits/quota
- Verify room name format: `{slug}-{roomslug}-{type}`
- Check server logs for API errors

### Join Request Not Appearing
- Wait up to 10 seconds for auto-refresh
- Click "Refresh" button manually
- Check browser console for errors
- Verify user role is 'creator'

### Cookie Not Set
- Check APP_BASE_URL matches your domain
- Verify browser allows cookies
- Check SameSite settings for localhost
- Clear existing cookies and retry

## Performance Testing

### Load Testing Join Requests
Create multiple concurrent join requests:
```bash
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/join-request \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer TOKEN_$i" \
    -d '{"creatorSlug": "testcreator"}' &
done
```

### Monitor Rate Limits
Check rate limit response headers and store contents to ensure proper enforcement.

## Success Criteria

✅ All modals appear in correct sequence
✅ Magic-link authentication works end-to-end
✅ Cookies are set with proper security flags
✅ Join requests are created and polled correctly
✅ Creator can approve/deny requests
✅ Daily tokens are minted server-side only
✅ Bans are enforced at join-request gate
✅ Rate limits prevent abuse
✅ Kill switches disable features as expected
✅ No console errors during normal flow
✅ Database migrations run cleanly
✅ All API endpoints return expected responses
✅ XSS prevention works (HTML is escaped)
✅ Existing routes still work (backward compatibility)

## Next Steps (Phase 2+)

- WebSocket for real-time join request notifications
- Email notifications for creators
- Join request history and analytics
- Automatic ban suggestions
- Custom ToS per creator
- User profile management
- Session management (view/revoke)
- Creator analytics dashboard
