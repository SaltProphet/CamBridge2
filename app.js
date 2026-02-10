// CamBridge - Secure P2P Video Bridge - Phase 1 UI
// Multi-language landing page + account creation + room management

// API Keys - MOVE TO ENVIRONMENT VARIABLES IN PRODUCTION
// Security Warning: These should NOT be hardcoded in source code
const API_KEYS = {
    DEEPGRAM_KEY: '2745a03e47aacaa64e5d48e4f4154ee1405c3e8f'
};

const DAILY_URL_BASE = 'https://cambridge.daily.co/';

// Multi-language support - EN, ES, RU
const LANGUAGE_STRINGS = {
    en: {
        tab_login: 'LOGIN',
        tab_create: 'CREATE ACCOUNT',
        label_password: 'PASSWORD',
        label_email: 'EMAIL',
        label_confirm_password: 'CONFIRM PASSWORD',
        label_room_name: 'ROOM NAME',
        room_name_warning: 'ROOM NAME CANNOT BE CHANGED LATER',
        label_room_password: 'ROOM PASSWORD',
        label_current_password: 'CURRENT PASSWORD',
        label_new_password: 'NEW PASSWORD',
        label_confirm_new_password: 'CONFIRM NEW PASSWORD',
        btn_enter: 'ENTER PRIVATE PORTAL',
        btn_create: 'CREATE ACCOUNT',
        btn_change_password: 'CHANGE PASSWORD',
        btn_cancel: 'CANCEL',
        btn_save: 'SAVE',
        btn_copy: 'COPY',
        btn_enter_call: 'ENTER VIDEO CALL',
        room_ready: 'YOUR ROOM IS READY',
        room_description: 'Share this link with your peer:',
        change_password_title: 'CHANGE PASSWORD',
        error_empty_email: 'ENTER EMAIL',
        error_empty_password: 'ENTER PASSWORD',
        error_invalid_credentials: 'INVALID CREDENTIALS - TRY AGAIN',
        error_invalid_email: 'INVALID EMAIL FORMAT',
        error_empty_room_password: 'ENTER ROOM PASSWORD',
        error_invalid_room_password: 'INCORRECT ROOM PASSWORD',
        error_empty_room_name: 'ENTER ROOM NAME',
        error_invalid_room_name: 'ROOM NAME MUST BE A-Z, 0-9, OR -',
        error_room_taken: 'ROOM NAME ALREADY TAKEN',
        error_empty_account_password: 'ENTER PASSWORD',
        error_empty_current_password: 'ENTER CURRENT PASSWORD',
        error_invalid_current_password: 'CURRENT PASSWORD IS INCORRECT',
        error_empty_new_password: 'ENTER NEW PASSWORD',
        error_new_passwords_mismatch: 'NEW PASSWORDS DO NOT MATCH',
        error_passwords_mismatch: 'PASSWORDS DO NOT MATCH',
        error_account_exists: 'ACCOUNT ALREADY EXISTS',
        error_creation_failed: 'ACCOUNT CREATION FAILED',
        error_password_change_failed: 'PASSWORD CHANGE FAILED',
        success_password_changed: 'PASSWORD CHANGED SUCCESSFULLY',
        copy_success: 'COPIED!',
        transcription: 'TRANSCRIPTION',
        clear: 'CLEAR'
    },
    es: {
        tab_login: 'INICIAR SESION',
        tab_create: 'CREAR CUENTA',
        label_password: 'CONTRASENA',
        label_email: 'CORREO ELECTRONICO',
        label_confirm_password: 'CONFIRMAR CONTRASENA',
        label_room_name: 'NOMBRE DE SALA',
        room_name_warning: 'EL NOMBRE NO SE PUEDE CAMBIAR DESPUES',
        label_room_password: 'CONTRASENA DE SALA',
        label_current_password: 'CONTRASENA ACTUAL',
        label_new_password: 'NUEVA CONTRASENA',
        label_confirm_new_password: 'CONFIRMAR NUEVA CONTRASENA',
        btn_enter: 'ENTRAR AL PORTAL PRIVADO',
        btn_create: 'CREAR CUENTA',
        btn_change_password: 'CAMBIAR CONTRASENA',
        btn_cancel: 'CANCELAR',
        btn_save: 'GUARDAR',
        btn_copy: 'COPIAR',
        btn_enter_call: 'ENTRAR A VIDEOLLAMADA',
        room_ready: 'TU SALA ESTA LISTA',
        room_description: 'Comparte este enlace con tu companero:',
        change_password_title: 'CAMBIAR CONTRASENA',
        error_empty_email: 'INGRESA CORREO ELECTRONICO',
        error_empty_password: 'INGRESA CONTRASENA',
        error_invalid_credentials: 'CREDENCIALES INVALIDAS - INTENTA DE NUEVO',
        error_invalid_email: 'FORMATO DE CORREO INVALIDO',
        error_empty_room_password: 'INGRESA CONTRASENA DE SALA',
        error_invalid_room_password: 'CONTRASENA DE SALA INCORRECTA',
        error_empty_room_name: 'INGRESA NOMBRE DE SALA',
        error_invalid_room_name: 'EL NOMBRE SOLO A-Z, 0-9 O -',
        error_room_taken: 'NOMBRE DE SALA YA USADO',
        error_empty_account_password: 'INGRESA CONTRASENA',
        error_empty_current_password: 'INGRESA CONTRASENA ACTUAL',
        error_invalid_current_password: 'LA CONTRASENA ACTUAL ES INCORRECTA',
        error_empty_new_password: 'INGRESA NUEVA CONTRASENA',
        error_new_passwords_mismatch: 'LAS NUEVAS CONTRASENAS NO COINCIDEN',
        error_passwords_mismatch: 'LAS CONTRASENAS NO COINCIDEN',
        error_account_exists: 'LA CUENTA YA EXISTE',
        error_creation_failed: 'ERROR AL CREAR CUENTA',
        error_password_change_failed: 'ERROR AL CAMBIAR CONTRASENA',
        success_password_changed: 'CONTRASENA CAMBIADA EXITOSAMENTE',
        copy_success: 'COPIADO!',
        transcription: 'TRANSCRIPCION',
        clear: 'LIMPIAR'
    },
    ru: {
        tab_login: 'ВХОД',
        tab_create: 'СОЗДАТЬ АККАУНТ',
        label_access_code: 'КОД ДОСТУПА',
        label_password: 'ПАРОЛЬ',
        label_email: 'ЭЛЕКТРОННАЯ ПОЧТА',
        label_confirm_password: 'ПОДТВЕРДИТЬ ПАРОЛЬ',
        label_room_name: 'НАЗВАНИЕ КОМНАТЫ',
        room_name_warning: 'НАЗВАНИЕ НЕЛЬЗЯ ИЗМЕНИТЬ ПОЗЖЕ',
        label_room_password: 'ПАРОЛЬ КОМНАТЫ',
        label_current_password: 'ТЕКУЩИЙ ПАРОЛЬ',
        label_new_password: 'НОВЫЙ ПАРОЛЬ',
        label_confirm_new_password: 'ПОДТВЕРДИТЬ НОВЫЙ ПАРОЛЬ',
        btn_enter: 'ВОЙТИ В ПРИВАТНЫЙ ПОРТАЛ',
        btn_create: 'СОЗДАТЬ АККАУНТ',
        btn_change_password: 'ИЗМЕНИТЬ ПАРОЛЬ',
        btn_cancel: 'ОТМЕНА',
        btn_save: 'СОХРАНИТЬ',
        btn_copy: 'КОПИРОВАТЬ',
        btn_enter_call: 'ВОЙТИ В ВИДЕОЗВОНОК',
        room_ready: 'ВАШ КАБИНЕТ ГОТОВ',
        room_description: 'Поделитесь этой ссылкой со своим партнером:',
        change_password_title: 'ИЗМЕНИТЬ ПАРОЛЬ',
        error_empty_email: 'ВВЕДИТЕ ЭЛЕКТРОННУЮ ПОЧТУ',
        error_invalid_credentials: 'НЕВЕРНЫЕ УЧЕТНЫЕ ДАННЫЕ - ПОВТОРИТЕ ПОПЫТКУ',
        error_invalid_email: 'НЕВЕРНЫЙ ФОРМАТ ЭЛЕКТРОННОЙ ПОЧТЫ',
        error_empty_room_password: 'ВВЕДИТЕ ПАРОЛЬ КОМНАТЫ',
        error_invalid_room_password: 'НЕВЕРНЫЙ ПАРОЛЬ КОМНАТЫ',
        error_empty_room_name: 'ВВЕДИТЕ НАЗВАНИЕ КОМНАТЫ',
        error_invalid_room_name: 'ТОЛЬКО A-Z, 0-9 ИЛИ -',
        error_room_taken: 'НАЗВАНИЕ КОМНАТЫ УЖЕ ЗАНЯТО',
        error_empty_account_password: 'ВВЕДИТЕ ПАРОЛЬ',
        error_empty_current_password: 'ВВЕДИТЕ ТЕКУЩИЙ ПАРОЛЬ',
        error_invalid_current_password: 'ТЕКУЩИЙ ПАРОЛЬ НЕВЕРНЫЙ',
        error_empty_new_password: 'ВВЕДИТЕ НОВЫЙ ПАРОЛЬ',
        error_new_passwords_mismatch: 'НОВЫЕ ПАРОЛИ НЕ СОВПАДАЮТ',
        error_passwords_mismatch: 'ПАРОЛИ НЕ СОВПАДАЮТ',
        error_account_exists: 'АККАУНТ УЖЕ СУЩЕСТВУЕТ',
        error_creation_failed: 'ОШИБКА ПРИ СОЗДАНИИ АККАУНТА',
        error_password_change_failed: 'ОШИБКА ПРИ ИЗМЕНЕНИИ ПАРОЛЯ',
        success_password_changed: 'ПАРОЛЬ УСПЕШНО ИЗМЕНЕН',
        copy_success: 'СКОПИРОВАНО!',
        transcription: 'ТРАНСКРИПЦИЯ',
        clear: 'ОЧИСТИТЬ'
    }
};

