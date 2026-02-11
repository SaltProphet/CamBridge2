# BETA MODE Comprehensive Test Plan

## Test Execution Summary
✅ **All tests should be run before deployment**
📋 **Test Categories**: 16 test suites covering infrastructure, auth, UI, and integration

---

## Test Suite 1: Environment Configuration

### 1.1 BETA_MODE Flag Detection
- [ ] When `BETA_MODE=true`: KillSwitch instance has betaMode=true
- [ ] When `BETA_MODE=false`: KillSwitch instance has betaMode=false
- [ ] When `BETA_MODE` not set: defaults to false (safe default)
- [ ] PolicyGates.getStatus() returns { betaMode: true/false }

### 1.2 Process Environment Variables
- [ ] JWT_SECRET configured and accessible
- [ ] DATABASE_URL configured and accessible
- [ ] BETA_MODE value readable via process.env.BETA_MODE
- [ ] Missing secrets logged as warnings, not errors

---

## Test Suite 2: Database Schema

### 2.1 Column Presence
- [ ] creators.plan_status column exists
- [ ] creators.cashapp_handle column exists
- [ ] creators.paypal_link column exists
- [ ] creators.paid_until column exists

### 2.2 Column Attributes
- [ ] plan_status default is 'beta' (for new creators)
- [ ] cashapp_handle nullable
- [ ] paypal_link nullable
- [ ] paid_until nullable
- [ ] All columns have correct data types (VARCHAR, TIMESTAMPTZ)

### 2.3 Indexes
- [ ] Index on creators(plan_status) created
- [ ] Index on creators(paid_until) created
- [ ] Indexes improve query performance for filtering

### 2.4 Migration Idempotency
- [ ] Running migration twice doesn't error
- [ ] Existing data preserved after migration
- [ ] ALTER TABLE commands safe re-run

---

## Test Suite 3: Password Registration Endpoint

### 3.1 Valid Registration (POST /api/auth/password-register)
- [ ] Email + password + slug + age/ToS checkboxes → user created
- [ ] Returns 200 status code
- [ ] Returns JWT token in response
- [ ] Returns user object with id, email, slug
- [ ] Returns HttpOnly cookie with jwt
- [ ] User record exists in users table
- [ ] Creator record exists in creators table with plan_status='beta'

### 3.2 Email Validation
- [ ] Invalid email format rejected (returns 400)
- [ ] Empty email rejected (returns 400)
- [ ] Duplicate email rejected (returns 409)
- [ ] Email validation message clear in response

### 3.3 Password Validation
- [ ] Password < 8 chars rejected (returns 400)
- [ ] Empty password rejected (returns 400)
- [ ] Password and confirmPassword must match (returns 400)
- [ ] Password bcrypted (not plaintext) in database
- [ ] Password validation message clear in response

### 3.4 Slug Validation
- [ ] Slug 3-50 chars required (returns 400 if outside)
- [ ] Slug must match [a-z0-9-] pattern (returns 400)
- [ ] Slug converted to lowercase even if mixed case entered
- [ ] Duplicate slug handled: attempt multiple times with counter suffix
- [ ] Slug validation message clear in response

### 3.5 Age Attestation
- [ ] ageConfirm checkbox required (not Optional)
- [ ] If missing, returns 400 with clear message
- [ ] Stores confirmation in database (implicitly via successful signup)

### 3.6 ToS Acceptance
- [ ] tosAccept checkbox required
- [ ] If missing, returns 400 with clear message
- [ ] Stores acceptance in database (implicitly via successful signup)

### 3.7 Security
- [ ] Password never logged
- [ ] Password never returned in response
- [ ] JWT token signed with JWT_SECRET
- [ ] JWT token expires in 7 days
- [ ] HttpOnly flag set on cookie
- [ ] SameSite=Strict set on cookie

### 3.8 Edge Cases
- [ ] Display name with spaces works
- [ ] Display name unicode characters handled
- [ ] Display name max 100 chars
- [ ] Multiple rapid signups same email rejected

---

## Test Suite 4: Password Login Endpoint

