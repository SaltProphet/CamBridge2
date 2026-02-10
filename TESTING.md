# Testing Guide for CamBridge Authentication System

## Overview
This document provides a comprehensive testing plan for the new authentication system.

## Prerequisites
- Postgres database configured
- Environment variables set in `.env`
- Development server running (`npm run dev`)

## Test Plan

### 1. Database Initialization

**Test**: Initialize database tables
```bash
curl -X POST http://localhost:3000/api/init-db \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-db-init-secret"}'
```

**Expected Result**: 
- Status 200
- Response: `{"success": true, "message": "Database tables initialized successfully"}`

**Verification**:
- Check database for `users`, `rooms`, and `sessions` tables
- Verify indexes are created

---

### 2. Model Registration

**Test**: Register a new model account

Navigate to: `http://localhost:3000/register`

**Test Data**:
- Username: `testmodel`
- Email: `test@example.com`
- Password: `SecurePass123`
- Display Name: `Test Model`

**Expected Result**:
- Success message displayed
- Account created message
- Room created automatically
- Redirect to login page after 2 seconds

**Verification**:
- Check `users` table for new user
- Check `rooms` table for new room
- Verify password is hashed (not plain text)

**Error Cases to Test**:
- Duplicate username → "Username already taken"
- Duplicate email → "Email already registered"
- Weak password → Password requirements error
- Invalid username characters → Validation error
- Rate limiting → Try 6 registrations in quick succession

---

### 3. Model Login

**Test**: Login with registered credentials

Navigate to: `http://localhost:3000/dashboard`

**Test Data**:
- Username: `testmodel`
- Password: `SecurePass123`

**Expected Result**:
- JWT token received
- Dashboard displayed
- Room information shown
- Access code displayed

**Verification**:
- Check localStorage for `authToken`
- Check localStorage for `userData`
- Check `sessions` table for new session entry

**Error Cases to Test**:
- Wrong password → "Invalid username or password"
- Non-existent username → "Invalid username or password"
- Empty fields → Validation errors
- Rate limiting → Try 11 login attempts in 15 minutes

---

### 4. Profile Management

**Test**: Get profile information
```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Result**:
- Status 200
- User data returned (no password hash)
- Room data included

**Test**: Update profile
```bash
curl -X PUT http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Updated Name",
    "bio": "Test bio",
    "avatarUrl": "https://example.com/avatar.jpg"
  }'
```

**Expected Result**:
- Status 200
- Updated user data returned

**Error Cases to Test**:
- No token → 401 Unauthorized
- Invalid token → 401 Unauthorized
- Expired token → 401 Unauthorized

---

### 5. Room Management

**Test**: List rooms
```bash
curl -X GET http://localhost:3000/api/rooms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Result**:
- Status 200
- Array of rooms returned

**Test**: Create new room
```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roomName": "testroom2"}'
```

**Expected Result**:
- Status 201
- New room created with access code

**Test**: Update room access code
```bash
curl -X PUT http://localhost:3000/api/rooms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 1,
    "accessCode": "NEWCODE1"
  }'
```

**Expected Result**:
- Status 200
- Updated room data returned

**Error Cases to Test**:
- Duplicate room name → 400 error
- Invalid room ID → 404 error
- Update another user's room → 404 error (ownership check)

---

### 6. Room Access Verification

**Test**: Verify valid access code
```bash
curl -X POST http://localhost:3000/api/rooms/verify-access \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "testmodel",
    "accessCode": "YOUR_ACCESS_CODE"
  }'
```

**Expected Result**:
- Status 200
- Access granted message
- Room data returned

**Test**: Verify invalid access code
```bash
curl -X POST http://localhost:3000/api/rooms/verify-access \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "testmodel",
    "accessCode": "WRONGCODE"
  }'
```

**Expected Result**:
- Status 401
- Error message: "Invalid access code"

**Error Cases to Test**:
- Non-existent room → 404 error
- Inactive room → 403 error

