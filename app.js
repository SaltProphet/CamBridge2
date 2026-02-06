// CamBridge - Secure P2P Video Bridge - Clean Picture (Nexus Architect)
// Multi-language support
const translations = {
    en: {
        'access-key': 'ACCESS_KEY',
        'unlock': 'ESTABLISH_LINK',
        'room-name': 'ROOM_ID',
        'join': 'ESTABLISH_LINK',
        'leave': 'LINK_TERMINATE',
        'low-bandwidth': 'DATA_SAVE',
        'waiting': 'WAITING_FOR_CONNECTION...',
        'connected': 'CONNECTED',
        'error-invalid': 'INVALID_ACCESS_KEY',
        'error-room': 'ENTER_ROOM_NAME'
    },
    ru: {
        'access-key': 'КЛЮЧ_ДОСТУПА',
        'unlock': 'ПОДКЛЮЧИТЬСЯ',
        'room-name': 'ID_КОМНАТЫ',
        'join': 'ПОДКЛЮЧИТЬСЯ',
        'leave': 'РАЗОРВАТЬ',
        'low-bandwidth': 'ЭКОНОМИЯ_ДАННЫХ',
        'waiting': 'ОЖИДАНИЕ_ПОДКЛЮЧЕНИЯ...',
        'connected': 'ПОДКЛЮЧЕНО',
        'error-invalid': 'НЕВЕРНЫЙ_КЛЮЧ',
        'error-room': 'ВВЕДИТЕ_ИМЯ_КОМНАТЫ'
    },
    es: {
        'access-key': 'CLAVE_DE_ACCESO',
        'unlock': 'CONECTAR',
        'room-name': 'ID_DE_SALA',
        'join': 'CONECTAR',
        'leave': 'TERMINAR',
        'low-bandwidth': 'AHORRO_DE_DATOS',
        'waiting': 'ESPERANDO_CONEXIÓN...',
        'connected': 'CONECTADO',
        'error-invalid': 'CLAVE_INVÁLIDA',
        'error-room': 'INGRESE_NOMBRE_DE_SALA'
    }
};

// Hardcoded access key (GHOST PROTOCOL)
const ACCESS_KEY = '[INSERT_YOUR_PASSWORD_HERE]';

// Application state
let currentLanguage = 'en';
let dailyCall = null;
let controlsTimeout = null;
let remoteAudioElement = null;

// DOM Elements
const landingPage = document.getElementById('landing-page');
const videoInterface = document.getElementById('video-interface');
const accessKeyInput = document.getElementById('access-key');
const unlockBtn = document.getElementById('unlock-btn');
const errorMessage = document.getElementById('error-message');
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');
const lowBandwidthToggle = document.getElementById('low-bandwidth-toggle');
const remoteVideo = document.getElementById('remote-video');
const localVideo = document.getElementById('local-video');
const connectionStatus = document.getElementById('connection-status');
const controlsOverlay = document.getElementById('controls-overlay');
const ghostChatToggle = document.getElementById('ghost-chat-toggle');
const ghostChatInput = document.getElementById('ghost-chat-input');
const ghostChatMessages = document.getElementById('ghost-chat-messages');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeLanguageToggle();
    initializeAccessKeyValidation();
    initializeAutoHideControls();
    initializeGhostChat();
});

// Language toggle functionality
function initializeLanguageToggle() {
    const langButtons = document.querySelectorAll('.lang-btn');
    
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLanguage = btn.dataset.lang;
            updateTranslations();
        });
    });
}

// Update all text based on current language
function updateTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.dataset.i18n;
        if (translations[currentLanguage][key]) {
            el.textContent = translations[currentLanguage][key];
        }
    });
}

// Access key validation
function initializeAccessKeyValidation() {
    accessKeyInput.addEventListener('input', () => {
        const value = accessKeyInput.value;
        errorMessage.textContent = '';
        
        if (value === ACCESS_KEY) {
            unlockBtn.classList.remove('hidden');
        } else {
            unlockBtn.classList.add('hidden');
        }
    });
    
    accessKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && accessKeyInput.value === ACCESS_KEY) {
            unlockApp();
        }
    });
    
    unlockBtn.addEventListener('click', unlockApp);
}

// Unlock application
function unlockApp() {
    if (accessKeyInput.value === ACCESS_KEY) {
        landingPage.classList.remove('active');
        videoInterface.classList.remove('hidden');
        videoInterface.classList.add('active');
    } else {
        errorMessage.textContent = translations[currentLanguage]['error-invalid'];
    }
}

