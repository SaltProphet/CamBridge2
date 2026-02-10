// CamBridge - Room-Specific Logic for Multi-Tenant Platform
// Handles dynamic routing, watermark, session management

// Extract room name from URL path
const urlPath = window.location.pathname;
const roomMatch = urlPath.match(/\/room\/([a-z0-9-_]+)/);
const roomName = roomMatch ? roomMatch[1] : null;

// Configuration
let config = null;
let roomAccessCode = null;

// Session Management
let sessionStartTime = null;
let sessionTimer = null;
let sessionWarningShown = false;

// Load configuration
async function loadConfig() {
    try {
        const response = await fetch('/config.json');
        config = await response.json();
        return config;
    } catch (error) {
        console.error('Failed to load config:', error);
        return null;
    }
}

// Validate room exists and is active
function validateRoom() {
    if (!roomName) {
        showError('Invalid room URL');
        return false;
    }

    if (!config) {
        showError('Configuration not loaded');
        return false;
    }

    if (!config.activeRooms.includes(roomName)) {
        showError('This room subscription has expired or does not exist. Please contact support.');
        return false;
    }

    return true;
}

// Get Daily.co room URL for this model
function getDailyRoomUrl() {
    const domain = config?.dailyDomainPrefix || 'cambridge';
    return `https://${domain}.daily.co/${roomName}-private`;
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
    }
    
    // Disable unlock button
    const unlockBtn = document.getElementById('unlock-btn');
    if (unlockBtn) {
        unlockBtn.disabled = true;
        unlockBtn.style.opacity = '0.5';
        unlockBtn.style.cursor = 'not-allowed';
    }
}

// Initialize room
async function initializeRoom() {
    await loadConfig();
    
    // Display room name
    const roomDisplayElement = document.getElementById('room-display-name');
    if (roomDisplayElement && roomName) {
        roomDisplayElement.textContent = `Room: ${roomName.toUpperCase()}`;
    }
    
    // Validate room
    if (!validateRoom()) {
        return;
    }
    
    // Load room access code
    roomAccessCode = localStorage.getItem(`accessCode-${roomName}`);
    
    // Initialize access key validation
    initializeAccessKeyValidation();
}

// Environment variables for Deepgram
// WARNING: API key is exposed in client code. For production:
// 1. Use environment variables with a build process (e.g., Vite, Webpack)
// 2. Or proxy transcription requests through a backend endpoint
// 3. Or use temporary token generation from your server
const DEEPGRAM_KEY = typeof process !== 'undefined' && process.env && process.env.DEEPGRAM_KEY 
    ? process.env.DEEPGRAM_KEY 
    : '2745a03e47aacaa64e5d48e4f4154ee1405c3e8f';

// Application state
let dailyCall = null;
let deepgramSocket = null;
let mediaRecorder = null;
let isTranscriptionActive = false;

// DOM Elements
const gatekeeper = document.getElementById('gatekeeper');
const videoContainer = document.getElementById('video-container');
const accessKeyInput = document.getElementById('access-key');
const unlockBtn = document.getElementById('unlock-btn');
const errorMessage = document.getElementById('error-message');
const sttToggle = document.getElementById('stt-toggle');
const sttIcon = document.getElementById('stt-icon');
const transcriptFeed = document.getElementById('transcript-feed');
const transcriptContent = document.getElementById('transcript-content');
const clearTranscriptBtn = document.getElementById('clear-transcript');

// ===== AFTER HOURS CORE ENGINE =====
class AfterHours {
    constructor() {
        this.activeUser = null;
        this.tips = { balance: 0, audio: true };
        this.audioElement = new Audio('/assets/sounds/tip.mp3');
        this.currentRoom = roomName;
        this.widgets = new Map();
    }

    // --- TIP & ALERT SYSTEM ---
    processTip(user, amount) {
        this.tips.balance += amount;
        document.getElementById('balance-val').innerText = `$${this.tips.balance}`;
        
        // Add to ledger history
        this.addLedgerEntry(user, amount);
        
        // Play audio if enabled
        if (this.tips.audio) {
            this.audioElement.play().catch(e => console.log('Audio playback failed:', e));
        }
        
        // Trigger visual alert
        this.triggerVisualAlert(user, amount);
    }

    triggerVisualAlert(user, amount) {
        const alert = document.getElementById('tip-alert');
        alert.innerHTML = `<h1>${this.sanitizeHTML(user)} tipped $${amount}</h1>`;
        alert.className = 'tip-alert animate__animated animate__fadeInDown';
        alert.style.display = 'block';
        
        setTimeout(() => {
            alert.className = 'tip-alert animate__animated animate__fadeOutUp';
            setTimeout(() => alert.style.display = 'none', 1000);
        }, 3000);
    }