---

### 7. Client Room Access Flow

**Test**: Complete client flow

1. Navigate to: `http://localhost:3000/room/testmodel`
2. Enter access code in gatekeeper
3. Click "ESTABLISH_LINK"

**Expected Result**:
- API verification happens first
- If API succeeds, access granted
- If API fails (404), fallback to localStorage
- Video container shown
- Daily.co call starts

**Verification**:
- Check browser console for logs
- Check network tab for API call
- Verify video call initializes

---

### 8. Logout

**Test**: Logout from dashboard

Click "Logout" link in dashboard

**Expected Result**:
- API call to `/api/auth/logout`
- localStorage cleared
- Redirected to login page

**Verification**:
- Check localStorage is empty
- Check `sessions` table - token should be deleted

---

### 9. Session Expiration

**Test**: Token expiration after 7 days

Manually set a token with past expiration:
```javascript
// In browser console
localStorage.setItem('authToken', 'expired-token');
```

Refresh page

**Expected Result**:
- API call fails with 401
- User redirected to login
- Error message shown

---

### 10. Security Tests

**Test**: SQL Injection attempts
```bash
# Try SQL injection in username
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin'\'' OR 1=1--", "password": "test"}'
```

**Expected Result**:
- Sanitized input
- Login fails (user not found)
- No SQL error

**Test**: XSS attempts
```bash
# Try XSS in display name
curl -X PUT http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "<script>alert(1)</script>"}'
```

**Expected Result**:
- Input sanitized
- No script tags in response

**Test**: Rate limiting
- Register 6 times quickly → Should be blocked
- Login 11 times quickly → Should be blocked

---

## Integration Tests

### Complete Model Onboarding Flow
1. Register account at `/register`
2. Login at `/dashboard`
3. View room information
4. Change access code
5. Update profile
6. Logout
7. Login again
8. Room access still works

### Complete Client Flow
1. Navigate to model's room URL
2. Enter access code
3. Access verified via API
4. Video call starts
5. Video features work (PIP, controls, etc.)

---

## Performance Tests

### Database Performance
- Test with 100 users
- Test with 1000 rooms
- Measure query times
- Check index effectiveness

### API Response Times
- Login endpoint: < 200ms
- Profile endpoint: < 100ms
- Room verification: < 150ms

---

## Browser Compatibility

Test in:
- ✓ Chrome (latest)
- ✓ Firefox (latest)
- ✓ Safari (latest)
- ✓ Edge (latest)
- ✓ Mobile Chrome
- ✓ Mobile Safari

---

## Checklist

### Functionality
- [ ] Database initialization works
- [ ] Registration creates user and room
- [ ] Login returns JWT token
- [ ] Dashboard loads profile correctly
- [ ] Access code changes update database
- [ ] Profile updates save correctly
- [ ] Room access verification works
- [ ] Logout clears session
- [ ] Token expiration handled properly

### Security
- [ ] Passwords are hashed
- [ ] JWT tokens are signed
- [ ] Rate limiting works
- [ ] Input sanitization works
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] CSRF protection (if applicable)
- [ ] Session tokens expire

### Edge Cases
- [ ] Duplicate username/email handled
- [ ] Invalid room names rejected
- [ ] Expired tokens handled
- [ ] Database connection errors handled
- [ ] API unavailable gracefully handled
- [ ] Backwards compatibility maintained

### Documentation
- [ ] README updated
- [ ] AUTH_SETUP.md complete
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Setup instructions clear

---

## Known Issues

(Add any known issues here as they're discovered)

---

## Production Deployment Checklist

- [ ] Generate strong JWT_SECRET (32+ chars)
- [ ] Set secure DB_INIT_SECRET
- [ ] Configure Postgres database
- [ ] Set up environment variables in Vercel
- [ ] Run database initialization once
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Verify HTTPS is enabled
- [ ] Check CORS configuration
- [ ] Monitor error logs
- [ ] Set up backup strategy for database