// Auto-hide controls on mouse movement
function initializeAutoHideControls() {
    let hideTimeout;
    
    const showControls = () => {
        if (controlsOverlay) {
            controlsOverlay.classList.add('visible');
        }
        
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            if (controlsOverlay && !ghostChatInput.classList.contains('active')) {
                controlsOverlay.classList.remove('visible');
            }
        }, 3000);
    };
    
    // Show controls on mouse move
    videoInterface.addEventListener('mousemove', showControls);
    
    // Show controls on touch
    videoInterface.addEventListener('touchstart', showControls);
    
    // Keep controls visible when interacting with them
    if (controlsOverlay) {
        controlsOverlay.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
        });
        
        controlsOverlay.addEventListener('mouseleave', () => {
            hideTimeout = setTimeout(() => {
                if (!ghostChatInput.classList.contains('active')) {
                    controlsOverlay.classList.remove('visible');
                }
            }, 1000);
        });
    }
}

// Daily.co P2P Video Connection
joinBtn.addEventListener('click', joinRoom);
leaveBtn.addEventListener('click', leaveRoom);

roomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoom();
    }
});

async function joinRoom() {
    const roomName = roomInput.value.trim();
    
    if (!roomName) {
        alert(translations[currentLanguage]['error-room']);
        return;
    }
    
    // Sanitize room name to prevent security issues
    const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '-');
    
    try {
        // Create Daily call object with P2P optimizations
        dailyCall = window.DailyIframe.createCallObject({
            audioSource: true,
            videoSource: true,
            subscribeToTracksAutomatically: true
        });
        
        // Set up event listeners
        dailyCall
            .on('joined-meeting', handleJoinedMeeting)
            .on('participant-joined', handleParticipantJoined)
            .on('participant-left', handleParticipantLeft)
            .on('participant-updated', handleParticipantUpdated)
            .on('app-message', handleAppMessage)
            .on('error', handleError);
        
        // Join the room with P2P configuration and SA link optimization
        const roomUrl = `https://saltprophet.daily.co/${sanitizedRoomName}`;
        
        await dailyCall.join({
            url: roomUrl,
            // P2P optimization for trans-Atlantic link
            dailyConfig: {
                experimentalOptimizeForPrerecordedVideo: false,
                experimentalGetUserMediaConstraints: {
                    video: lowBandwidthToggle.checked ? 
                        { width: 640, height: 480, frameRate: 15 } :
                        { width: 1920, height: 1080, frameRate: 30 }
                }
            }
        });
        
        // Set bandwidth optimization for SA link (removed no-limit as it may not be valid)
        // Using high bitrate limit for trans-Atlantic link quality
        try {
            await dailyCall.setBandwidth({ 
                trackConstraints: {
                    video: { 
                        maxBitrate: lowBandwidthToggle.checked ? 800 : 2500
                    }
                }
            });
        } catch (e) {
            console.warn('Bandwidth optimization not available:', e);
        }
        
        // Update UI
        joinBtn.classList.add('hidden');
        leaveBtn.classList.remove('hidden');
        roomInput.disabled = true;
        lowBandwidthToggle.disabled = true;
        
    } catch (error) {
        console.error('Failed to join room:', error);
        alert('Failed to join room. Please check the room name and try again.');
    }
}

function handleJoinedMeeting(event) {
    console.log('Joined meeting:', event);
    
    // Get local video track
    const localParticipant = dailyCall.participants().local;
    if (localParticipant && localParticipant.video) {
        localVideo.srcObject = new MediaStream([localParticipant.videoTrack]);
    }
}

function handleParticipantJoined(event) {
    console.log('Participant joined:', event);
    updateRemoteVideo();
}

function handleParticipantLeft(event) {
    console.log('Participant left:', event);
    connectionStatus.textContent = translations[currentLanguage]['waiting'];
    connectionStatus.style.display = 'block';
    remoteVideo.srcObject = null;
}

function handleParticipantUpdated(event) {
    console.log('Participant updated:', event);
    updateRemoteVideo();
}

function updateRemoteVideo() {
    const participants = dailyCall.participants();
    const remoteParticipants = Object.values(participants).filter(p => !p.local);
    
    if (remoteParticipants.length > 0) {
        const remoteParticipant = remoteParticipants[0];
        if (remoteParticipant.video && remoteParticipant.videoTrack) {
            remoteVideo.srcObject = new MediaStream([remoteParticipant.videoTrack]);
            connectionStatus.style.display = 'none';
        }
        
        if (remoteParticipant.audio && remoteParticipant.audioTrack) {
            // Clean up existing audio element if any
            if (remoteAudioElement) {
                remoteAudioElement.srcObject = null;
                remoteAudioElement = null;
            }
            
            // Create new audio element for remote audio
            const audioStream = new MediaStream([remoteParticipant.audioTrack]);
            remoteAudioElement = new Audio();
            remoteAudioElement.srcObject = audioStream;
            remoteAudioElement.play().catch(err => console.log('Audio autoplay prevented:', err));
        }
    }
}