// Application state
let currentLanguage = 'en';
let currentUser = null;
let dailyCall = null;
let deepgramSocket = null;
let mediaRecorder = null;
let isTranscriptionActive = false;

// DOM Elements - Landing Page
const landingPage = document.getElementById('landing-page');
const loginForm = document.getElementById('login-form');
const createForm = document.getElementById('create-form');
const roomDisplay = document.getElementById('room-display');
const loginBtn = document.getElementById('login-btn');
const createBtn = document.getElementById('create-btn');
const enterBtn = document.getElementById('enter-btn');
const copyBtn = document.getElementById('copy-btn');
const roomUrlInput = document.getElementById('room-url');
const loginError = document.getElementById('login-error');
const createError = document.getElementById('create-error');
const roomPasswordError = document.getElementById('room-password-error');
const langBtns = document.querySelectorAll('.lang-btn');
const tabBtns = document.querySelectorAll('.tab-btn');

// DOM Elements - Password Change Modal
const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordModal = document.getElementById('change-password-modal');
const closePasswordModalBtn = document.getElementById('close-password-modal');
const changePasswordForm = document.getElementById('change-password-form');
const savePasswordBtn = document.getElementById('save-password-btn');
const cancelPasswordBtn = document.getElementById('cancel-password-btn');
const passwordChangeError = document.getElementById('password-change-error');