### 4.1 Valid Login (POST /api/auth/password-login)
- [ ] Email + password → JWT token returned
- [ ] Returns 200 status code
- [ ] Returns JWT token in response body
- [ ] Returns HttpOnly cookie with jwt
- [ ] Token valid for 7 days
- [ ] Session record created in sessions table

### 4.2 Authentication Failures
- [ ] Invalid email returns 401 (not 400 "wrong email says user not found")
- [ ] Invalid password returns 401
- [ ] Non-existent user returns 401
- [ ] Error messages generic (don't reveal user existence)

### 4.3 Rate Limiting
- [ ] 10 failed login attempts/hour per email allowed
- [ ] 11th attempt in same hour returns 429
- [ ] Rate limit resets after 1 hour
- [ ] Rate limit counter per email (not per IP)
- [ ] Successful login resets counter

### 4.4 Input Validation
- [ ] Empty email rejected (400)
- [ ] Empty password rejected (400)
- [ ] Malformed email rejected (400)
- [ ] Clear error messages on validation failure

### 4.5 Security
- [ ] Password never logged
- [ ] JWT signed correctly
- [ ] Token verified before allowing API access
- [ ] SameSite=Strict verified on cookie

---

## Test Suite 5: Policy Gates - BETA_MODE Bypass

### 5.1 Subscription Bypass
- [ ] When BETA_MODE=true + creator.plan_status='beta' → PolicyGates.checkCreatorStatus() returns allowed
- [ ] When BETA_MODE=false → subscription checks enforced (not bypassed)
- [ ] When plan_status != 'beta' → subscription checks enforced
- [ ] Bypass happens only in checkCreatorStatus, not other gates

### 5.2 Other Gates Preserved
- [ ] Age gate still enforced for beta creators
- [ ] ToS gate still enforced for beta creators
- [ ] Bans still enforced for beta creators
- [ ] Rate limits still enforced for beta creators
- [ ] No gate disabled by BETA_MODE except subscription

### 5.3 Onboarding Integration
- [ ] Creator registration routes through onboard.js
- [ ] Policy gates checked before onboard approval
- [ ] Beta creators bypass subscription check but pass other gates
- [ ] Non-beta creators must pass subscription check

---

## Test Suite 6: Creator Info API

### 6.1 GET /api/creator/info (Authenticated)
- [ ] Returns 200 status code
- [ ] Returns all creator fields: slug, displayName, bio
- [ ] Returns NEW fields: planStatus, cashappHandle, paypalLink
- [ ] Returns creatorUrl (slug-based)
- [ ] Returns rooms array
- [ ] Returns only authenticated creator's info (not others)
- [ ] Returns 401 if not authenticated

### 6.2 PUT /api/creator/info (Update)
- [ ] Accepts displayName update
- [ ] Accepts bio update
- [ ] Accepts cashappHandle update (new)
- [ ] Accepts paypalLink update (new)
- [ ] Returns 200 on success
- [ ] Updates stored in database
- [ ] Returns updated creator object

### 6.3 CashApp Handle Validation
- [ ] Null allowed (payment optional)
- [ ] Max 255 chars enforced
- [ ] Alphanumeric + dots, hyphens, underscores allowed
- [ ] Invalid characters rejected
- [ ] Stripped of whitespace
- [ ] Stored in database correctly

### 6.4 PayPal Link Validation
- [ ] Null allowed (payment optional)
- [ ] Must be valid URL (http/https required)
- [ ] Max 500 chars enforced
- [ ] Invalid URL rejected
- [ ] Standard URLs stored correctly
- [ ] Stored in database correctly

### 6.5 Security
- [ ] Only authenticated creator can update own info
- [ ] Cannot update other creator's info (401/403)
- [ ] Validation prevents injection attacks (SQL, XSS)
- [ ] Payment fields escaped in responses

---

## Test Suite 7: Public Creator Info Endpoint

### 7.1 GET /api/creator/public-info?slug=xyz (No Auth Required)
- [ ] Returns 200 status code
- [ ] No authentication required (unsafe endpoint by design)
- [ ] Returns only: slug, displayName, cashappHandle, paypalLink
- [ ] Does NOT return: bio, email, plan_status, userId, etc.
- [ ] Case-insensitive slug matching
- [ ] Returns 404 if creator not found
- [ ] Returns 404 if creator inactive/deleted

### 7.2 Data Safety
- [ ] Email address NOT exposed
- [ ] Creator ID NOT exposed
- [ ] Personal details NOT exposed
- [ ] Only safe data for display on client

---

## Test Suite 8: Room Payment Links Display

### 8.1 room.js loadPaymentLinks()
- [ ] Fetches from /api/creator/public-info?slug={slug}
- [ ] Silently fails if endpoint returns 404 (no console errors)
- [ ] Silently fails if creator has no payment links (clean degradation)
- [ ] Displays payment-links section only if links present
- [ ] Creates CashApp button if cashappHandle exists
- [ ] Creates PayPal button if paypalLink exists

### 8.2 Button Rendering
- [ ] CashApp button: href="https://cash.app/{handle}"
- [ ] PayPal button: href="{paypalLink}"
- [ ] Both buttons: target="_blank" rel="noopener noreferrer"
- [ ] Buttons styled consistently with room theme
- [ ] Buttons positioned below access code input

### 8.3 HTML Safety
- [ ] Handle properly escaped (no XSS injection possible)
- [ ] Link properly escaped (no XSS injection possible)
- [ ] Viewer cannot see creator personal data
- [ ] Payment buttons only appear for creator rooms

---

## Test Suite 9: Creator Signup Page (creator-signup.html)

### 9.1 Form Fields Present
- [ ] Email input field exists
- [ ] Display name input field exists
- [ ] Desired slug input field exists
- [ ] Password input field exists
- [ ] Confirm password input field exists
- [ ] Age confirmation checkbox exists
- [ ] ToS acceptance checkbox exists
- [ ] Submit button exists

### 9.2 Client-Side Validation
- [ ] Email format validated (basic regex)
- [ ] Password ≥ 8 chars validated
- [ ] Password and confirm password must match
- [ ] All required fields trigger errors if empty
- [ ] Checkboxes must be checked before submit
- [ ] Error messages display inline or summary

### 9.3 Form Submission
- [ ] POST to /api/auth/password-register
- [ ] Passes all form data correctly
- [ ] Includes Content-Type: application/json
- [ ] Bearer/JWT handling for auth (not needed for signup)

### 9.4 Success Response
- [ ] Redirects to /creator-dashboard.html
- [ ] Stores JWT token in localStorage
- [ ] Stores JWT token in HttpOnly cookie
- [ ] No errors in console

### 9.5 Error Handling
- [ ] Server error displayed to user
- [ ] Duplicate email error shown clearly
- [ ] Validation errors shown for each field
- [ ] Rate limit error shown clearly
- [ ] Network error handled gracefully

### 9.6 Responsive Design
- [ ] Form centered on desktop
- [ ] Form readable on mobile (>16px font)
- [ ] Input fields full width on mobile
- [ ] Touch-friendly button size (>48px)

### 9.7 Styling
- [ ] Dark theme applied (--bg-dark, --text-light)
- [ ] JetBrains Mono font loaded
- [ ] Accent color (#00ff88) used for active state
- [ ] Focus styles visible for accessibility

---

## Test Suite 10: Creator Login Page (creator-login.html)

### 10.1 Form Fields Present
- [ ] Email input field exists
- [ ] Password input field exists
- [ ] Submit button exists
- [ ] Link to signup page exists

### 10.2 Client-Side Validation
- [ ] Email and password required
- [ ] Non-empty validation on submit
- [ ] Error messages display clearly

### 10.3 Form Submission
- [ ] POST to /api/auth/password-login
- [ ] Passes email + password correctly
- [ ] Content-Type: application/json

### 10.4 Success Response
- [ ] Redirects to /creator-dashboard.html
- [ ] Stores JWT token in localStorage
- [ ] Stores JWT token in HttpOnly cookie

### 10.5 Error Handling
- [ ] Invalid credentials: "Invalid email or password" (generic)
- [ ] Rate limit: "Too many attempts, try again later"
- [ ] Network error: clear message
- [ ] No user existence leakage in errors

### 10.6 Responsive Design
- [ ] Mobile-optimized layout
- [ ] Touch-friendly inputs and buttons

---

## Test Suite 11: Creator Dashboard (creator-dashboard.html)

### 11.1 Page Load Authentication
- [ ] Fetches JWT token from localStorage or cookie
- [ ] Includes Bearer token in Authorization header
- [ ] Redirects to login if not authenticated
- [ ] Handles 401/403 responses with redirect

### 11.2 Creator Info Section
- [ ] Displays creator slug
- [ ] Displays creator URL (copyable)
- [ ] Displays display name
- [ ] Copy-to-clipboard button works for slug/URL
- [ ] Loads from GET /api/creator/info

### 11.3 Rooms Section
- [ ] Displays grid of rooms
- [ ] Each room shows room URL (copyable)
- [ ] Copy button copies room URL
- [ ] Loads from GET /api/rooms
- [ ] Handles empty rooms list gracefully

### 11.4 Payment Links Section
- [ ] Form fields for CashApp handle
- [ ] Form fields for PayPal link
- [ ] Save button submits PUT /api/creator/info
- [ ] Displays saved values on load
- [ ] Shows success message on save
- [ ] Shows error message on failure

### 11.5 Logout
- [ ] Logout button present
- [ ] Clears localStorage token
- [ ] Deletes HttpOnly cookie
- [ ] Redirects to login page

### 11.6 Error Handling
- [ ] Network error shows message
- [ ] Validation error shows message
- [ ] Expired token triggers re-auth
- [ ] 404 not found handled well

### 11.7 Loading States
- [ ] Loading spinner shows during API calls
- [ ] Buttons disabled during submission
- [ ] Clear feedback on success/failure

---

## Test Suite 12: Room Integration

### 12.1 room.html Payment Links Section
- [ ] HTML element id="payment-links" exists
- [ ] Element initially hidden (display: none)
- [ ] Element contains div id="payment-buttons"
- [ ] Element positioned after access code input

### 12.2 Payment Links Display
- [ ] Shows when creator has payment links
- [ ] Hides when creator has no payment links
- [ ] Hides when creator not found
- [ ] Hides on API error
- [ ] "SUPPORT" label visible when displayed

### 12.3 Button Functionality
- [ ] CashApp button opens cash.app link
- [ ] PayPal button opens paypal link
- [ ] Links open in new window
- [ ] Links don't interfere with room access

---

## Test Suite 13: Landing Page Integration

### 13.1 Creator CTAs Present
- [ ] "Start Earning Today" heading visible
- [ ] "Creator Sign Up" button points to /creator-signup.html
- [ ] "Creator Login" button points to /creator-login.html
- [ ] Buttons styled consistently with landing page

### 13.2 Button Styling
- [ ] Creator Sign Up button: primary style (gold/accent)
- [ ] Creator Login button: secondary style (transparent border)
- [ ] Buttons responsive on mobile
- [ ] Touch-friendly size

---

## Test Suite 14: Existing Features Not Broken

### 14.1 Magic Link Auth (Not Affected)
- [ ] Magic link signup still works
- [ ] Magic link login still works
- [ ] Magic link users can create rooms
- [ ] Magic link users can join rooms

### 14.2 Room Access Flow
- [ ] Existing room access gatekeeper works
- [ ] Age gate still enforced
- [ ] ToS gate still enforced
- [ ] Access code validation works
- [ ] Video conferencing loads correctly

### 14.3 Join Requests
- [ ] Join requests still work for non-public rooms
- [ ] Creator approval/denial works
- [ ] Join request UI displays correctly

### 14.4 Room Management
- [ ] Creators can create rooms (magic link users)
- [ ] Creators can set room names
- [ ] Creators can set access codes
- [ ] Creators can set public/private

---

## Test Suite 15: Security & Privacy

### 15.1 Password Security
- [ ] bcryptjs hashing verified (cost 10 rounds)
- [ ] Plaintext passwords never stored
- [ ] Plaintext passwords never logged
- [ ] Passwords never in API responses

### 15.2 Token Security
- [ ] JWT tokens signed with JWT_SECRET
- [ ] Token expiration enforced (7 days)
- [ ] Token validation before API access
- [ ] Expired tokens rejected

### 15.3 Cookie Security
- [ ] HttpOnly flag set (not accessible from JS)
- [ ] SameSite=Strict set (CSRF protection)
- [ ] Secure flag set (HTTPS only in production)

### 15.4 Data Privacy
- [ ] Transcripts not stored (existing feature check)
- [ ] Payment info not logged
- [ ] User emails not exposed publicly
- [ ] Database queries optimized (no N+1)

### 15.5 Input Sanitization
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS injection prevented (output escaping)
- [ ] Path traversal prevented
- [ ] No eval() or dangerous functions

---

## Test Suite 16: Database & Performance

### 16.1 Database Migrations
- [ ] Migration file exists: scripts/beta-mode-migration.sql
- [ ] Migration is idempotent (safe to re-run)
- [ ] Migration adds all required columns
- [ ] Migration creates required indexes

### 16.2 Query Performance
- [ ] Creator lookup by slug < 100ms (with index)
- [ ] Creator info fetch < 100ms
- [ ] Room list fetch < 200ms
- [ ] No N+1 queries detected

### 16.3 Concurrent Access
- [ ] Multiple concurrent logins work
- [ ] Multiple concurrent signups work
- [ ] Database connection pool sufficient
- [ ] No connection exhaustion

---

## Test Execution Commands

### Prerequisites
```bash
# 1. Set environment variables
export BETA_MODE=true
export JWT_SECRET=test-secret-key
export DATABASE_URL=your-test-db-connection

# 2. Run database migration
psql -U postgres -d your_test_db -f scripts/beta-mode-migration.sql

# 3. Verify environment
node -e "console.log('BETA_MODE:', process.env.BETA_MODE)"
```

### Run Full Test Suite
```bash
# Unit tests
npm test

# Integration tests  
npm test -- --integration

# End-to-end tests
npm test -- --e2e

# Performance tests
npm test -- --perf
```

### Manual Testing Checklist
```
1. Creator Signup Flow
   - Open /creator-signup.html
   - Enter test email
   - Create password
   - Accept checkboxes
   - Submit → verify redirect to dashboard

2. Creator Dashboard
   - Verify creator URL displayed
   - Verify rooms displayed  
   - Add CashApp handle
   - Add PayPal link
   - Save → verify success

3. Room Payment Display
   - Open /room/{slug}
   - Enter room access code
   - Verify payment buttons visible
   - Click CashApp button → verify external redirect
   - Click PayPal button → verify external redirect

4. Existing Features
   - Test magic link signup (not broken)
   - Test room access flow (not broken)
   - Test join requests (not broken)
```

---

## Test Success Criteria

### All Suites Must Pass
- ✅ 100% of tests pass
- ✅ 0 console errors
- ✅ 0 database errors
- ✅ 0 API response errors
- ✅ <200ms avg response time
- ✅ 0 security vulnerabilities

### Performance Targets
- ✅ Page load < 2 seconds
- ✅ API response < 300ms
- ✅ Payment button render < 500ms

### Security Validation
- ✅ No SQL injection possible
- ✅ No XSS injection possible
- ✅ No CSRF attacks possible
- ✅ No password logged
- ✅ All cookies HttpOnly

---

## Expected Results Summary

**BETA MODE Features Working**:
- ✅ Creator self-signup without email verification
- ✅ Creator self-login with password
- ✅ Creator dashboard with payment links
- ✅ Payment links displayed in rooms
- ✅ Existing features unbroken

**Zero Impact**:
- ✅ Magic link auth unchanged
- ✅ Room access flow unchanged
- ✅ Policy gates (age, ToS, bans) unchanged
