// Login page logic

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

// Handle login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    
    const errorEl = document.getElementById('error-message');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    
    try {
        const result = await apiCall('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        
        if (!result.ok) {
            throw new Error(result.error);
        }
        
        // Check if user has rooms
        if (result.data.rooms && result.data.rooms.length > 0) {
            // Go to their first room
            window.location.href = `/room/${result.data.rooms[0].slug}`;
        } else {
            // No room, go to app to create one
            window.location.href = '/app.html';
        }
        
    } catch (error) {
        errorEl.textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});
