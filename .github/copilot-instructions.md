# CamBridge - AI Agent Instructions

## Project Overview
CamBridge is a privacy-first P2P video bridge built with vanilla JavaScript. No backend, no build process, no dependencies beyond CDN-loaded libraries (Daily.co, Deepgram). Pure client-side static site deployable anywhere.

**Design Philosophy**: "Ghost Protocol" - no logging, no recording, no tracking. Security through hardcoded secrets, not databases.

## Architecture

### Core Components
- **app.js**: All application logic (authentication, WebRTC via Daily.co, speech-to-text via Deepgram)
- **index.html**: Single-page structure with gatekeeper → video container pattern
- **styles.css**: "REAPER design language" (Nexus Architect mode) - industrial minimalist aesthetic

### External Dependencies (CDN-loaded)
```html
<script src="https://unpkg.com/@daily-co/daily-js"></script>
<script src="https://cdn.jsdelivr.net/npm/@deepgram/sdk@3.0.0/dist/main.js"></script>
```

### Data Flow
1. User enters hardcoded `ACCESS_KEY` → client-side validation in `app.js`
2. On success: hide gatekeeper, show video container
3. Daily.co iframe created via `DailyIframe.createFrame()` → joins hardcoded `DAILY_URL`
4. If `DEEPGRAM_KEY` configured: enable STT toggle, connect WebSocket to Deepgram
5. Audio stream → Deepgram WebSocket → transcript display (no persistence)

## Configuration Pattern

### Environment Variables (Vercel-style)
```javascript
const ACCESS_KEY = typeof process !== 'undefined' && process.env && process.env.ACCESS_KEY 
    ? process.env.ACCESS_KEY 
    : 'C2C';  // Fallback for local development
```

**Critical**: This pattern assumes Vercel's build-time replacement. For local development, edit the fallback values directly in [app.js](app.js) (lines 7-14).

### Required Secrets
- `ACCESS_KEY`: Password for app access (line 7-9 in [app.js](app.js))
- `DAILY_URL`: Full Daily.co room URL (line 10-12)
- `DEEPGRAM_KEY`: API key for transcription (line 13-15)

## Key Implementation Patterns

### Gatekeeper Pattern
```javascript
// Toggle visibility via CSS classes
gatekeeper.classList.remove('active');
gatekeeper.classList.add('hidden');
videoContainer.classList.remove('hidden');
```
Never modify DOM structure - only toggle `.active` and `.hidden` classes.

### Draggable UI Elements
The `makeDraggable(element)` function (line 257) implements mouse + touch drag:
- Drag handle: `.transcript-header` element
- Uses `transform: translate()` for positioning
- Prevents dragging when clicking nested buttons (`.clear-btn`)

**Current Branch**: `copilot/enable-move-translate-window` suggests work on draggable transcript window. The draggable implementation is already complete - verify if new features are needed.

### WebRTC Setup (Daily.co)
```javascript
dailyCall = window.DailyIframe.createFrame(videoContainer, {
    iframeStyle: { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%' }
});
dailyCall.join({ url: DAILY_URL });
```
Full-screen iframe strategy - no custom video elements needed.

### Speech-to-Text Flow
1. Request microphone: `navigator.mediaDevices.getUserMedia({ audio: true })`
2. Create WebSocket: `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&language=en`
3. Use WebSocket subprotocol: `['token', DEEPGRAM_KEY]`
4. Stream audio via `MediaRecorder` → send chunks every 250ms
5. Parse JSON responses → display transcript lines with `[YOU]` prefix

**Privacy**: Transcripts never leave the browser. No persistence, cleared on disconnect.

### Transcript Editing Pattern
```javascript
// Inline editing: replace text span with input, save on blur/Enter, cancel on Escape
textSpan.replaceWith(input);
input.addEventListener('blur', saveEdit);
```
Edited messages get `.edited` class (italic styling) for visual indication.

## Styling Conventions

### Color Palette (CSS variables)
```css
--bg-dark: #000000;
--text: #555555;
--text-light: #ffffff;
--accent: #00ff88;  /* Primary action color */
--error: #ff4444;
```

### Typography
- **Font**: JetBrains Mono (monospaced, loaded from Google Fonts)
- **Labels**: Uppercase, `letter-spacing: 0.1rem`
- **Buttons**: Transparent background, bottom border on hover

### Responsive Design
- Mobile breakpoint: `@media (max-width: 768px)`
- Touch-specific: `@media (hover: none) and (pointer: coarse)`
- **iOS fix**: Input font-size 16px minimum prevents zoom

## Development Workflow

### Local Testing
```bash
# No build step required - serve static files
python -m http.server 8000
# OR
npx http-server -p 8000
```
Open `http://localhost:8000` - camera/mic require `https://` in production.

### Deployment Options
1. **Vercel**: Set `ACCESS_KEY`, `DAILY_URL`, `DEEPGRAM_KEY` as environment variables
2. **GitHub Pages**: Edit fallback values in [app.js](app.js), push to repo
3. **Any static host**: Deploy all files as-is (Netlify, Cloudflare Pages, etc.)

### Testing Configuration
- Test access key validation: Enter wrong key → should show "INVALID_ACCESS_KEY - TRY AGAIN"
- Test Daily.co connection: Check browser console for "Failed to join room" errors
- Test Deepgram: Toggle STT button → should see WebSocket connection in Network tab

## Critical "Don'ts"

1. **Don't add a build process** - This is a static site by design
2. **Don't add backend endpoints** - Security model is client-side only
3. **Don't persist transcripts** - Privacy-first means no storage
4. **Don't require npm** - Dependencies are CDN-loaded
5. **Don't modify Daily.co iframe structure** - Let Daily handle video UI

## Common Tasks

### Adding UI Elements Over Video
```javascript
// Add to #video-container, use fixed positioning with high z-index
const newElement = document.createElement('div');
newElement.style.position = 'fixed';
newElement.style.zIndex = '1000';  // Above video iframe
videoContainer.appendChild(newElement);
```

### Modifying Transcript Display
- Transcript lines: [app.js](app.js#L223-L243) `addTranscriptLine()` function
- Styling: [styles.css](styles.css#L214-L280) `.transcript-line` and children

### Changing Authentication
Edit `ACCESS_KEY` in [app.js](app.js#L7-L9). Multi-user support not in scope (would require backend).

## Browser DevTools Tips
- **Network tab**: Watch WebSocket connections to Deepgram (wss://)
- **Console**: Daily.co logs connection state changes
- **Application → Storage**: Verify nothing is persisted (Ghost Protocol compliance)

## Key Files Reference
- [app.js](app.js): Lines 87-100 (Daily.co setup), Lines 139-220 (Deepgram integration), Lines 257-328 (Draggable UI)
- [styles.css](styles.css): Lines 1-7 (Color variables), Lines 144-280 (Transcript feed styles)
- [README.md](README.md): Deployment instructions and troubleshooting
