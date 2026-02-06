// CamBridge - Secure P2P Video Bridge - Clean Picture (Nexus Architect)

// Environment variables - Replace these at build time with actual values
// In Vercel Browser Editor, set these as environment variables:
// - ACCESS_KEY: Your password for accessing the bridge
// - DAILY_URL: Your Daily.co room URL
// - DEEPGRAM_KEY: Your Deepgram API key for transcription
const ACCESS_KEY = typeof process !== 'undefined' && process.env && process.env.ACCESS_KEY 
    ? process.env.ACCESS_KEY 
    : 'C2C';
const DAILY_URL = typeof process !== 'undefined' && process.env && process.env.DAILY_URL 
    ? process.env.DAILY_URL 
    : 'https://cambridge.daily.co/Cambridge';
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeAccessKeyValidation();
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
    editBtn.title = 'Edit message';
    editBtn.addEventListener('click', () => enableEditMode(line, textSpan));
    
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
            if (e.target.classList.contains('clear-btn')) {
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
function enableEditMode(line, textSpan) {
    const currentText = textSpan.textContent;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = currentText;
    
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