// DOM Elements - Video Call
const videoContainer = document.getElementById('video-container');
const sttToggle = document.getElementById('stt-toggle');
const transcriptFeed = document.getElementById('transcript-feed');
const transcriptContent = document.getElementById('transcript-content');
const clearTranscriptBtn = document.getElementById('clear-transcript');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSavedSession();
    initializeLanguageSystem();
    initializeLandingPage();
    initializeFormTabs();
});

// Load saved session from localStorage
function loadSavedSession() {
    const savedUser = localStorage.getItem('cambridge_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            currentLanguage = localStorage.getItem('cambridge_language') || 'en';
            showRoomDisplay();
        } catch (error) {
            console.error('Failed to load session:', error);
            localStorage.removeItem('cambridge_user');
        }
    }
}

// Language system initialization
function initializeLanguageSystem() {
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang);
        });
    });
    setLanguage(currentLanguage);
}

// Set language
function setLanguage(lang) {
    if (!LANGUAGE_STRINGS[lang]) return;
    
    currentLanguage = lang;
    localStorage.setItem('cambridge_language', lang);
    
    // Update active language button
    langBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    
    // Update all i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (LANGUAGE_STRINGS[lang][key]) {
            el.textContent = LANGUAGE_STRINGS[lang][key];
        }
    });
}