    addLedgerEntry(user, amount) {
        const ledgerHistory = document.getElementById('ledger-history');
        const entry = document.createElement('div');
        entry.className = 'ledger-entry';
        
        const timestamp = new Date().toLocaleTimeString();
        entry.innerHTML = `
            <span class="user">${this.sanitizeHTML(user)}</span>
            <span class="amount">+$${amount}</span>
            <span class="time">${timestamp}</span>
        `;
        
        ledgerHistory.insertBefore(entry, ledgerHistory.firstChild);
    }

    // --- MODULAR UI ENGINE ---
    makeDraggable(id) {
        const el = document.getElementById(id);
        if (!el) return;
        
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = el.querySelector('.widget-header');
        
        if (header) {
            header.style.cursor = 'move';
            header.onmousedown = dragMouseDown;
        } else {
            el.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            // Don't drag if clicking close button
            if (e.target.closest('.widget-close')) return;
            
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            Portal.saveLayout(id, el.style.top, el.style.left);
        }
    }

    saveLayout(id, top, left) {
        const layout = { top, left };
        localStorage.setItem(`pos-${id}`, JSON.stringify(layout));
    }

    loadLayout(id) {
        const saved = localStorage.getItem(`pos-${id}`);
        if (saved) {
            const pos = JSON.parse(saved);
            const el = document.getElementById(id);
            if (el) {
                el.style.top = pos.top;
                el.style.left = pos.left;
            }
        }
    }

    // --- THEME ENGINE ---
    updateTheme(color) {
        document.documentElement.style.setProperty('--accent', color);
        localStorage.setItem('theme-accent', color);
    }

    updateGlassOpacity(opacity) {
        document.documentElement.style.setProperty('--glass-opacity', opacity / 100);
        localStorage.setItem('glass-opacity', opacity);
    }

    loadTheme() {
        const savedColor = localStorage.getItem('theme-accent');
        const savedOpacity = localStorage.getItem('glass-opacity');
        
        if (savedColor) {
            document.documentElement.style.setProperty('--accent', savedColor);
            const colorInput = document.getElementById('theme-color');
            if (colorInput) colorInput.value = savedColor;
        }
        
        if (savedOpacity) {
            document.documentElement.style.setProperty('--glass-opacity', savedOpacity / 100);
            const opacityInput = document.getElementById('glass-opacity');
            if (opacityInput) {
                opacityInput.value = savedOpacity;
                document.getElementById('opacity-value').textContent = savedOpacity + '%';
            }
        }
    }

    // --- UTILITY ---
    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize After Hours Portal
const Portal = new AfterHours();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeRoom();
    Portal.loadTheme();
});

// Access key validation
function initializeAccessKeyValidation() {
    // Always show the button
    unlockBtn.classList.remove('hidden');
    
    // Clear error on input
    accessKeyInput.addEventListener('input', () => {
        errorMessage.textContent = '';
    });
    
    // Enter key to submit
    accessKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            validateAndJoin();
        }
    });
    
    unlockBtn.addEventListener('click', validateAndJoin);
}

// Validate and join
async function validateAndJoin() {
    const enteredKey = accessKeyInput.value.trim().toUpperCase();
    
    if (!enteredKey) {
        errorMessage.textContent = 'Please enter access code';
        return;
    }
    
    // Disable button while validating
    unlockBtn.disabled = true;
    unlockBtn.textContent = 'VALIDATING...';
    
    try {
        // Try API validation first (database-backed)
        const response = await fetch('/api/rooms/verify-access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomName: roomName,
                accessCode: enteredKey
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Access granted via API
            unlockBtn.textContent = 'ACCESS GRANTED';
            setTimeout(() => {
                // Hide gatekeeper
                gatekeeper.classList.remove('active');
                gatekeeper.classList.add('hidden');
                
                // Show video container
                videoContainer.classList.remove('hidden');
                
                // Start the call
                startCall();
            }, 500);
            return;
        } else if (response.status === 404) {
            // Room not in database, fall back to localStorage
            console.log('Room not in database, using localStorage fallback');
        } else {
            // API validation failed
            errorMessage.textContent = data.error || 'Invalid access code';
            unlockBtn.disabled = false;
            unlockBtn.textContent = 'ESTABLISH LINK';
            accessKeyInput.value = '';
            accessKeyInput.focus();
            return;
        }
    } catch (error) {
        // API not available, fall back to localStorage
        console.log('API not available, using localStorage fallback:', error);
    }
    
    // Fallback: Check against stored access code in localStorage (legacy)
    if (roomAccessCode && enteredKey === roomAccessCode) {
        unlockBtn.textContent = 'ACCESS GRANTED';
        setTimeout(() => {
            // Hide gatekeeper
            gatekeeper.classList.remove('active');
            gatekeeper.classList.add('hidden');
            
            // Show video container
            videoContainer.classList.remove('hidden');
            
            // Start the call
            startCall();
        }, 500);
    } else {
        errorMessage.textContent = 'Invalid access code. Please try again.';
        unlockBtn.disabled = false;
        unlockBtn.textContent = 'ESTABLISH_LINK';
        accessKeyInput.value = '';
        accessKeyInput.focus();
    }
}