function handleError(error) {
    console.error('Daily.co error:', error);
    alert('Connection error occurred. Please try again.');
}

function handleAppMessage(event) {
    // Handle incoming ghost chat messages
    if (event.data && event.data.type === 'ghost-chat') {
        displayGhostMessage(event.data.message);
    }
}

async function leaveRoom() {
    if (dailyCall) {
        await dailyCall.leave();
        dailyCall.destroy();
        dailyCall = null;
    }
    
    // Clean up audio element
    if (remoteAudioElement) {
        remoteAudioElement.srcObject = null;
        remoteAudioElement = null;
    }
    
    // Reset UI
    joinBtn.classList.remove('hidden');
    leaveBtn.classList.add('hidden');
    roomInput.disabled = false;
    lowBandwidthToggle.disabled = false;
    connectionStatus.textContent = translations[currentLanguage]['waiting'];
    connectionStatus.style.display = 'block';
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
    
    // Hide ghost chat
    if (ghostChatInput) {
        ghostChatInput.classList.remove('active');
        ghostChatInput.value = '';
    }
    if (ghostChatToggle) {
        ghostChatToggle.classList.remove('active');
    }
}

// ============================================================================
// EPHEMERAL GHOST CHAT
// ============================================================================

const GHOST_MESSAGE_DURATION = 4000; // Must match CSS animation duration

function initializeGhostChat() {
    if (!ghostChatInput || !ghostChatToggle) return;
    
    // Toggle ghost chat input with 'T' key (but not Enter to avoid conflicts)
    document.addEventListener('keydown', (e) => {
        // Only activate with 'T' key, not Enter (to avoid form submission conflicts)
        if ((e.key === 't' || e.key === 'T') && !ghostChatInput.classList.contains('active') && dailyCall) {
            e.preventDefault();
            showGhostChatInput();
        }
        
        if (e.key === 'Escape' && ghostChatInput.classList.contains('active')) {
            hideGhostChatInput();
        }
    });
    
    // Toggle via button
    ghostChatToggle.addEventListener('click', () => {
        if (ghostChatInput.classList.contains('active')) {
            hideGhostChatInput();
        } else if (dailyCall) {
            showGhostChatInput();
        }
    });
    
    // Send message on Enter
    ghostChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendGhostMessage();
        }
    });
}

function showGhostChatInput() {
    if (!ghostChatInput || !dailyCall) return;
    
    ghostChatInput.classList.add('active');
    ghostChatToggle.classList.add('active');
    ghostChatInput.focus();
    
    // Keep controls visible while typing
    if (controlsOverlay) {
        controlsOverlay.classList.add('visible');
    }
}

function hideGhostChatInput() {
    if (!ghostChatInput) return;
    
    ghostChatInput.classList.remove('active');
    ghostChatToggle.classList.remove('active');
    ghostChatInput.value = '';
}

function sendGhostMessage() {
    const message = ghostChatInput.value.trim();
    
    if (!message) {
        hideGhostChatInput();
        return;
    }
    if (!dailyCall) return;
    
    // Sanitize message to prevent XSS
    const sanitizedMessage = sanitizeGhostMessage(message);
    
    // Display message locally
    displayGhostMessage(sanitizedMessage);
    
    // Send to remote participant via Daily.co app message
    try {
        dailyCall.sendAppMessage({
            type: 'ghost-chat',
            message: sanitizedMessage
        });
    } catch (error) {
        console.error('Failed to send ghost message:', error);
    }
    
    // Hide input after sending
    hideGhostChatInput();
}

function sanitizeGhostMessage(text) {
    // More comprehensive sanitization to prevent XSS
    // Remove ALL HTML-like tags and entities, limit length
    let sanitized = text
        .replace(/<[^>]*>/g, '')  // Remove tags
        .replace(/</g, '')        // Remove < 
        .replace(/>/g, '')        // Remove >
        .replace(/&/g, '')        // Remove &
        .replace(/"/g, '')        // Remove quotes
        .replace(/'/g, '')        // Remove single quotes
        .substring(0, 200);       // Limit length
    return sanitized;
}

function displayGhostMessage(text) {
    if (!ghostChatMessages) return;
    
    // Create ghost message element
    const messageEl = document.createElement('div');
    messageEl.className = 'ghost-message';
    messageEl.textContent = text;
    
    // Add to container
    ghostChatMessages.appendChild(messageEl);
    
    // Remove after animation completes (matches CSS animation duration)
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, GHOST_MESSAGE_DURATION);
}
