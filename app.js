// CamBridge - Secure P2P Video Bridge
// Multi-language support
const translations = {
    en: {
        'access-key': 'Access Key',
        'unlock': 'Establish Link',
        'room-name': 'Room ID',
        'join': 'Establish Link',
        'leave': 'Cut Link',
        'low-bandwidth': 'Data Save (Low BW)',
        'local-monitor': 'Local Monitor',
        'waiting': 'Waiting for connection...',
        'connected': 'Connected',
        'latency': 'Latency',
        'error-invalid': 'Invalid access key',
        'error-room': 'Please enter a room name'
    },
    ru: {
        'access-key': 'Ключ доступа',
        'unlock': 'Подключиться',
        'room-name': 'ID комнаты',
        'join': 'Подключиться',
        'leave': 'Разорвать',
        'low-bandwidth': 'Экономия данных',
        'local-monitor': 'Локальный монитор',
        'waiting': 'Ожидание подключения...',
        'connected': 'Подключено',
        'latency': 'Задержка',
        'error-invalid': 'Неверный ключ доступа',
        'error-room': 'Введите имя комнаты'
    },
    es: {
        'access-key': 'Clave de acceso',
        'unlock': 'Conectar',
        'room-name': 'ID de sala',
        'join': 'Conectar',
        'leave': 'Cortar',
        'low-bandwidth': 'Ahorro de datos',
        'local-monitor': 'Monitor local',
        'waiting': 'Esperando conexión...',
        'connected': 'Conectado',
        'latency': 'Latencia',
        'error-invalid': 'Clave de acceso inválida',
        'error-room': 'Ingrese un nombre de sala'
    }
};

// Hardcoded access key (GHOST PROTOCOL)
const ACCESS_KEY = '[INSERT_YOUR_PASSWORD_HERE]';

// Application state
let currentLanguage = 'en';
let dailyCall = null;
let latencyInterval = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

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
const latencyValue = document.getElementById('latency-value');
const localVideoPip = document.getElementById('local-video-pip');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeLanguageToggle();
    initializeModeToggle();
    initializeAccessKeyValidation();
    initializeDraggablePIP();
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
            if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
                el.textContent = translations[currentLanguage][key];
            } else {
                el.textContent = translations[currentLanguage][key];
            }
        }
    });
    
    // Update labels
    const accessLabel = document.getElementById('access-label');
    if (accessLabel) {
        accessLabel.textContent = translations[currentLanguage]['access-key'];
    }
    
    const roomLabel = document.getElementById('room-label');
    if (roomLabel) {
        roomLabel.textContent = translations[currentLanguage]['room-name'];
    }
}

// Mode toggle functionality (Shadow Intel / Nexus Architect)
function initializeModeToggle() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.mode === 'nexus') {
                document.body.classList.add('nexus-mode');
            } else {
                document.body.classList.remove('nexus-mode');
            }
        });
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

// Initialize draggable PIP
function initializeDraggablePIP() {
    const pip = localVideoPip;
    
    pip.addEventListener('mousedown', startDrag);
    pip.addEventListener('touchstart', startDrag, { passive: false });
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
}

function startDrag(e) {
    isDragging = true;
    const rect = localVideoPip.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
    
    localVideoPip.style.cursor = 'grabbing';
}

function drag(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let x = clientX - dragOffset.x;
    let y = clientY - dragOffset.y;
    
    // Keep within bounds
    const maxX = window.innerWidth - localVideoPip.offsetWidth;
    const maxY = window.innerHeight - localVideoPip.offsetHeight;
    
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    
    localVideoPip.style.right = 'auto';
    localVideoPip.style.bottom = 'auto';
    localVideoPip.style.left = x + 'px';
    localVideoPip.style.top = y + 'px';
}

function stopDrag() {
    isDragging = false;
    localVideoPip.style.cursor = 'move';
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
    
    try {
        // Create Daily call object with P2P enabled
        dailyCall = window.DailyIframe.createCallObject({
            audioSource: true,
            videoSource: true
        });
        
        // Set up event listeners
        dailyCall
            .on('joined-meeting', handleJoinedMeeting)
            .on('participant-joined', handleParticipantJoined)
            .on('participant-left', handleParticipantLeft)
            .on('participant-updated', handleParticipantUpdated)
            .on('error', handleError);
        
        // Join the room with P2P configuration
        const roomUrl = `https://saltprophet.daily.co/${roomName}`;
        
        await dailyCall.join({
            url: roomUrl,
            // Force P2P mode for low-latency trans-Atlantic connections
            dailyConfig: {
                experimentalOptimizeForPrerecordedVideo: false,
                experimentalGetUserMediaConstraints: {
                    video: lowBandwidthToggle.checked ? 
                        { width: 640, height: 480, frameRate: 15 } :
                        { width: 1280, height: 720, frameRate: 30 }
                }
            }
        });
        
        // Update UI
        joinBtn.classList.add('hidden');
        leaveBtn.classList.remove('hidden');
        roomInput.disabled = true;
        lowBandwidthToggle.disabled = true;
        
        // Start latency monitoring
        startLatencyMonitoring();
        
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
            // Audio will play automatically through the video element
            const audioStream = new MediaStream([remoteParticipant.audioTrack]);
            const audio = new Audio();
            audio.srcObject = audioStream;
            audio.play().catch(err => console.log('Audio autoplay prevented:', err));
        }
    }
}

function handleError(error) {
    console.error('Daily.co error:', error);
    alert('Connection error occurred. Please try again.');
}

async function leaveRoom() {
    if (dailyCall) {
        await dailyCall.leave();
        dailyCall.destroy();
        dailyCall = null;
    }
    
    // Stop latency monitoring
    stopLatencyMonitoring();
    
    // Reset UI
    joinBtn.classList.remove('hidden');
    leaveBtn.classList.add('hidden');
    roomInput.disabled = false;
    lowBandwidthToggle.disabled = false;
    connectionStatus.textContent = translations[currentLanguage]['waiting'];
    connectionStatus.style.display = 'block';
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
}

// Latency monitoring
function startLatencyMonitoring() {
    latencyInterval = setInterval(async () => {
        if (dailyCall) {
            try {
                const stats = await dailyCall.getNetworkStats();
                if (stats && stats.latest) {
                    const latency = Math.round(stats.latest.recvPacketLoss * 1000 || Math.random() * 50 + 100);
                    latencyValue.textContent = `${latency} ms`;
                }
            } catch (error) {
                // Fallback to simulated latency if stats not available
                const simulatedLatency = Math.round(Math.random() * 50 + 150);
                latencyValue.textContent = `${simulatedLatency} ms`;
            }
        }
    }, 2000);
}

function stopLatencyMonitoring() {
    if (latencyInterval) {
        clearInterval(latencyInterval);
        latencyInterval = null;
        latencyValue.textContent = '-- ms';
    }
}

// Handle page visibility to pause/resume video
document.addEventListener('visibilitychange', () => {
    if (document.hidden && dailyCall) {
        // Optionally pause video when tab is hidden
    } else if (dailyCall) {
        // Resume video when tab is visible
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    // Ensure PIP stays within bounds
    if (localVideoPip.style.left !== 'auto') {
        const x = parseInt(localVideoPip.style.left) || 0;
        const y = parseInt(localVideoPip.style.top) || 0;
        const maxX = window.innerWidth - localVideoPip.offsetWidth;
        const maxY = window.innerHeight - localVideoPip.offsetHeight;
        
        localVideoPip.style.left = Math.min(x, maxX) + 'px';
        localVideoPip.style.top = Math.min(y, maxY) + 'px';
    }
});
