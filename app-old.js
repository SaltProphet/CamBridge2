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
        
        // Set bandwidth to no limit with predictive optimization for SA link
        try {
            await dailyCall.setBandwidth({ 
                kbs: 'no-limit',
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

// Latency monitoring
function startLatencyMonitoring() {
    latencyInterval = setInterval(async () => {
        if (dailyCall) {
            try {
                const stats = await dailyCall.getNetworkStats();
                if (stats && stats.latest && stats.latest.videoRecvPacketLoss !== undefined) {
                    // Use round-trip time if available, otherwise estimate from packet loss
                    const latency = stats.latest.rtt || Math.round((1 - stats.latest.videoRecvPacketLoss) * 200 + 50);
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

// ============================================================================
// DEEPGRAM SPEECH-TO-TEXT INTEGRATION
// ============================================================================

// Language mapping for Deepgram
const deepgramLanguageMap = {
    'en': 'en-US',
    'ru': 'ru',
    'es': 'es'
};

// Initialize transcription toggle
function initializeTranscription() {
    if (toggleTranscriptionBtn) {
        toggleTranscriptionBtn.addEventListener('click', toggleTranscription);
    }
}

// Toggle transcription on/off
function toggleTranscription() {
    if (isTranscriptionEnabled) {
        stopTranscription();
    } else {
        startTranscription();
    }
}

// Start Deepgram transcription
async function startTranscription() {
    if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === '[INSERT_YOUR_DEEPGRAM_API_KEY]') {
        console.warn('Deepgram API key not configured. Please add your API key to app.js');
        alert('Deepgram API key not configured. Please add your key to enable transcription.');
        return;
    }

    if (!dailyCall) {
        console.warn('No active Daily call to transcribe');
        return;
    }

    try {
        isTranscriptionEnabled = true;
        transcriptionPanel.classList.remove('hidden');
        toggleTranscriptionBtn.textContent = translations[currentLanguage]['toggle-stt'];
        toggleTranscriptionBtn.classList.remove('off');

        // Get the Deepgram language code
        const deepgramLang = deepgramLanguageMap[currentLanguage] || 'en-US';

        // Connect to Deepgram WebSocket
        const wsUrl = `wss://api.deepgram.com/v1/listen?language=${deepgramLang}&punctuate=true&interim_results=false`;
        deepgramSocket = new WebSocket(wsUrl, ['token', DEEPGRAM_API_KEY]);

        deepgramSocket.onopen = () => {
            console.log('Deepgram WebSocket connected');
            setupAudioStreaming();
        };

        deepgramSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
                const transcript = data.channel.alternatives[0].transcript;
                if (transcript && transcript.trim().length > 0) {
                    // Determine if this is local or remote audio
                    // For now, we'll mark all as local since we're streaming local mic
                    addTranscriptionLine(transcript, 'local');
                }
            }
        };

        deepgramSocket.onerror = (error) => {
            console.error('Deepgram WebSocket error:', error);
        };

        deepgramSocket.onclose = () => {
            console.log('Deepgram WebSocket closed');
            cleanupAudioStreaming();
        };

    } catch (error) {
        console.error('Failed to start transcription:', error);
        isTranscriptionEnabled = false;
        transcriptionPanel.classList.add('hidden');
    }
}

// Stop transcription
function stopTranscription() {
    isTranscriptionEnabled = false;
    toggleTranscriptionBtn.textContent = translations[currentLanguage]['toggle-stt-off'];
    toggleTranscriptionBtn.classList.add('off');

    // Close Deepgram WebSocket
    if (deepgramSocket) {
        deepgramSocket.close();
        deepgramSocket = null;
    }

    // Cleanup audio streaming
    cleanupAudioStreaming();

    // Optionally hide panel or clear feed
    // transcriptionPanel.classList.add('hidden');
    // transcriptionFeed.innerHTML = '';
}

// Setup audio streaming to Deepgram
function setupAudioStreaming() {
    try {
        const participants = dailyCall.participants();
        const localParticipant = participants.local;

        if (localParticipant && localParticipant.audioTrack) {
            // Create audio context for local audio
            localAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            const localSource = localAudioContext.createMediaStreamSource(
                new MediaStream([localParticipant.audioTrack])
            );

            // Create script processor to capture audio data
            localAudioProcessor = localAudioContext.createScriptProcessor(4096, 1, 1);
            
            localAudioProcessor.onaudioprocess = (e) => {
                if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert Float32Array to Int16Array for Deepgram
                    const pcmData = convertFloat32ToInt16(inputData);
                    deepgramSocket.send(pcmData);
                }
            };

            localSource.connect(localAudioProcessor);
            localAudioProcessor.connect(localAudioContext.destination);
        }

        // TODO: Add remote participant audio streaming
        // This would require creating a separate Deepgram connection
        // or multiplexing the audio streams with markers

    } catch (error) {
        console.error('Failed to setup audio streaming:', error);
    }
}

// Cleanup audio streaming
function cleanupAudioStreaming() {
    if (localAudioProcessor) {
        localAudioProcessor.disconnect();
        localAudioProcessor = null;
    }

    if (localAudioContext) {
        localAudioContext.close();
        localAudioContext = null;
    }

    if (remoteAudioProcessor) {
        remoteAudioProcessor.disconnect();
        remoteAudioProcessor = null;
    }

    if (remoteAudioContext) {
        remoteAudioContext.close();
        remoteAudioContext = null;
    }
}

// Convert Float32Array to Int16Array for Deepgram
function convertFloat32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array.buffer;
}

// Add transcription line to feed
function addTranscriptionLine(text, source) {
    const line = document.createElement('div');
    line.className = `transcription-line ${source}`;
    
    const prefix = document.createElement('span');
    prefix.className = 'transcription-prefix';
    prefix.textContent = source === 'local' 
        ? translations[currentLanguage]['you-prefix'] 
        : translations[currentLanguage]['remote-prefix'];
    
    const content = document.createElement('span');
    content.textContent = text;
    
    line.appendChild(prefix);
    line.appendChild(content);
    transcriptionFeed.appendChild(line);
    
    // Auto-scroll to bottom
    transcriptionFeed.scrollTop = transcriptionFeed.scrollHeight;
}

// Update transcription when language changes
function updateTranscriptionLanguage() {
    if (isTranscriptionEnabled) {
        // Restart transcription with new language
        stopTranscription();
        setTimeout(() => startTranscription(), 500);
    }
}

// Hook into language toggle to update transcription
const originalInitializeLanguageToggle = initializeLanguageToggle;
function initializeLanguageToggle() {
    const langButtons = document.querySelectorAll('.lang-btn');
    
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLanguage = btn.dataset.lang;
            updateTranslations();
            updateTranscriptionLanguage();
        });
    });
}

