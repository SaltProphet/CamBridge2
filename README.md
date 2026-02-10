# CamBridge
Multi-Tenant Private Video Room Platform - Secure Model Authentication System

## Overview
CamBridge is a multi-tenant "room rental" platform where models can rent private video spaces and keep 100% of their tips. Built with the REAPER design language and optimized for trans-Atlantic connections (e.g., Indiana ↔ South Africa).

**Platform Features**: Model-first economy with $30/month flat rate per room, zero commissions on tips, P2P encrypted video, and secure database-backed authentication with password hashing and JWT tokens.

## 🔐 NEW: Secure Authentication System

CamBridge now includes a production-ready authentication system:

### For Models (Performers)
- **Create Account**: Register at `/register` with username, email, and secure password
- **Secure Login**: JWT token-based authentication with 7-day sessions
- **Password Security**: Bcrypt hashing with 12 salt rounds
- **Profile Management**: Update display name, bio, and avatar
- **Room Management**: Create and manage multiple private rooms
- **Access Control**: Generate and change room access codes via dashboard

### For Developers
- **Database Integration**: Postgres-backed user accounts, rooms, and sessions
- **API Endpoints**: RESTful API for auth, profile, and room management
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive sanitization and validation
- **Session Management**: Secure token storage and expiration

See [AUTH_SETUP.md](AUTH_SETUP.md) for complete setup instructions.

## New Multi-Tenant Features

### 🏢 Room Rental Platform
- **Unique Room URLs**: Each model gets `cambridge.app/room/modelname`
- **Access Code System**: Models control access with changeable codes
- **Subscription Management**: Simple active/expired status (hardcoded list, upgradeable to Stripe)
- **Model Dashboard**: Manage room, view stats, change access codes
- **Public Landing Page**: Marketing page for model acquisition

### 🔐 Video Watermark Protection
- **Semi-transparent overlay** with model name + timestamp
- **Auto-updating**: Refreshes every 30 seconds
- **Recording deterrent**: Visible if screen recorded, hard to crop out
- **Center positioned**: Doesn't block view but clearly marks ownership

### ⏱️ Session Management
- **2-hour max duration**: Auto-disconnect at time limit
- **Warning system**: Alert at 1:50 remaining (10 minutes before end)
- **Reconnect button**: Easy rejoin after session ends
- **Session ended screen**: Clear indication instead of blank screen
- **Connection monitoring**: Detect and handle drops gracefully

### 🎯 URL Structure
- `/` or `/landing.html` - Public marketing page
- `/register` - Model registration page (create new account)
- `/dashboard` or `/dashboard.html` - Model dashboard (secure login with JWT)
- `/room/:modelname` - Model's private room with access code gate
- `/app` or `/app.html` - Legacy bridge interface (original single-user mode)
- `/api/*` - RESTful API endpoints for authentication and room management

## Features

### 🔒 Ghost Protocol Security
- Hardcoded access key authentication
- No database, no tracking, no logs
- No recording features
- Private P2P connections only

### 💰 After Hours: Model-First Economy
- **Tip System**: Real-time tip processing with visual and audio alerts
- **Ledger Widget**: Transaction history with timestamps and balance tracking
- **Visual Alerts**: Animate.css powered notifications for incoming tips
- **Audio Engine**: Customizable sound alerts with global mute/unmute toggle
- **P2P Transactions**: Tips transmitted via Daily.co app messages

### 🎛️ After Hours: Modular Widget System
- **Chat Widget**: P2P messaging with Daily.co integration
- **Tip Ledger Widget**: Balance display, transaction history, and send controls
- **Controls Widget**: Room switcher, audio toggle, theme customization
- **Draggable Interface**: Click and drag widgets to custom positions
- **Persistent Layout**: Widget positions saved to localStorage per-user
- **Widget Menu**: Bottom toolbar for quick show/hide toggles

### 🚪 After Hours: Dual-Station Privacy
- **Room Router**: Switch between Public and Private Daily.co rooms
- **Public Room**: Default open room for general sessions
- **Private Room**: Secured room requiring separate access validation
- **Seamless Switching**: Live room transitions without page reload

### 🎨 After Hours: Dynamic Theming
- **Color Customization**: Change accent color via color picker
- **Glass Opacity**: Adjust widget transparency (50-95%)
- **CSS Variables**: Real-time theme updates using `--accent` and `--glass-opacity`
- **Profile Persistence**: Theme preferences saved to localStorage
- **REAPER Base**: Built on existing industrial design language