// Initialize form tabs
function initializeFormTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            showTab(tabName);
        });
    });
}

// Show form tab
function showTab(tabName) {
    // Clear all forms and errors when switching tabs
    clearErrors();
    document.getElementById('login-code').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('create-email').value = '';
    document.getElementById('room-name').value = '';
    document.getElementById('create-password').value = '';
    document.getElementById('confirm-password').value = '';
    const roomPasswordInput = document.getElementById('room-password');
    if (roomPasswordInput) roomPasswordInput.value = '';
    
    const forms = document.querySelectorAll('.form-section');
    forms.forEach(form => form.classList.remove('active'));
    
    if (tabName === 'login') {
        loginForm.classList.add('active');
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('tab-create').classList.remove('active');
    } else {
        createForm.classList.add('active');
        document.getElementById('tab-create').classList.add('active');
        document.getElementById('tab-login').classList.remove('active');
    }
}

// Initialize landing page
function initializeLandingPage() {
    loginBtn.addEventListener('click', handleLogin);
    createBtn.addEventListener('click', handleAccountCreation);
    enterBtn.addEventListener('click', enterVideoCall);
    copyBtn.addEventListener('click', copyRoomLink);
    
    // Password change modal listeners
    changePasswordBtn.addEventListener('click', openPasswordChangeModal);
    closePasswordModalBtn.addEventListener('click', closePasswordChangeModal);
    cancelPasswordBtn.addEventListener('click', closePasswordChangeModal);
    savePasswordBtn.addEventListener('click', handlePasswordChange);
    
    // Enter key to submit
    document.getElementById('login-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('create-email').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAccountCreation();
    });
    document.getElementById('room-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAccountCreation();
    });
    document.getElementById('confirm-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAccountCreation();
    });
    document.getElementById('room-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enterVideoCall();
    });
    
    // Password change form Enter key
    document.getElementById('current-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePasswordChange();
    });
    document.getElementById('new-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePasswordChange();
    });
    document.getElementById('confirm-new-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePasswordChange();
    });
}

// Handle login
function handleLogin() {
    clearErrors();
    const email = document.getElementById('login-code').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!email) {
        loginError.textContent = getTranslation('error_empty_email');
        return;
    }
    if (!password) {
        loginError.textContent = getTranslation('error_empty_password');
        return;
    }
    
    // Check against stored accounts in localStorage
    const accounts = JSON.parse(localStorage.getItem('cambridge_accounts') || '{}');
    
    if (accounts[email] && atob(accounts[email].password) === password) {
        // Clear form on successful login
        document.getElementById('login-code').value = '';
        document.getElementById('login-password').value = '';
        
        createSession(email, accounts[email].roomUrl, accounts[email].roomName);
        showRoomDisplay();
    } else {
        loginError.textContent = getTranslation('error_invalid_credentials');
        document.getElementById('login-password').value = '';
        document.getElementById('login-code').value = '';
    }
}

