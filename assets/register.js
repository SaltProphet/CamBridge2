// Register page logic

// API call helper
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
        });

        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { error: `Server error: ${response.statusText}` };
        }

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return { ok: true, data };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

// Handle registration
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const roomSlug = form.roomSlug.value.toLowerCase().trim();
    const email = form.email.value;
    const password = form.password.value;
    const ageVerified = form.age_verified.checked;
    const tosAccepted = form.tos_accepted.checked;
    
    const errorEl = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    errorEl.textContent = '';
    successEl.textContent = '';
    
    if (!ageVerified) {
        errorEl.textContent = 'You must be 18 or older to register';
        return;
    }
    
    if (!tosAccepted) {
        errorEl.textContent = 'You must accept the Terms of Service';
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    
    try {
        // Step 1: Register
        const registerResult = await apiCall('/api/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        
        if (!registerResult.ok) {
            throw new Error(registerResult.error);
        }
        
        // Step 2: Login
        const loginResult = await apiCall('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        
        if (!loginResult.ok) {
            throw new Error('Account created but login failed. Please try logging in.');
        }
        
        // Step 3: Create room
        const roomResult = await apiCall('/api/create-room', {
            method: 'POST',
            body: JSON.stringify({ slug: roomSlug }),
        });
        
        if (!roomResult.ok) {
            throw new Error('Account created but room creation failed: ' + roomResult.error);
        }
        
        // Success! Redirect to room
        successEl.textContent = 'Success! Taking you to your room...';
        setTimeout(() => {
            window.location.href = `/room/${roomSlug}`;
        }, 500);
        
    } catch (error) {
        errorEl.textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account & Room';
    }
});

// ToS modal handlers
document.getElementById('tos-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('tos-modal').classList.remove('hidden');
});

document.getElementById('tos-close').addEventListener('click', () => {
    document.getElementById('tos-modal').classList.add('hidden');
});

document.getElementById('tos-accept').addEventListener('click', () => {
    document.getElementById('tos-modal').classList.add('hidden');
});
