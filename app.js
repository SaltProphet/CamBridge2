// CamBridge - Secure P2P Video Bridge - Clean Picture (Nexus Architect)
// After Hours Portal - Model-First Economy & Modular UI

// Environment variables - Replace these at build time with actual values
// In Vercel Browser Editor, set these as environment variables:
// - ACCESS_KEY: Your password for accessing the bridge
// - DAILY_URL: Your Daily.co room URL
// - DEEPGRAM_KEY: Your Deepgram API key for transcription
// - PRIVATE_ROOM_URL: Your private Daily.co room URL (optional)
const ACCESS_KEY = typeof process !== 'undefined' && process.env && process.env.ACCESS_KEY 
    ? process.env.ACCESS_KEY 
    : 'C2C';
const DAILY_URL = typeof process !== 'undefined' && process.env && process.env.DAILY_URL 
    ? process.env.DAILY_URL 
    : 'https://cambridge.daily.co/Cambridge';
const PRIVATE_ROOM_URL = typeof process !== 'undefined' && process.env && process.env.PRIVATE_ROOM_URL 
    ? process.env.PRIVATE_ROOM_URL 
    : 'https://cambridge.daily.co/Cambridge-Private';
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
        this.currentRoom = 'public';
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

    // --- ROOM ROUTER ---
    switchRoom(roomType) {
        this.currentRoom = roomType;
        const roomUrl = roomType === 'private' ? PRIVATE_ROOM_URL : DAILY_URL;
        
        if (dailyCall) {
            dailyCall.leave().then(() => {
                dailyCall.join({ url: roomUrl });
            });
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeAccessKeyValidation();
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
function validateAndJoin() {
    const enteredKey = accessKeyInput.value.trim();
    
    if (!enteredKey) {
        errorMessage.textContent = 'ENTER_ACCESS_KEY';
        return;
    }
    
    if (enteredKey === ACCESS_KEY) {
        // Hide gatekeeper
        gatekeeper.classList.remove('active');
        gatekeeper.classList.add('hidden');
        
        // Show video container
        videoContainer.classList.remove('hidden');
        
        // Start the call
        startCall();
    } else {
        errorMessage.textContent = 'INVALID_ACCESS_KEY - TRY AGAIN';
        accessKeyInput.value = '';
        accessKeyInput.focus();
    }
}

// Start Daily.co call with iframe
function startCall() {
    if (!DAILY_URL) {
        console.error('DAILY_URL not configured');
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
            border: '0'
        }
    });
    
    // Join the room
    dailyCall.join({ url: DAILY_URL })
        .then(() => {
            // Show STT controls if Deepgram key is configured
            if (DEEPGRAM_KEY) {
                sttToggle.classList.remove('hidden');
                initializeSTTControls();
            }
            
            // Initialize After Hours features
            initializeAfterHours();
        })
        .catch(error => {
            console.error('Failed to join room:', error);
            errorMessage.textContent = 'Failed to join video room';
        });
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
    // Room switcher
    const publicBtn = document.getElementById('room-public');
    const privateBtn = document.getElementById('room-private');
    
    publicBtn.addEventListener('click', () => {
        publicBtn.classList.add('active');
        privateBtn.classList.remove('active');
        Portal.switchRoom('public');
    });
    
    privateBtn.addEventListener('click', () => {
        privateBtn.classList.add('active');
        publicBtn.classList.remove('active');
        Portal.switchRoom('private');
    });
    
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
