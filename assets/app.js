// CamBridge App
// Minimal authentication and room management

// Debug utilities (optional - elements may not exist in production)
const DEBUG = {
    setAuth: (value) => {
        const el = document.getElementById('debug-auth');
        if (el) el.textContent = value;
    },
    setUserId: (value) => {
        const el = document.getElementById('debug-user-id');
        if (el) el.textContent = value || '-';
    },
    setStatus: (value) => {
        const el = document.getElementById('debug-status');
        if (el) el.textContent = value;
    },
    setError: (value) => {
        const el = document.getElementById('debug-error');
        if (el) el.textContent = value || '-';
    }
};

// State
let currentUser = null;
let rooms = [];
let joinRequests = [];

// API Utilities
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include', // Include cookies
        });

        DEBUG.setStatus(response.status);

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Not JSON, likely an error page
            const text = await response.text();
            data = { error: `Server error: ${response.statusText || 'Unknown error'}` };
        }

        if (!response.ok) {
            DEBUG.setError(data.error || 'Request failed');
            throw new Error(data.error || 'Request failed');
        }

        DEBUG.setError('-');
        return { ok: true, data, status: response.status };
    } catch (error) {
        DEBUG.setError(error.message);
        return { ok: false, error: error.message };
    }
}

// Authentication Functions
async function register(email, password) {
    return apiCall('/api/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

async function login(email, password) {
    return apiCall('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

async function checkAuth() {
    return apiCall('/api/me');
}

async function logout() {
    // Clear cookie by calling logout endpoint
    currentUser = null;
    try {
        await apiCall('/api/logout', {
            method: 'POST',
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    showAuthView();
}

// Room Functions
async function createRoom(slug) {
    return apiCall('/api/create-room', {
        method: 'POST',
        body: JSON.stringify({ slug }),
    });
}

async function loadRooms() {
    // Get rooms from user data or separate endpoint
    // For now, we'll store in user object
    return { ok: true, data: { rooms: rooms } };
}

async function loadJoinRequests() {
    // Load pending join requests
    const result = await apiCall('/api/join-status?status=pending');
    if (result.ok && result.data.requests) {
        joinRequests = result.data.requests;
    }
    return result;
}

async function approveRequest(requestId) {
    return apiCall('/api/approve', {
        method: 'POST',
        body: JSON.stringify({ requestId }),
    });
}

// UI Functions
function showAuthView() {
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    DEBUG.setAuth('false');
    DEBUG.setUserId('-');
}

function showDashboard() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    DEBUG.setAuth('true');
    DEBUG.setUserId(currentUser?.id || currentUser?.email);
    loadDashboard();
}

async function loadDashboard() {
    // Load rooms
    const roomsResult = await loadRooms();
    renderRooms();
    
    // Load join requests
    const requestsResult = await loadJoinRequests();
    renderJoinRequests();
}

function renderRooms() {
    const container = document.getElementById('rooms-list');
    
    if (!rooms || rooms.length === 0) {
        container.innerHTML = '<p class="empty">No rooms yet</p>';
        return;
    }

    container.innerHTML = rooms.map(room => `
        <div class="list-item">
            <div class="list-item-content">
                <strong style="color: var(--text-light)">${room.slug}</strong>
                <p style="font-size: 0.875rem; color: var(--text)">Created: ${new Date(room.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function renderJoinRequests() {
    const container = document.getElementById('requests-list');
    
    if (!joinRequests || joinRequests.length === 0) {
        container.innerHTML = '<p class="empty">No pending requests</p>';
        return;
    }

    container.innerHTML = joinRequests.map(request => `
        <div class="list-item" data-request-id="${request.id}">
            <div class="list-item-content">
                <strong style="color: var(--text-light)">${request.requester_email}</strong>
                <p style="font-size: 0.875rem; color: var(--text)">Room: ${request.room_slug || 'N/A'}</p>
            </div>
            <div class="list-item-actions">
                <button onclick="handleApprove('${request.id}')">Approve</button>
            </div>
        </div>
    `).join('');
}

// Event Handlers
async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const roomSlug = form.roomSlug.value.toLowerCase().trim();
    const email = form.email.value;
    const password = form.password.value;
    const ageVerified = form.age_verified.checked;
    const tosAccepted = form.tos_accepted.checked;
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');

    // Clear previous messages
    errorEl.textContent = '';
    successEl.textContent = '';

    // Validate age and ToS
    if (!ageVerified) {
        errorEl.textContent = 'You must be 18 or older to register';
        return;
    }

    if (!tosAccepted) {
        errorEl.textContent = 'You must accept the Terms of Service';
        return;
    }

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating your account and room...';

    const result = await register(email, password);
    
    if (result.ok) {
        // Now create the room
        const loginResult = await login(email, password);
        if (loginResult.ok) {
            currentUser = loginResult.data.user;
            
            // Create room with the chosen slug
            const roomResult = await createRoom(roomSlug);
            
            if (roomResult.ok) {
                rooms.push(roomResult.data.room);
                successEl.textContent = `Success! Your room "${roomSlug}" is ready.`;
                
                // Wait a moment then show dashboard
                setTimeout(() => {
                    showDashboard();
                }, 1500);
            } else {
                errorEl.textContent = 'Account created but room creation failed: ' + roomResult.error;
                setTimeout(() => {
                    showDashboard();
                }, 2000);
            }
        }
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        errorEl.textContent = result.error;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const errorEl = document.getElementById('login-error');

    const result = await login(email, password);
    
    if (result.ok) {
        errorEl.textContent = '';
        currentUser = result.data.user;
        form.reset();
        showDashboard();
    } else {
        errorEl.textContent = result.error;
    }
}

async function handleCreateRoom(e) {
    e.preventDefault();
    const form = e.target;
    const slug = form.slug.value.toLowerCase().trim();
    const errorEl = document.getElementById('create-room-error');

    const result = await createRoom(slug);
    
    if (result.ok) {
        errorEl.textContent = '';
        form.reset();
        // Add to rooms list
        rooms.push(result.data.room);
        renderRooms();
    } else {
        errorEl.textContent = result.error;
    }
}

async function handleApprove(requestId) {
    const result = await approveRequest(requestId);
    
    if (result.ok) {
        // Remove from list
        joinRequests = joinRequests.filter(r => r.id !== requestId);
        renderJoinRequests();
    } else {
        alert('Failed to approve request: ' + result.error);
    }
}

// ToS Modal Handlers
function showTosModal() {
    document.getElementById('tos-modal').classList.remove('hidden');
}

function hideTosModal() {
    document.getElementById('tos-modal').classList.add('hidden');
}

// Initialize
async function init() {
    // Check if already authenticated
    const authResult = await checkAuth();
    
    if (authResult.ok && authResult.data.user) {
        currentUser = authResult.data.user;
        // Load user's rooms if provided
        if (authResult.data.rooms) {
            rooms = authResult.data.rooms;
        }
        showDashboard();
    } else {
        showAuthView();
    }

    // Setup event listeners
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('create-room-form').addEventListener('submit', handleCreateRoom);
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // ToS modal event listeners
    document.getElementById('tos-link').addEventListener('click', (e) => {
        e.preventDefault();
        showTosModal();
    });
    document.getElementById('tos-close').addEventListener('click', hideTosModal);
    document.getElementById('tos-accept').addEventListener('click', hideTosModal);
}

// Make handleApprove global
window.handleApprove = handleApprove;

// Start app
init();