### 🌐 Multi-Language Support
- **English (EN)**: Access Key, Establish Link, Data Save (Low BW), Cut Link
- **Russian (RU)**: Ключ доступа, Подключиться, Экономия данных, Разорвать
- **Spanish (ES)**: Clave de acceso, Conectar, Ahorro de datos, Cortar

### 🎨 REAPER Design Language
- **Shadow Intel Mode**: Minimalist HUD with thin borders and real-time latency readout
- **Nexus Architect Mode**: Clean, borderless view for high-focus interaction
- High-contrast industrial theme (#121212, #2c2c2c)
- Monospaced fonts (JetBrains Mono, Inter, Roboto Mono)

### 📹 Video Features
- Full-screen remote video display
- Draggable PIP (Picture-in-Picture) local monitor
- Real-time latency monitoring
- Low bandwidth mode for data saving
- P2P optimized routing via Daily.co

### 🎙️ Real-Time Speech-to-Text
- Live transcription using Deepgram SDK
- Automatic language detection based on UI language (EN/RU/ES)
- Scrolling transcription feed with [YOU] and [REMOTE] prefixes
- Toggle STT on/off during calls
- No transcripts saved or logged (privacy-first)

### 📱 Mobile Optimized
- Touch-responsive interface
- Fits standard mobile viewports without scrolling
- Draggable PIP on mobile devices
- Responsive widget positioning for mobile screens

## Setup

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Daily.co account (for room creation)
- Deepgram API key (for speech-to-text feature, optional)
- **NEW**: Postgres database (Vercel Postgres or Neon)
- Hosting with URL rewriting support (Vercel, Netlify, etc.)

### Database & Authentication Setup

**For complete setup instructions, see [AUTH_SETUP.md](AUTH_SETUP.md)**

Quick start:
1. Set up Postgres database (Vercel Postgres or Neon)
2. Configure environment variables (see `.env.example`)
3. Initialize database tables via `/api/init-db`
4. Models can register at `/register`
5. Models login at `/dashboard`

### Environment Variables

```bash
# Database (Required for authentication)
POSTGRES_URL=postgresql://...
JWT_SECRET=your-super-secret-jwt-key
DB_INIT_SECRET=your-db-init-secret

# Optional
DAILY_API_KEY=your-daily-api-key
DEEPGRAM_KEY=your-deepgram-key
```

### Multi-Tenant Configuration

1. **Configure Active Rooms**: Edit `config.json` to manage subscriptions:
   ```json
   {
     "activeRooms": ["testmodel", "demo", "saltprophet"],
     "dailyDomainPrefix": "cambridge",
     "subscriptionPrice": 30,
     "maxSessionDuration": 7200,
     "sessionWarningTime": 6600
   }
   ```

2. **Model Dashboard Password**: Edit `dashboard.html` and change the demo password:
   ```javascript
   const DEMO_PASSWORD = 'your-secure-password-here';
   ```
   *Note: In production, use server-side authentication with a proper backend.*

3. **Daily.co Domain**: The platform generates room URLs as `https://{dailyDomainPrefix}.daily.co/{modelname}-private`

4. **Session Limits**: 
   - `maxSessionDuration`: Maximum session length in seconds (default: 7200 = 2 hours)
   - `sessionWarningTime`: When to show warning in seconds (default: 6600 = 1:50)

### Legacy Single-User Configuration

1. **Set Access Key**: Edit `app.js` and replace `[INSERT_YOUR_PASSWORD_HERE]` with your chosen password:
   ```javascript
   const ACCESS_KEY = 'your-secret-password-here';
   ```

2. **Set Deepgram API Key** (Optional, for transcription): Edit `app.js` and add your Deepgram API key:
   ```javascript
   const DEEPGRAM_API_KEY = 'your-deepgram-api-key';
   ```
   Get your free API key from: https://console.deepgram.com/

3. **Configure Daily.co Domain** (Optional): By default, the app uses `saltprophet.daily.co`. To use your own Daily.co domain, edit `app.js`:
   ```javascript
   const DAILY_URL = 'https://your-domain.daily.co/YourRoom';
   ```

4. **Configure Private Room** (Optional, for After Hours dual-station): Set a separate private room URL in `app.js`:
   ```javascript
   const PRIVATE_ROOM_URL = 'https://your-domain.daily.co/YourPrivateRoom';
   ```

5. **Add Tip Sound** (Optional, for After Hours audio alerts): Add a `tip.mp3` file to `/assets/sounds/` for audio notifications when tips are received.

### After Hours Environment Variables (Vercel/Production)
When deploying to Vercel or other platforms, set these environment variables:
- `ACCESS_KEY`: Your access password
- `DAILY_URL`: Your public Daily.co room URL
- `PRIVATE_ROOM_URL`: Your private Daily.co room URL (optional)
- `DEEPGRAM_KEY`: Your Deepgram API key (optional)

### Deployment

#### Option 1: Vercel (Recommended for Multi-Tenant)
The included `vercel.json` handles URL routing automatically:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

The routing configuration handles:
- `/room/:modelname` → Serves room.html with model name extraction
- `/dashboard` → Serves dashboard.html
- `/app` → Serves legacy bridge (app.html)
- `/` → Serves landing page

#### Option 2: Netlify
Create a `_redirects` file:
```
/room/*  /room.html  200
/dashboard  /dashboard.html  200
/app  /app.html  200
/  /landing.html  200
```

#### Option 3: Local Server
For development and testing:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000
```

*Note: Local servers won't handle URL routing properly. Access pages directly:*
- `http://localhost:8000/landing.html`
- `http://localhost:8000/dashboard.html`
- `http://localhost:8000/app.html`

#### Option 4: GitHub Pages
Not recommended for multi-tenant mode due to lack of URL rewriting support. Use for legacy bridge only.

## Usage

### Multi-Tenant Platform Usage

#### For Models (NEW Authentication Flow):
1. **Create Account**: Go to `/register` and create an account with:
   - Unique username (lowercase, alphanumeric, hyphens, underscores)
   - Valid email address
   - Secure password (8+ chars, uppercase, lowercase, number)
2. **Login to Dashboard**: Go to `/dashboard` and login with your credentials
3. **JWT Token**: Receive a secure JWT token (7-day expiration, stored locally)
4. **Manage Your Room**:
   - View your unique room URL
   - Generate/change access codes via API
   - Update profile (display name, bio, avatar)
   - View subscription status
5. **Share with Clients**: Give clients your room URL and current access code

#### For Clients:
1. **Enter Room**: Use the model's unique URL (e.g., `cambridge.app/room/testmodel`)
2. **Enter Access Code**: Input the code provided by the model
3. **Establish Link**: Click to join the private video session
4. **Video Features**: 
   - Full-screen P2P video with watermark protection
   - Send tips directly to model (100% goes to them)
   - Optional chat and transcription features
5. **Session Time**: 2-hour maximum with 10-minute warning

#### For Platform Operators:
1. **Add Models**: Edit `config.json` → `activeRooms` array
2. **Monitor Subscriptions**: Remove models from `activeRooms` when subscription expires
3. **Configure Settings**: Adjust session duration, pricing, Daily.co domain
4. **Collect Payment**: $30/month per active room (outside of platform)

### Legacy Single-User Bridge Usage

#### Step 1: Access Authentication
1. Open the application in your browser
2. Enter the hardcoded access key
3. The "Establish Link" button appears when the correct key is entered

### Step 2: Join a Room
1. Enter a unique room name (e.g., "session-2024-02-06")
2. Optionally enable "Data Save (Low BW)" for bandwidth optimization
3. Click "Establish Link" to join
4. Share the same room name with your peer

### Step 3: Connect
- Both participants must join the same room name
- Connection establishes automatically via P2P
- Remote video displays full-screen
- Local video appears in draggable PIP

### Interface Controls
- **Language Toggle** (top-right): Switch between EN, RU, ES
- **Mode Toggle** (top-left): Switch between Shadow Intel and Nexus Architect
- **Latency HUD** (left side): Real-time connection latency display
- **PIP Window**: Drag to reposition your local video feed
- **STT Toggle**: Enable/disable real-time speech-to-text transcription
- **Transcription Feed**: Scrolling display at bottom showing live transcriptions with [YOU] and [REMOTE] labels
- **Cut Link**: Disconnect from the current session

### After Hours Widget Controls
Once connected, access the After Hours features via the widget menu at the bottom center:

#### Widget Menu (Bottom Center)
- **Chat Icon**: Toggle chat widget for P2P messaging
- **Dollar Icon**: Toggle tip ledger widget for economy features
- **Gear Icon**: Toggle controls widget for settings

#### Chat Widget
- Send instant messages to your peer via P2P
- Messages are ephemeral (not logged or saved)
- Input sanitized for security
- Auto-scroll to latest messages

#### Tip Ledger Widget
- View current balance at the top
- See transaction history with timestamps
- Send tips using the amount input field
- Tips trigger visual and audio alerts on both sides

#### Controls Widget
- **Room Mode**: Switch between Public and Private rooms
- **Audio Alerts**: Toggle tip sound effects on/off
- **Theme Color**: Pick custom accent color (saved to localStorage)
- **Glass Opacity**: Adjust widget transparency (50-95%)

#### Widget Dragging
- Click and hold any widget header to drag
- Position widgets anywhere on screen
- Positions auto-save to localStorage
- Reload page to restore saved layouts

#### Tip Alerts
- Large centered notification appears when tips are received
- Shows tipper name and amount
- 3-second display with fade in/out animation
- Optional audio notification (toggle in Controls)

## Technical Details

### P2P Configuration
CamBridge forces P2P mode in Daily.co to minimize routing lag:
- Direct peer-to-peer connections
- No server-side media relay (unless required by network)
- Optimized for trans-Atlantic high-latency scenarios

### Speech-to-Text
- Real-time transcription via Deepgram WebSocket API
- Language automatically synced with UI language selection (EN/RU/ES)
- Audio streaming from local microphone to Deepgram
- No transcripts stored on server (privacy-first design)
- Transcripts only displayed in browser and cleared on disconnect

### Bandwidth Modes
- **Standard**: 1280x720 @ 30fps
- **Low Bandwidth**: 640x480 @ 15fps

### After Hours Architecture
- **AfterHours Class**: Central controller managing tips, widgets, room routing, and themes
- **Draggable Engine**: Mouse-based drag with position persistence via localStorage
- **Tip Manager**: Balance tracking, transaction history, visual/audio alerts
- **Room Router**: Seamless switching between public and private Daily.co rooms
- **Theme Engine**: Dynamic CSS variable updates for real-time customization
- **P2P Messaging**: Uses Daily.co `sendAppMessage` API for chat and tips
- **Widget Lifecycle**: Independent show/hide state with localStorage persistence

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 11+)
- Mobile browsers: Optimized for touch

