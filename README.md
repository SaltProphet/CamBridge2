# CamBridge
Private 1-on-1 P2P Video Bridge - Optimized for High-Latency Trans-Atlantic Connections

## Overview
CamBridge is a secure, peer-to-peer video communication system designed with the REAPER design language. It features a minimalist, industrial interface optimized for trans-Atlantic connections (e.g., Indiana ↔ South Africa).

**After Hours Portal**: Extended with model-first economy features, modular widget system, and dual-station privacy controls.

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

### Configuration

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

#### Option 1: Local Server
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000
```

Then open `http://localhost:8000` in your browser.

#### Option 2: GitHub Pages
1. Push the code to a GitHub repository
2. Go to Settings → Pages
3. Select the main branch as source
4. Access your site at `https://username.github.io/repository-name/`

#### Option 3: Any Static Host
Deploy the files to any static hosting service:
- Netlify
- Vercel
- Cloudflare Pages
- AWS S3 + CloudFront

## Usage

### Step 1: Access Authentication
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
- Change the default access key before deployment
- Add your Deepgram API key if using transcription
- Use HTTPS in production (required for camera/microphone access)
- Room names act as the only identifier - keep them private
- No data is stored or logged anywhere
- Transcriptions are client-side only and not recorded
- Tips and chat messages are P2P only (not stored on any server)
- All user input is sanitized to prevent XSS attacks
- Widget positions and theme preferences stored in browser localStorage only

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
