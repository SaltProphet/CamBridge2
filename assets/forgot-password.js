// Forgot password page logic

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

// Handle forgot password
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const email = form.email.value;
    
    const errorEl = document.getElementById('error-message');
    const successEl = document.getElementById('success-message');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    errorEl.textContent = '';
    successEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    try {
        const result = await apiCall('/api/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        
        if (!result.ok) {
            throw new Error(result.error);
        }
        
        successEl.textContent = 'If an account exists with this email, you will receive password reset instructions shortly.';
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
        
    } catch (error) {
        errorEl.textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
    }
});
