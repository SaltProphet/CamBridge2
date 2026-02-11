# PR #46 Testing Checklist

## Pre-Merge Verification

### ✅ Syntax Validation
- [x] All JavaScript files parse without syntax errors
- [x] api/auth/login.js - Valid
- [x] api/auth/password-login.js - Valid
- [x] api/auth/password-register.js - Valid
- [x] api/db-mock.js - Valid
- [x] api/db.js - Valid
- [x] api/middleware.js - Valid
- [x] All other modified files - Valid

### API Endpoint Tests

#### 1. Database Connection Tests
```bash
# Test 1: With POSTGRES_PRISMA_URL (pooled connection)
export POSTGRES_PRISMA_URL="postgresql://user:pass@host/db?pgbouncer=true"
# Expected: Uses pooled connection

# Test 2: With POSTGRES_URL only
export POSTGRES_URL="postgresql://user:pass@host/db"
unset POSTGRES_PRISMA_URL
# Expected: Falls back to POSTGRES_URL

# Test 3: No database configured
unset POSTGRES_URL POSTGRES_PRISMA_URL
# Expected: Uses mock database with console warning
```

#### 2. api/auth/login.js (Deprecated Endpoint)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Expected Response:
# HTTP 410
# {"error":"Password login endpoint has been removed. Use /api/auth/password-login instead."}
```

#### 3. api/auth/password-login.js
```bash
# Test successful login
curl -X POST http://localhost:3000/api/auth/password-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Expected: 
# - Returns JWT token
# - Session created (or graceful warning if session creation fails)
# - Detailed logs with ✓ checkmarks

# Test with invalid credentials
curl -X POST http://localhost:3000/api/auth/password-login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@example.com","password":"wrong"}'

# Expected:
# HTTP 401
# {"ok":false,"code":"LOGIN_ERROR","error":"Invalid email or password"}

# Test when BETA_MODE is disabled
export BETA_MODE=false
# Expected:
# HTTP 403
# {"ok":false,"code":"BETA_MODE_DISABLED","error":"BETA_MODE is not enabled..."}
```

#### 4. api/auth/password-register.js
```bash
# Test registration with custom slug
curl -X POST http://localhost:3000/api/auth/password-register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@example.com",
    "password":"test123",
    "displayName":"New User",
    "desiredSlug":"new-user",
    "ageConfirm":true,
    "tosAccept":true
  }'

# Expected:
# - User created
# - Creator profile created with slug "new-user"
# - JWT token returned

# Test registration without slug (auto-generate)
curl -X POST http://localhost:3000/api/auth/password-register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"autouser@example.com",
    "password":"test123",
    "displayName":"Auto User",
    "ageConfirm":true,
    "tosAccept":true
  }'

# Expected:
# - Slug auto-generated from displayName ("auto-user")
# - generateUniqueSlug() called with sql parameter (no crash)
```

#### 5. Mock Database (api/db-mock.js)
```javascript
// Test in serverless function
import { sql } from './db-mock.js';

// Test INSERT INTO users (should have conditional block)
const result = await sql`
  INSERT INTO users (email, username, password_hash, display_name, is_active, role, age_confirmed_at, tos_accepted_at, created_at, updated_at)
  VALUES (${email}, ${username}, ${hash}, ${displayName}, ${isActive}, ${role}, ${ageAt}, ${tosAt}, ${createdAt}, ${updatedAt})
  RETURNING id, username, email, display_name
`;
// Expected: User created, returns user object

// Test SELECT full user for login
const user = await sql`
  SELECT id, username, email, password_hash, display_name, role
  FROM users
  WHERE email = ${email}
`;
// Expected: Returns full user with password_hash
```

### Frontend Tests (HTML Pages)

#### 6. public/pages/creator-login.html
```javascript
// Test Case 1: Successful login with JSON response
// Expected:
// - Request logged to console (🔵 LOGIN REQUEST)
// - Response logged (🔵 LOGIN RESPONSE)
// - Body logged (🔵 LOGIN RESPONSE BODY)
// - Success message shown
// - Redirect to dashboard

