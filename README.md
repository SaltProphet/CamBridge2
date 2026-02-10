# CamBridge
Multi-Tenant Private Video Room Platform - Ghost Protocol Security

## Overview
CamBridge is a multi-tenant "room rental" platform where models can rent private video spaces and keep 100% of their tips. Built with the REAPER design language and optimized for trans-Atlantic connections (e.g., Indiana ↔ South Africa).

**Platform Features**: Model-first economy with $30/month flat rate per room, zero commissions on tips, P2P encrypted video, and Ghost Protocol security (no database, no tracking, no logs).

## New Multi-Tenant Features

### 🏢 Multi-Room Management System
- **Multiple Rooms Per Model**: Each model can create up to 8 rooms (configurable)
- **Room Types**:
  - **🌐 Public Rooms**: Require login with access code - suitable for general sessions
  - **🔒 Private Ultra Rooms**: Exclusive, premium sessions with enhanced security
- **Unique Room URLs**: Each room gets `cambridge.app/room/modelname/roomslug`
- **Backward Compatible**: Simple `/room/modelname` URL defaults to 'main' room
- **Access Code System**: Unique access codes per room, models can change anytime
- **Room Management Dashboard**: Create, edit, delete rooms with visual type indicators

### 🎛️ Enhanced Dashboard Features
- **Room Limit Display**: Shows X/8 rooms used
- **Room Creation Modal**: Easy form to create new public or private rooms
- **Per-Room Management**: Each room has:
  - Unique access code
  - Copy URL button
  - Direct entry button
  - Delete option
- **Visual Type Badges**: Clear indicators for public vs private rooms

### 🔐 Video Watermark Protection
- **Semi-transparent overlay** with room name + timestamp
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
- `/room/:modelname` - Model's default (main) room with access code gate
- `/room/:modelname/:roomslug` - Specific room by slug (e.g., `/room/testmodel/vip`)
- `/dashboard` or `/dashboard.html` - Model dashboard (password protected)
- `/app` or `/app.html` - Legacy bridge interface (original single-user mode)

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
- Deepgram API key (for speech-to-text feature)
- Hosting with URL rewriting support (Vercel, Netlify, etc.)

### Multi-Tenant Configuration

1. **Configure Models and Rooms**: Edit `config.json` to manage models and their rooms:
   ```json
   {
     "dailyDomainPrefix": "cambridge",
     "subscriptionPrice": 30,
     "maxSessionDuration": 7200,
     "sessionWarningTime": 6600,
     "maxRoomsPerModel": 8,
     "models": {
       "testmodel": {
         "active": true,
         "rooms": {
           "main": {
             "name": "Main Room",
             "type": "public",
             "slug": "main",
             "active": true,
             "createdAt": "2024-01-01T00:00:00Z"
           },
           "vip": {
             "name": "VIP Lounge",
             "type": "private",
             "slug": "vip",
             "active": true,
             "createdAt": "2024-01-01T00:00:00Z"
           }
         }
       }
     }
   }
   ```

2. **Model Dashboard Password**: Edit `dashboard.html` and change the demo password:
   ```javascript
   const DEMO_PASSWORD = 'your-secure-password-here';
   ```
   *Note: In production, use server-side authentication with a proper backend.*

3. **Daily.co Domain**: The platform generates room URLs as:
   - Public rooms: `https://{dailyDomainPrefix}.daily.co/{modelname}-{roomslug}-public`
   - Private rooms: `https://{dailyDomainPrefix}.daily.co/{modelname}-{roomslug}-private`

4. **Room Configuration**:
   - `maxRoomsPerModel`: Maximum rooms per model (default: 8)
   - `type`: Either "public" or "private"
   - Each room has a unique slug and access code

5. **Session Limits**: 
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
- `/room/:modelname/:roomslug` → Serves room.html with model and room slug extraction
- `/room/:modelname` → Serves room.html, defaults to 'main' room
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

#### For Models:
1. **Access Dashboard**: Go to `/dashboard` and login with:
   - Model Name: Your assigned model name (e.g., "testmodel")
   - Password: The dashboard password (default: "modelpass")

