// CamBridge App
// Minimal authentication and room management

// Debug utilities
const DEBUG = {
    setAuth: (value) => {
        document.getElementById('debug-auth').textContent = value;
    },
    setUserId: (value) => {
        document.getElementById('debug-user-id').textContent = value || '-';
    },
    setStatus: (value) => {
        document.getElementById('debug-status').textContent = value;
    },
    setError: (value) => {
        document.getElementById('debug-error').textContent = value || '-';
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

        const data = await response.json();
        DEBUG.setStatus(response.status);

        if (!response.ok) {
            DEBUG.setError(data.error || 'Unknown error');
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
    // Clear cookie by calling logout endpoint (if exists) or just reload
    currentUser = null;
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
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
    const email = form.email.value;
    const password = form.password.value;
    const errorEl = document.getElementById('register-error');

    const result = await register(email, password);
    
    if (result.ok) {
        errorEl.textContent = '';
        form.reset();
        // Auto-login after successful registration
        const loginResult = await login(email, password);
        if (loginResult.ok) {
            currentUser = loginResult.data.user;
            showDashboard();
        }
    } else {
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
}

// Make handleApprove global
window.handleApprove = handleApprove;

// Start app
init();