## Security Notes

### Authentication Security (NEW)
- **Password Hashing**: Bcrypt with 12 salt rounds - industry standard
- **JWT Tokens**: 7-day expiration with secure signing
- **Rate Limiting**: Protection against brute force (5 registrations/hour, 10 logins/15min)
- **Input Validation**: Comprehensive sanitization and validation
- **Session Management**: Database-backed session tracking
- **HTTPS Required**: Secure communication for all API calls
- **Database Integration**: Postgres with parameterized queries (SQL injection prevention)

### Multi-Tenant Security
- **Access Codes**: Database-backed validation per room
- **Room Validation**: Active subscription check before allowing entry
- **Watermark Protection**: Timestamps and model name overlay to deter recording
- **Session Limits**: Auto-disconnect after 2 hours to prevent abuse
- **User Isolation**: Each model's data is isolated by user_id foreign keys

### General Security
- Change the dashboard password before deployment (`dashboard.html`)
- Add model names to `activeRooms` in config.json for subscription control
- Use HTTPS in production (required for camera/microphone access)
- Keep Daily.co API credentials secure
- Add your Deepgram API key if using transcription (optional)
- Room names act as identifiers - models should keep access codes private
- No data is stored or logged anywhere (Ghost Protocol)
- Transcriptions are client-side only and not recorded
- Tips and chat messages are P2P only (not stored on any server)
- All user input is sanitized to prevent XSS attacks
- Widget positions and theme preferences stored in browser localStorage only
- Watermarks use current timestamp to prove authenticity if needed

### Recommended Practices
- Rotate access codes regularly via dashboard
- Use server-side authentication in production (not client-side password check)
- Implement Stripe or crypto payments for automated subscription management
- Consider age verification system for compliance
- Monitor active rooms list for subscription status

## Troubleshooting

### Camera/Microphone Not Working
- Ensure HTTPS is enabled (required by browsers)
- Check browser permissions for camera/microphone
- Try a different browser if issues persist

### Connection Failed
- Verify both participants use the exact same room name
- Check firewall settings (Daily.co requires WebRTC ports)
- Try disabling VPN if connection fails

### High Latency
- Enable "Data Save (Low BW)" mode
- Check your internet connection
- Close other bandwidth-intensive applications

## License
See LICENSE file for details.

## Support
This is a private, self-hosted solution with no external support. For Daily.co API questions, visit https://docs.daily.co/
