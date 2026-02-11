# Testing Plan

## Manual Testing Checklist

### 1. Landing Page (/)
- [ ] Page loads successfully
- [ ] "Register" button links to /register
- [ ] "Login" button links to /login
- [ ] "Terms" link works
- [ ] "Privacy" link works

### 2. Registration (/register)
- [ ] Form displays correctly
- [ ] Email validation works
- [ ] Password validation works (min 8 chars)
- [ ] Confirm password matching works
- [ ] Age confirmation checkbox required
- [ ] Submitting valid form redirects to /login
- [ ] Duplicate email shows error
- [ ] Error messages display correctly

### 3. Login (/login)
- [ ] Form displays correctly
- [ ] Valid credentials redirect to /dashboard
- [ ] Invalid credentials show error
- [ ] Cookie is set on successful login
- [ ] "Register" link works

### 4. Dashboard (/dashboard)
- [ ] Page requires authentication (redirects to /login if not logged in)
- [ ] "Create Room" form is visible
- [ ] Room slug validation works
- [ ] Creating room adds it to "My Rooms" list
- [ ] Duplicate slug shows error
- [ ] "Copy Link" button copies room URL
- [ ] "Open" button opens room in new tab
- [ ] "Logout" button clears session and redirects to /login

### 5. Room Page (/room/:slug)
- [ ] Valid room slug shows room info
- [ ] Invalid room slug shows 404 message
- [ ] "Request Access" button is visible (but disabled)

### 6. Terms & Privacy
- [ ] /terms page loads
- [ ] /privacy page loads
- [ ] Back to home links work

## API Testing

### POST /api/register
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","ageConfirmed":true}'
```
Expected: `{"ok":true}`

### POST /api/login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```
Expected: `{"ok":true}` + session cookie set

### GET /api/me
```bash
curl http://localhost:3000/api/me -b cookies.txt
```
Expected: `{"ok":true,"user":{"id":"...","email":"test@example.com"}}`

### POST /api/rooms-create
```bash
curl -X POST http://localhost:3000/api/rooms-create \
  -H "Content-Type: application/json" \
  -d '{"slug":"my-first-room"}' \
  -b cookies.txt
```
Expected: `{"ok":true}`

### GET /api/rooms-list
```bash
curl http://localhost:3000/api/rooms-list -b cookies.txt
```
Expected: `[{"slug":"my-first-room"}]`

### GET /api/rooms-public
```bash
curl "http://localhost:3000/api/rooms-public?slug=my-first-room"
```
Expected: `{"slug":"my-first-room"}`

## Security Testing

### Authentication
- [ ] Accessing /dashboard without login redirects to /login
- [ ] API endpoints require valid session cookie
- [ ] JWT tokens expire after 7 days
- [ ] Logout clears session cookie

### Password Security
- [ ] Passwords are hashed with bcrypt
- [ ] Plain text passwords never stored
- [ ] Password hash not returned in API responses

### Input Validation
- [ ] Email addresses validated
- [ ] SQL injection attempts blocked
- [ ] XSS attempts blocked
- [ ] CSRF protection via HttpOnly cookies

## Deployment Testing (Vercel)

### Environment Variables
- [ ] POSTGRES_URL is set
- [ ] JWT_SECRET is set
- [ ] Database connection works

### Routing
- [ ] Clean URLs work (/login, /register, /dashboard)
- [ ] Room URLs work (/room/slug)
- [ ] API endpoints work (/api/*)
- [ ] Static files serve correctly

### Performance
- [ ] Pages load quickly (< 2s)
- [ ] API responses fast (< 500ms)
- [ ] Database queries efficient

## Browser Testing

Test in:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Known Limitations

These features are NOT implemented (as per specification):
- No email verification
- No password reset
- No profile pages
- No payment processing
- No subscription management
- No video integration (yet)
- No room access control (yet)
- No multi-user features