// Start Daily.co call with iframe
function startCall() {
    const dailyUrl = getDailyRoomUrl();
    
    if (!dailyUrl) {
        console.error('Daily URL not configured');
        errorMessage.textContent = 'Configuration error';
        return;
    }
    
    // Create Daily.co iframe
    dailyCall = window.DailyIframe.createFrame(videoContainer, {
        showLeaveButton: true,
        showFullscreenButton: true,
        iframeStyle: {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            border: '0',
            zIndex: '1'
        }
    });
    
    // Join the room
    dailyCall.join({ url: dailyUrl })
        .then(() => {
            // Show STT controls if Deepgram key is configured
            if (DEEPGRAM_KEY) {
                sttToggle.classList.remove('hidden');
                initializeSTTControls();
            }
            
            // Initialize After Hours features
            initializeAfterHours();
            
            // Initialize watermark
            initializeWatermark();
            
            // Start session timer
            startSessionTimer();
        })
        .catch(error => {
            console.error('Failed to join room:', error);
            errorMessage.textContent = 'Failed to join video room';
        });
}

// Initialize watermark
function initializeWatermark() {
    const watermark = document.getElementById('watermark');
    if (!watermark) return;
    
    function updateWatermark() {
        const now = new Date();
        const timestamp = now.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        watermark.textContent = `${roomName.toUpperCase()} • ${timestamp}`;
    }
    
    // Update immediately and every 30 seconds
    updateWatermark();
    setInterval(updateWatermark, 30000);
}

// Start session timer
function startSessionTimer() {
    if (!config) return;
    
    sessionStartTime = Date.now();
    const maxDuration = config.maxSessionDuration * 1000; // Convert to ms
    const warningTime = (config.maxSessionDuration - (config.maxSessionDuration - config.sessionWarningTime)) * 1000; // Time before end to warn
    
    sessionTimer = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        const remaining = maxDuration - elapsed;
        
        // Show warning when remaining time drops below warning threshold
        if (remaining <= warningTime && !sessionWarningShown) {
            showSessionWarning(remaining);
            sessionWarningShown = true;
        }
        
        // End session when time is up
        if (remaining <= 0) {
            endSession();
        }
    }, 1000);
}

