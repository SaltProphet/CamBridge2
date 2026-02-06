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
    : 'https://saltprophet.daily.co/cambridge';
const DEEPGRAM_KEY = typeof process !== 'undefined' && process.env && process.env.DEEPGRAM_KEY 
    ? process.env.DEEPGRAM_KEY 
    : '';

// Application state
let dailyCall = null;

// DOM Elements
const gatekeeper = document.getElementById('gatekeeper');
const videoContainer = document.getElementById('video-container');
const accessKeyInput = document.getElementById('access-key');
const unlockBtn = document.getElementById('unlock-btn');
const errorMessage = document.getElementById('error-message');

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
        .catch(error => {
            console.error('Failed to join room:', error);
            errorMessage.textContent = 'Failed to join video room';
        });
}