// Test Case 2: Server returns HTML error (e.g., 500 with HTML page)
// Expected:
// - readResponse() detects non-JSON content-type
// - Shows error: "HTTP 500: [first 500 chars of HTML]"
// - No JSON parse error in console

// Test Case 3: Network error
// Expected:
// - Error logged to console (❌ LOGIN ERROR)
// - Error message shown to user
```

#### 7. public/pages/creator-signup.html
```javascript
// Test Case 1: Successful registration with JSON response
// Expected:
// - Request logged (🔵 REGISTRATION REQUEST)
// - Response logged (🔵 REGISTRATION RESPONSE)
// - Body logged (🔵 REGISTRATION RESPONSE BODY)
// - Success message shown
// - Redirect to dashboard

// Test Case 2: Server returns HTML error
// Expected:
// - readResponse() handles gracefully
// - Shows HTTP status + error text
// - No JSON parse crash

// Test Case 3: Validation errors
// Expected:
// - Detailed error message from server displayed
// - Console shows full error details in DEV mode
```

### Error Handling Tests

#### 8. Session Creation Failure (Graceful Degradation)
```javascript
// In password-login.js, simulate createSession failure
// Expected behavior:
// - Login still succeeds
// - Warning logged: "⚠️  Session creation failed (non-fatal):"
// - User receives JWT token
// - No 500 error thrown
```

#### 9. Database Query Errors
```javascript
// Test with invalid SQL or connection failure
// Expected:
// - Detailed error in console (❌ with error.code, error.stack)
// - User sees appropriate error message
// - In development: Full error details returned
// - In production: Generic error message
```

### Integration Tests

#### 10. Full Registration → Login Flow
1. Visit creator-signup.html
2. Fill form and submit
3. Check console for detailed logs
4. Verify redirect to dashboard
5. Check auth_token cookie set
6. Logout
7. Visit creator-login.html
8. Login with same credentials
9. Verify successful login and redirect

#### 11. Database Pooling Test (Load Test)
```bash
# Make 100 concurrent requests to password-login
seq 1 100 | xargs -P 10 -I {} curl -X POST http://localhost:3000/api/auth/password-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Expected:
# - All requests succeed
# - No "connection pool exhausted" errors
# - Uses createPool() properly
```

## Code Review Verification

### Check All 12 Review Comments Addressed:

1. ✅ **api/auth/login.js** - Disabled properly with 410 response
2. ✅ **api/db-mock.js line 42** - Conditional block restored
3. ✅ **api/middleware.js line 23** - Checks POSTGRES_PRISMA_URL
4. ✅ **creator-signup.html line 397** - Content-type check added
5. ✅ **creator-login.html line 309** - Content-type check added
6. ✅ **password-register.js line 61** - sql parameter restored
7. ✅ **password-login.js line 111** - createSession import added
8. ✅ **password-login.js line 110** - Graceful error handling added
9. ✅ **api/db.js line 3** - Uses createPool for pooled connection
10. ✅ **api/db-mock.js line 43** - Missing conditional fixed
11. ✅ **password-register.js line 58** - sql parameter passed correctly
12. ✅ **api/auth/login.js line 1** - Missing imports issue resolved

## Performance Checks

- [ ] Database connection pooling working (no connection exhaustion)
- [ ] Session creation failures don't block login
- [ ] Mock database works when Postgres unavailable
- [ ] No memory leaks in long-running processes

## Security Checks

- [ ] No secrets exposed in error messages (production mode)
- [ ] Rate limiting works on login endpoint
- [ ] SQL injection prevented (parameterized queries)
- [ ] BETA_MODE gate working correctly

## Documentation

- [x] PR46_FIXES_SUMMARY.md created with all fixes documented
- [x] Patch file created for easy application
- [x] Testing checklist created (this file)
- [ ] Update main README if needed

## Sign-off

**All Critical Issues Fixed**: ✅  
**Syntax Valid**: ✅  
**Ready for Code Review**: ✅  
**Ready for Security Scan**: ✅  
**Ready to Merge**: Pending manual testing above