// Show session warning
function showSessionWarning(remainingMs) {
    const warningElement = document.getElementById('session-warning');
    const warningTimeElement = document.getElementById('warning-time');
    
    if (!warningElement || !warningTimeElement) return;
    
    warningElement.style.display = 'flex';
    
    // Update countdown
    const updateCountdown = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        const remaining = (config.maxSessionDuration * 1000) - elapsed;
        
        if (remaining <= 0) {
            clearInterval(updateCountdown);
            return;
        }
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        warningTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// End session
function endSession() {
    clearInterval(sessionTimer);
    
    // Leave the call
    if (dailyCall) {
        dailyCall.leave();
        dailyCall.destroy();
    }
    
    // Show session ended screen
    const sessionEndedElement = document.getElementById('session-ended');
    if (sessionEndedElement) {
        sessionEndedElement.style.display = 'flex';
    }
    
    // Setup reconnect button
    const reconnectBtn = document.getElementById('reconnect-btn');
    if (reconnectBtn) {
        reconnectBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }
}

// Initialize Speech-to-Text controls
function initializeSTTControls() {
    sttToggle.addEventListener('click', toggleTranscription);
    clearTranscriptBtn.addEventListener('click', clearTranscript);
    makeDraggable(transcriptFeed);
}

// Toggle transcription on/off
async function toggleTranscription() {
    if (!isTranscriptionActive) {
        await startTranscription();
    } else {
        stopTranscription();
    }
}

// Start Deepgram transcription
async function startTranscription() {
    if (!DEEPGRAM_KEY) {
        console.error('Deepgram API key not configured');
        return;
    }

    try {
        // Get audio stream from user's microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Connect to Deepgram WebSocket
        const wsUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&language=en`;
        deepgramSocket = new WebSocket(wsUrl, ['token', DEEPGRAM_KEY]);

        deepgramSocket.onopen = () => {
            console.log('Deepgram connection opened');
            isTranscriptionActive = true;
            sttToggle.classList.add('active');
            transcriptFeed.classList.remove('hidden');

            // Start recording audio
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0 && deepgramSocket.readyState === WebSocket.OPEN) {
                    deepgramSocket.send(event.data);
                }
            });

            mediaRecorder.start(250); // Send data every 250ms
        };

        deepgramSocket.onmessage = (message) => {
            const data = JSON.parse(message.data);
            if (data.channel && data.channel.alternatives[0]) {
                const transcript = data.channel.alternatives[0].transcript;
                if (transcript && transcript.trim().length > 0) {
                    addTranscriptLine(transcript, 'you');
                }
            }
        };

        deepgramSocket.onerror = (error) => {
            console.error('Deepgram error:', error);
            stopTranscription();
        };

        deepgramSocket.onclose = () => {
            console.log('Deepgram connection closed');
            stopTranscription();
        };

    } catch (error) {
        console.error('Failed to start transcription:', error);
    }
}

// Stop transcription
function stopTranscription() {
    isTranscriptionActive = false;
    sttToggle.classList.remove('active');

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
        deepgramSocket.close();
    }

    mediaRecorder = null;
    deepgramSocket = null;
}

// Add transcript line to feed
function addTranscriptLine(text, speaker) {
    const line = document.createElement('div');
    line.className = `transcript-line ${speaker}`;
    
    const speakerSpan = document.createElement('span');
    speakerSpan.className = 'speaker';
    speakerSpan.textContent = speaker === 'you' ? '[YOU]' : '[REMOTE]';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'text-content';
    textSpan.textContent = text;
    
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '✎';
    editBtn.setAttribute('aria-label', 'Edit message');
    editBtn.title = 'Edit message';
    editBtn.addEventListener('click', () => enableEditMode(textSpan));
    
    line.appendChild(speakerSpan);
    line.appendChild(textSpan);
    line.appendChild(editBtn);
    
    transcriptContent.appendChild(line);
    transcriptContent.scrollTop = transcriptContent.scrollHeight;
}

// Clear transcript
function clearTranscript() {
    transcriptContent.innerHTML = '';
}

// Make element draggable
function makeDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    // Get the header element as drag handle
    const header = element.querySelector('.transcript-header');
    if (!header) return;
    
    // Add cursor style to indicate draggable
    header.style.cursor = 'move';
    
    // Mouse events
    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    
    // Touch events
    header.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);
    
    function dragStart(e) {
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }
        
        if (e.target === header || header.contains(e.target)) {
            // Don't drag if clicking on the clear button
            if (e.target.classList?.contains('clear-btn')) {
                return;
            }
            isDragging = true;
        }
    }
    
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }
            
            xOffset = currentX;
            yOffset = currentY;
            
            setTranslate(currentX, currentY, element);
        }
    }
    
    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }
    
    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
}

// Enable edit mode for a message
function enableEditMode(textSpan) {
    const currentText = textSpan.textContent;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = currentText;
    input.setAttribute('aria-label', 'Edit message text');
    
    // Replace text span with input
    textSpan.replaceWith(input);
    input.focus();
    input.select();
    
    // Track if editing was cancelled
    let cancelled = false;
    
    // Helper to create text span
    const createTextSpan = (text, isEdited) => {
        const span = document.createElement('span');
        span.className = isEdited ? 'text-content edited' : 'text-content';
        span.textContent = text;
        if (isEdited) {
            span.title = 'Edited';
            span.setAttribute('aria-label', `Message edited: ${text}`);
        }
        return span;
    };
    
    // Save edit
    const saveEdit = () => {
        if (cancelled) return;
        
        const newText = input.value.trim();
        const textToUse = newText || currentText;
        const isEdited = newText && newText !== currentText;
        input.replaceWith(createTextSpan(textToUse, isEdited));
    };
    
    // Cancel edit
    const cancelEdit = () => {
        cancelled = true;
        input.replaceWith(createTextSpan(currentText, false));
    };
    
    // Handle keyboard events
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
    
    input.addEventListener('blur', saveEdit);
}

// ===== AFTER HOURS INITIALIZATION =====
function initializeAfterHours() {
    // Make widgets draggable
    Portal.makeDraggable('chat-widget');
    Portal.makeDraggable('ledger-widget');
    Portal.makeDraggable('controls-widget');
    
    // Load saved positions
    Portal.loadLayout('chat-widget');
    Portal.loadLayout('ledger-widget');
    Portal.loadLayout('controls-widget');
    
    // Widget toggle buttons
    document.getElementById('toggle-chat').addEventListener('click', () => {
        toggleWidget('chat-widget', 'toggle-chat');
    });
    
    document.getElementById('toggle-ledger').addEventListener('click', () => {
        toggleWidget('ledger-widget', 'toggle-ledger');
    });
    
    document.getElementById('toggle-controls').addEventListener('click', () => {
        toggleWidget('controls-widget', 'toggle-controls');
    });
    
    // Widget close buttons
    document.querySelectorAll('.widget-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const widgetId = e.currentTarget.dataset.widget;
            const widget = document.getElementById(widgetId);
            const toggleBtn = document.getElementById('toggle-' + widgetId.replace('-widget', ''));
            widget.classList.add('hidden');
            if (toggleBtn) toggleBtn.classList.remove('active');
        });
    });
    
    // Chat functionality
    initializeChat();
    
    // Tip/Ledger functionality
    initializeTipSystem();
    
    // Controls functionality
    initializeControls();
    
    // Setup Daily.co app message listener for chat
    if (dailyCall) {
        dailyCall.on('app-message', handleAppMessage);
    }
}

function toggleWidget(widgetId, buttonId) {
    const widget = document.getElementById(widgetId);
    const button = document.getElementById(buttonId);
    
    if (widget.classList.contains('hidden')) {
        widget.classList.remove('hidden');
        button.classList.add('active');
    } else {
        widget.classList.add('hidden');
        button.classList.remove('active');
    }
}

function initializeChat() {
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    
    const sendMessage = () => {
        const message = chatInput.value.trim();
        if (message && dailyCall) {
            // Sanitize input
            const sanitized = message.replace(/[^a-zA-Z0-9\s.,!?'-]/g, '');
            
            // Send via Daily.co app message
            dailyCall.sendAppMessage({
                type: 'chat',
                message: sanitized,
                sender: 'You'
            }, '*');
            
            // Add to local chat
            addChatMessage('You', sanitized, true);
            
            chatInput.value = '';
        }
    };
    
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function addChatMessage(sender, message, isSelf = false) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = isSelf ? 'chat-message self' : 'chat-message';
    
    const senderSpan = document.createElement('div');
    senderSpan.className = 'sender';
    senderSpan.textContent = sender;
    
    const textSpan = document.createElement('div');
    textSpan.className = 'text';
    textSpan.textContent = message;
    
    messageDiv.appendChild(senderSpan);
    messageDiv.appendChild(textSpan);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function initializeTipSystem() {
    const sendTipBtn = document.getElementById('send-tip');
    const tipAmountInput = document.getElementById('tip-amount');
    
    sendTipBtn.addEventListener('click', () => {
        const amount = parseInt(tipAmountInput.value);
        if (amount && amount > 0 && dailyCall) {
            // Send tip notification via Daily.co
            dailyCall.sendAppMessage({
                type: 'tip',
                amount: amount,
                sender: 'You'
            }, '*');
            
            tipAmountInput.value = '';
        }
    });
    
    tipAmountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendTipBtn.click();
        }
    });
}

function initializeControls() {
    // Audio toggle
    const audioToggle = document.getElementById('audio-toggle');
    audioToggle.addEventListener('click', () => {
        Portal.tips.audio = !Portal.tips.audio;
        if (Portal.tips.audio) {
            audioToggle.classList.add('active');
            audioToggle.innerHTML = '<i class="fas fa-volume-up"></i> Enabled';
        } else {
            audioToggle.classList.remove('active');
            audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i> Muted';
        }
    });
    
    // Theme color
    const themeColor = document.getElementById('theme-color');
    themeColor.addEventListener('change', (e) => {
        Portal.updateTheme(e.target.value);
    });
    
    // Glass opacity
    const glassOpacity = document.getElementById('glass-opacity');
    const opacityValue = document.getElementById('opacity-value');
    
    glassOpacity.addEventListener('input', (e) => {
        const value = e.target.value;
        opacityValue.textContent = value + '%';
        Portal.updateGlassOpacity(value);
    });
}

function handleAppMessage(event) {
    if (!event.data) return;
    
    const { type, message, sender, amount } = event.data;
    
    if (type === 'chat') {
        addChatMessage(sender || 'Remote', message, false);
    } else if (type === 'tip') {
        Portal.processTip(sender || 'Remote', amount);
    }
}
