# CamBridge
Private 1-on-1 P2P Video Bridge - Optimized for High-Latency Trans-Atlantic Connections

## Overview
CamBridge is a secure, peer-to-peer video communication system designed with the REAPER design language. It features a minimalist, industrial interface optimized for trans-Atlantic connections (e.g., Indiana ↔ South Africa).

## Features

### 🔒 Ghost Protocol Security
- Hardcoded access key authentication
- No database, no tracking, no logs
- No recording features
- Private P2P connections only

### 🌐 Multi-Language Support
- **English (EN)**: Access Key, Establish Link, Data Save (Low BW), Cut Link
- **Russian (RU)**: Ключ доступа, Подключиться, Экономия данных, Разорвать
- **Spanish (ES)**: Clave de acceso, Conectar, Ahorro de datos, Cortar

### 🎨 REAPER Design Language
- **Shadow Intel Mode**: Minimalist HUD with thin borders and real-time latency readout
- **Nexus Architect Mode**: Clean, borderless view for high-focus interaction
- High-contrast industrial theme (#121212, #2c2c2c)
- Monospaced fonts (JetBrains Mono)

### 📹 Video Features
- Full-screen remote video display
- Draggable PIP (Picture-in-Picture) local monitor
- Real-time latency monitoring
- Low bandwidth mode for data saving
- P2P optimized routing via Daily.co

### 📱 Mobile Optimized
- Touch-responsive interface
- Fits standard mobile viewports without scrolling
- Draggable PIP on mobile devices

## Setup

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Daily.co account (for room creation)

### Configuration

1. **Set Access Key**: Edit `app.js` and replace `[INSERT_YOUR_PASSWORD_HERE]` with your chosen password:
   ```javascript
   const ACCESS_KEY = 'your-secret-password-here';
   ```

2. **Configure Daily.co Domain** (Optional): By default, the app uses `saltprophet.daily.co`. To use your own Daily.co domain, edit `app.js`:
   ```javascript
   const roomUrl = `https://your-domain.daily.co/${roomName}`;
   ```

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
- **Cut Link**: Disconnect from the current session

## Technical Details

### P2P Configuration
CamBridge forces P2P mode in Daily.co to minimize routing lag:
- Direct peer-to-peer connections
- No server-side media relay (unless required by network)
- Optimized for trans-Atlantic high-latency scenarios

### Bandwidth Modes
- **Standard**: 1280x720 @ 30fps
- **Low Bandwidth**: 640x480 @ 15fps

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 11+)
- Mobile browsers: Optimized for touch

## Security Notes
- Change the default access key before deployment
- Use HTTPS in production (required for camera/microphone access)
- Room names act as the only identifier - keep them private
- No data is stored or logged anywhere

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