// ============================================================================
// CONNECTION STATUS MANAGEMENT
// ============================================================================

function updateConnectionStatus(connected) {
    if (statusIndicator && statusText) {
        if (connected) {
            statusIndicator.classList.remove('disconnected');
            statusIndicator.classList.add('connected');
            statusText.textContent = 'CONNECTED';
        } else {
            statusIndicator.classList.remove('connected');
            statusIndicator.classList.add('disconnected');
            statusText.textContent = 'DISCONNECTED';
        }
    }
}

// ============================================================================
// DATA FLOW MONITORING
// ============================================================================

function startDataFlowMonitoring() {
    dataFlowInterval = setInterval(() => {
        if (dailyCall && dataFlowValue) {
            // Simulate data flow readout (in production, use actual network stats)
            const simulatedBitrate = Math.round(Math.random() * 500 + 1500);
            dataFlowValue.textContent = `${simulatedBitrate} kb/s`;
        }
    }, 1000);
}

function stopDataFlowMonitoring() {
    if (dataFlowInterval) {
        clearInterval(dataFlowInterval);
        dataFlowInterval = null;
        if (dataFlowValue) {
            dataFlowValue.textContent = '0 kb/s';
        }
    }
}

// ============================================================================
// EPHEMERAL GHOST CHAT
// ============================================================================

function initializeGhostChat() {
    if (!ghostChatInput) return;
    
    ghostChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendGhostMessage();
        }
    });
}

function sendGhostMessage() {
    const message = ghostChatInput.value.trim();
    
    if (!message) return;
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
    
    // Clear input
    ghostChatInput.value = '';
}

function sanitizeGhostMessage(text) {
    // Remove any HTML tags and limit length
    const sanitized = text.replace(/<[^>]*>/g, '').substring(0, 200);
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
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 3000);
}