2. **Manage Your Rooms**:
   - **View All Rooms**: See list of all your rooms with type indicators (🌐 Public / 🔒 Private Ultra)
   - **Create New Room**: 
     - Click "Create Room" button
     - Enter room name (e.g., "VIP Lounge")
     - Auto-generated slug or customize it (e.g., "vip-lounge")
     - Select room type: Public or Private Ultra
     - System generates unique access code automatically
   - **Manage Existing Rooms**:
     - Copy room URL to share with clients
     - Change access code anytime
     - Enter room directly for testing
     - Delete rooms you no longer need
   - **Room Limits**: Create up to 8 rooms (or as configured)

3. **Room Types**:
   - **🌐 Public Rooms**: Standard rooms requiring login with access code. Perfect for general sessions.
   - **🔒 Private Ultra Rooms**: Premium, exclusive rooms with enhanced security. Ideal for VIP clients.

4. **Share with Clients**: 
   - Give clients your room URL (e.g., `cambridge.app/room/testmodel/vip`)
   - Provide the current access code for that specific room
   - Each room has its own unique access code

#### For Clients:
1. **Enter Room**: Use the model's room URL (e.g., `cambridge.app/room/testmodel/vip`)
2. **View Room Info**: See room name and type (Public or Private Ultra) displayed prominently
3. **Enter Access Code**: Input the code provided by the model for this specific room
4. **Establish Link**: Click to join the private video session
5. **Video Features**: 
   - Full-screen P2P video with watermark protection showing room name
   - Send tips directly to model (100% goes to them)
   - Optional chat and transcription features
6. **Session Time**: 2-hour maximum with 10-minute warning

#### For Platform Operators:
1. **Add Models**: Edit `config.json` → Add model entry under `models` object
2. **Configure Rooms**: Add room entries under model's `rooms` object with type (public/private)
3. **Monitor Subscriptions**: Set model's `active` status to false when subscription expires
4. **Configure Settings**: Adjust session duration, pricing, Daily.co domain, max rooms per model
5. **Collect Payment**: $30/month per active model (outside of platform)

### Backward Compatibility:
- Old URL format `/room/modelname` automatically redirects to model's "main" room
- If "main" room doesn't exist, system will show appropriate error message

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

### Multi-Tenant Security
- **Per-Room Access Codes**: Each room has unique access code stored in browser localStorage
- **Room Type Enforcement**: Public and Private Ultra rooms use separate Daily.co URLs
- **Model Validation**: Active subscription check before allowing room entry
- **Room-Specific Access**: Different rooms require different access codes for enhanced security
- **Watermark Protection**: Timestamps and room name overlay to deter recording
- **Session Limits**: Auto-disconnect after 2 hours to prevent abuse
- **Ghost Protocol**: No session data, no user data, no logs on server
- **Room Isolation**: Each room gets unique Daily.co URL preventing cross-room access

### Room Type Security Differences
- **Public Rooms**: Access code required, suitable for standard sessions
- **Private Ultra Rooms**: Enhanced security with separate Daily.co namespace, ideal for exclusive VIP sessions

### General Security
- Change the dashboard password before deployment (`dashboard.html`)
- Configure models and rooms in `config.json` for subscription control
- Use HTTPS in production (required for camera/microphone access)
- Keep Daily.co API credentials secure
- Add your Deepgram API key if using transcription (optional)
- Access codes are unique per room - models should share codes securely
- No data is stored or logged anywhere (Ghost Protocol)
- Transcriptions are client-side only and not recorded
- Tips and chat messages are P2P only (not stored on any server)
- All user input is sanitized to prevent XSS attacks
- Widget positions and theme preferences stored in browser localStorage only
- Watermarks use current timestamp to prove authenticity if needed

### Recommended Practices
- Rotate room access codes regularly via dashboard
- Use server-side authentication in production (not client-side password check)
- Create separate rooms for different client tiers (public vs private ultra)
- Monitor active models list for subscription status
- Implement Stripe or crypto payments for automated subscription management
- Consider age verification system for compliance
- Limit room creation to prevent abuse (default: 8 rooms per model)

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