// Handle account creation
function handleAccountCreation() {
    clearErrors();
    const email = document.getElementById('create-email').value.trim();
    const roomNameInput = document.getElementById('room-name').value.trim();
    const password = document.getElementById('create-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    
    if (!email) {
        createError.textContent = getTranslation('error_empty_email');
        return;
    }
    if (!email.includes('@')) {
        createError.textContent = getTranslation('error_invalid_email');
        return;
    }
    if (!roomNameInput) {
        createError.textContent = getTranslation('error_empty_room_name');
        return;
    }
    const roomName = roomNameInput.toLowerCase();
    if (!/^[a-z0-9-]+$/.test(roomName)) {
        createError.textContent = getTranslation('error_invalid_room_name');
        return;
    }
    if (!password) {
        createError.textContent = getTranslation('error_empty_account_password');
        return;
    }
    if (password !== confirmPassword) {
        createError.textContent = getTranslation('error_passwords_mismatch');
        return;
    }
    
    // Check if account already exists (localStorage check for MVP)
    const accounts = JSON.parse(localStorage.getItem('cambridge_accounts') || '{}');
    if (accounts[email]) {
        createError.textContent = getTranslation('error_account_exists');
        return;
    }

    const roomUrl = `${DAILY_URL_BASE}${roomName}`;
    const roomTaken = Object.values(accounts).some((account) => {
        return account.roomUrl === roomUrl || account.roomName === roomName;
    });
    if (roomTaken) {
        createError.textContent = getTranslation('error_room_taken');
        return;
    }
    
    // Create account
    accounts[email] = {
        email: email,
        password: btoa(password),
        roomName: roomName,
        roomUrl: roomUrl,
        created: new Date().toISOString()
    };
    localStorage.setItem('cambridge_accounts', JSON.stringify(accounts));
    
    // Clear form fields
    document.getElementById('create-email').value = '';
    document.getElementById('room-name').value = '';
    document.getElementById('create-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    // Auto-login after creation
    createSession(email, roomUrl, roomName);
    showRoomDisplay();
}

// Create user session
function createSession(identifier, roomUrl, roomName) {
    currentUser = {
        identifier: identifier,
        roomName: roomName,
        roomUrl: roomUrl,
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('cambridge_user', JSON.stringify(currentUser));
}

// Show room display
function showRoomDisplay() {
    if (!currentUser) return;
    
    loginForm.classList.remove('active');
    createForm.classList.remove('active');
    roomDisplay.classList.remove('hidden');
    
    roomUrlInput.value = currentUser.roomUrl;
    
    copyBtn.style.display = 'inline-block';
}

// Copy room link
function copyRoomLink() {
    roomUrlInput.select();
    document.execCommand('copy');
    
    const originalText = copyBtn.textContent;
    copyBtn.textContent = getTranslation('copy_success');
    copyBtn.style.opacity = '0.7';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.opacity = '1';
    }, 2000);
}

// Open password change modal
function openPasswordChangeModal() {
    passwordChangeError.textContent = '';
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
    
    changePasswordModal.classList.remove('hidden');
    changePasswordModal.classList.add('active');
}

// Close password change modal
function closePasswordChangeModal() {
    changePasswordModal.classList.remove('active');
    changePasswordModal.classList.add('hidden');
    passwordChangeError.textContent = '';
}

// Handle password change
function handlePasswordChange() {
    passwordChangeError.textContent = '';
    
    const currentPassword = document.getElementById('current-password').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();
    const confirmNewPassword = document.getElementById('confirm-new-password').value.trim();
    
    if (!currentPassword) {
        passwordChangeError.textContent = getTranslation('error_empty_current_password');
        return;
    }
    
    if (!newPassword) {
        passwordChangeError.textContent = getTranslation('error_empty_new_password');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        passwordChangeError.textContent = getTranslation('error_new_passwords_mismatch');
        return;
    }
    
    // Verify current password
    if (!currentUser || !currentUser.identifier) {
        passwordChangeError.textContent = getTranslation('error_password_change_failed');
        return;
    }
    
    const accounts = JSON.parse(localStorage.getItem('cambridge_accounts') || '{}');
    
    // Check if account exists
    if (!accounts[currentUser.identifier]) {
        passwordChangeError.textContent = getTranslation('error_password_change_failed');
        return;
    }
    
    // Verify current password matches
    if (atob(accounts[currentUser.identifier].password) !== currentPassword) {
        passwordChangeError.textContent = getTranslation('error_invalid_current_password');
        return;
    }
    
    // Update password
    accounts[currentUser.identifier].password = btoa(newPassword);
    localStorage.setItem('cambridge_accounts', JSON.stringify(accounts));
    
    // Close modal and show success message
    closePasswordChangeModal();
    
    // Show brief success notification
    const originalText = changePasswordBtn.textContent;
    changePasswordBtn.textContent = getTranslation('success_password_changed');
    changePasswordBtn.style.opacity = '0.7';
    changePasswordBtn.style.color = 'var(--accent)';
    
    setTimeout(() => {
        changePasswordBtn.textContent = originalText;
        changePasswordBtn.style.opacity = '1';
        changePasswordBtn.style.color = 'var(--text)';
    }, 2500);
}

// Enter video call
async function enterVideoCall() {
    if (!currentUser) return;

    const roomPasswordInput = document.getElementById('room-password');
    const roomPassword = roomPasswordInput.value.trim();
    roomPasswordError.textContent = '';

    if (!roomPassword) {
        roomPasswordError.textContent = getTranslation('error_empty_room_password');
        return;
    }

    const roomName = currentUser.roomName || getRoomNameFromUrl(currentUser.roomUrl);
    const token = await fetchRoomToken(roomName, roomPassword);

    if (!token) {
        roomPasswordError.textContent = getTranslation('error_invalid_room_password');
        return;
    }

    landingPage.classList.remove('active');
    landingPage.classList.add('hidden');

    videoContainer.classList.remove('hidden');

    roomPasswordInput.value = '';

    startCall(token);
}

// Get translation
function getTranslation(key) {
    return LANGUAGE_STRINGS[currentLanguage][key] || key;
}

// Clear form errors
function clearErrors() {
    loginError.textContent = '';
    createError.textContent = '';
}

function getRoomNameFromUrl(roomUrl) {
    try {
        const url = new URL(roomUrl);
        return url.pathname.replace('/', '').trim();
    } catch (error) {
        return '';
    }
}

async function fetchRoomToken(roomName, password) {
    if (!roomName || !password) return null;

    try {
        const response = await fetch('/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomName, password })
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data && data.token ? data.token : null;
    } catch (error) {
        return null;
    }
}

// ============================================================
// VIDEO CALL & TRANSCRIPTION SECTION
// ============================================================

// Start Daily.co call with iframe
async function startCall(token) {
    if (!currentUser || !currentUser.roomUrl) {
        console.error('No valid room URL');
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

    const joinOptions = token ? { url: currentUser.roomUrl, token } : { url: currentUser.roomUrl };

    // Join the room
    dailyCall.join(joinOptions)
        .then(() => {
            // Show STT controls if Deepgram key is configured
            if (API_KEYS.DEEPGRAM_KEY) {
                sttToggle.classList.remove('hidden');
                initializeSTTControls();
                updateTranscriptLanguage();
            }
        })
        .catch(error => {
            console.error('Failed to join room:', error);
        });
}

// Initialize Speech-to-Text controls
function initializeSTTControls() {
    sttToggle.addEventListener('click', toggleTranscription);
    clearTranscriptBtn.addEventListener('click', clearTranscript);
    makeDraggable(transcriptFeed);
}

// Update transcript language label based on current language
function updateTranscriptLanguage() {
    const transcriptHeader = document.querySelector('.transcript-header span');
    if (transcriptHeader) {
        transcriptHeader.textContent = getTranslation('transcription');
    }
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
    if (!API_KEYS.DEEPGRAM_KEY) {
        console.error('Deepgram API key not configured');
        return;
    }

    try {
        // Get audio stream from user's microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Get language code for Deepgram (EN for English, ES for Spanish, RU for Russian)
        const languageCode = currentLanguage === 'es' ? 'es' : (currentLanguage === 'ru' ? 'ru' : 'en');
        
        // Connect to Deepgram WebSocket with language support
        const wsUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&language=${languageCode}`;
        deepgramSocket = new WebSocket(wsUrl, ['token', API_KEYS.DEEPGRAM_KEY]);

        deepgramSocket.onopen = () => {
            console.log('Deepgram connection opened');
            isTranscriptionActive = true;
            sttToggle.classList.add('active');
            transcriptFeed.classList.remove('hidden');
            updateTranscriptLanguage();

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
