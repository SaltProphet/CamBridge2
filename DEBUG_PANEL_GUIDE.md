# Debug Panel Visual Reference

## Room Page (/r/:creatorSlug)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          [Video Container Area]                              │
│                        Daily.co iframe loads here                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ DEBUG PANEL                                                          [HIDE] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Route: /r/alice                Creator Slug: alice      Room Slug: main    │
│ User ID: user_123456           Request ID: req_abc789                      │
│ Join Status: pending                                                        │
│ Last Error: -                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Creator Dashboard (/creator/dashboard)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        [Dashboard Content Area]                              │
│                   Creator info, rooms list, settings                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ DEBUG PANEL                                                          [HIDE] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Route: /creator/dashboard      Creator Slug: alice      User ID: user_123  │
│ Last Error: -                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

✓ **Fixed Position**: Stays at bottom of viewport, doesn't scroll away  
✓ **Dark Theme**: rgba(0,0,0,0.95) background with #00ff88 green accent  
✓ **Toggle Control**: Click [HIDE] to collapse, [SHOW] to restore  
✓ **Auto-Update**: Refreshes every 2-3 seconds automatically  
✓ **Real-time Data**: Shows parsed URL parameters as they change  
✓ **Auth State**: Displays user ID from token or authentication status  
✓ **Join Tracking**: Monitors request ID and status through approval flow  
✓ **Error Display**: Highlights errors in red (#ff4444) for visibility  
✓ **Responsive**: Grid layout adapts to different screen sizes  
✓ **Consistent Style**: Uses JetBrains Mono font matching app aesthetic  

## Usage Guide

### Room Page
1. Open any `/r/:creatorSlug` URL
2. Debug panel appears at bottom showing parsed route
3. Watch "Join Status" progress through request flow
4. Check "Last Error" if API calls fail

### Dashboard Page
1. Log in and navigate to `/creator/dashboard`
2. Debug panel shows your creator slug and user ID
3. Verify route parsing is correct
4. Monitor for authentication issues

### Toggle Panel
- Click **[HIDE]** button to collapse panel (content hidden, header remains)
- Click **[SHOW]** button to restore full panel
- Panel state persists during page interaction

## Debugging Scenarios

### 1. URL Parsing Issues
**Symptom**: Wrong page loads, creator not found  
**Check**: 
- Compare "Route" field with "Creator Slug" field
- If Creator Slug shows "-", URL pattern didn't match
- Verify route matches `/r/:creatorSlug` or `/r/:creatorSlug/:roomSlug`

**Example**:
```
Route: /r/alice-smith
Creator Slug: alice-smith  ✓ Correct
Room Slug: main            ✓ Default

Route: /room/alice-smith
Creator Slug: alice-smith  ✓ Legacy pattern supported
Room Slug: main            ✓ Default
```

### 2. Authentication Issues
**Symptom**: Can't access protected resources, redirected to login  
**Check**:
- "User ID" field shows authentication state
- Values: user ID, "not-authenticated", "token-parse-error"

**Example**:
```
User ID: user_abc123       ✓ Authenticated
User ID: not-authenticated ✗ Need to log in
User ID: token-parse-error ✗ Invalid JWT
```

### 3. Join Request Flow Issues
**Symptom**: Can't join room, stuck waiting for approval  
**Check**:
- "Request ID" appears when join request created
- "Join Status" progresses: requesting → pending → approved
- "Last Error" shows any API failures

**Example Flow**:
```
Step 1: User clicks "Request Access"
Join Status: requesting
Request ID: -

Step 2: API call completes
Join Status: pending
Request ID: req_abc123

Step 3: Creator approves
Join Status: approved
Request ID: req_abc123

Error Case:
Join Status: error: Room not found
Last Error: Room not found
Request ID: -
```

### 4. API Error Diagnosis
**Symptom**: Unexpected behavior, features not working  
**Check**: "Last Error" field (displayed in red)

**Common Errors**:
- "Invalid room URL - could not parse creator slug" → URL parsing failed
- "Creator not found" → creatorSlug doesn't exist in database
- "Room not found" → roomSlug doesn't exist for creator
- "Unauthorized" → Authentication token invalid or expired
- "Rate limit exceeded" → Too many requests, need to wait

**Example**:
```
Last Error: Creator not found
→ Check "Creator Slug" field matches database
→ Verify creator is active (status='active')

Last Error: Join request failed
→ Check "User ID" is authenticated
→ Verify creator accepts join requests
```

## Technical Details

### Room Page Fields

| Field | Source | Purpose |
|-------|--------|---------|
| Route | `window.location.pathname` | Current URL path |
| Creator Slug | `window.creatorSlug` (parsed in room.js) | Extracted from `/r/:creatorSlug` |
| Room Slug | `window.roomSlug` (parsed in room.js) | Extracted from `/r/:creatorSlug/:roomSlug` |
| User ID | `phase1Auth.user.id` | From authenticated user object |
| Request ID | `phase1Auth.joinRequestId` | From join request API response |
| Join Status | Updated by `updateDebugJoinStatus()` | Tracks request lifecycle |
| Last Error | Updated by `updateDebugError()` | Most recent error message |

### Dashboard Page Fields

| Field | Source | Purpose |
|-------|--------|---------|
| Route | `window.location.pathname` | Current URL path |
| Creator Slug | `#creator-slug` element text | From loaded profile |
| User ID | Parsed from JWT token | Extracted from auth token |
| Last Error | Manual updates in error handlers | API errors during dashboard operations |

### Update Frequency

- **Room Page**: Updates every 2 seconds via `setInterval`
- **Dashboard Page**: Updates every 3 seconds via `setInterval`
- **Join Status**: Updates on each API poll (every 3 seconds when pending)
- **Errors**: Updates immediately when error occurs

### Styling

```css
position: fixed;           /* Stays at bottom */
bottom: 0;                 /* Anchored to bottom edge */
left: 0; right: 0;         /* Full width */
background: rgba(0, 0, 0, 0.95);  /* Nearly opaque black */
border-top: 1px solid #00ff88;    /* Green accent line */
color: #00ff88;            /* Green text */
z-index: 10000;            /* Above all content */
font-family: 'JetBrains Mono', monospace;
font-size: 0.75rem;        /* Compact but readable */
```

## Removing Debug Panel

**For Production**: The debug panels are temporary and should be removed before launch.

To remove:
1. Delete debug panel HTML from `room.html` (lines with `id="debug-panel"`)
2. Delete debug panel HTML from `creator-dashboard.html`
3. Delete debug panel scripts (updateDebugPanel functions)
4. Remove `updateDebugError()` and `updateDebugJoinStatus()` calls from code

**Keep for Testing**: The debug panels are invaluable for QA testing and troubleshooting the acceptance tests. Consider keeping them until all 5 acceptance tests pass consistently.
