// Phase 1: Authentication and Access Control
// Handles age gate, ToS, email login, and join request flow

class Phase1Auth {
  constructor() {
    this.authToken = this.getAuthCookie();
    this.user = null;
    this.ageAttested = false;
    this.tosAccepted = false;
    this.joinRequestId = null;
    this.joinStatusInterval = null;
  }

  // Get auth token from cookie
  getAuthCookie() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token') {
        return value;
      }
    }
    return null;
  }

  // Check if user is authenticated
  async checkAuth() {
    if (!this.authToken) {
      return false;
    }

    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        this.user = await response.json();
        this.ageAttested = !!this.user.age_attested_at;
        this.tosAccepted = !!this.user.tos_accepted_at;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  // Show modal
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  // Hide modal
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // Initialize age gate
  initAgeGate() {
    const checkbox = document.getElementById('age-checkbox');
    const confirmBtn = document.getElementById('age-confirm-btn');

    checkbox.addEventListener('change', () => {
      confirmBtn.disabled = !checkbox.checked;
    });

    confirmBtn.addEventListener('click', async () => {
      await this.submitAgeAttestation();
    });
  }

  // Submit age attestation
  async submitAgeAttestation() {
    try {
      const response = await fetch('/api/user/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          ageAttested: true,
          tosAccepted: this.tosAccepted // Keep existing ToS if already accepted
        })
      });

      if (response.ok) {
        this.ageAttested = true;
        this.hideModal('age-gate-modal');
        
        // Check if need to show ToS
        if (!this.tosAccepted) {
          this.showModal('tos-modal');
        } else {
          // Proceed to join request
          await this.initiateJoinRequest();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to record age attestation'}`);
      }
    } catch (error) {
      console.error('Age attestation error:', error);
      alert('An error occurred. Please try again.');
    }
  }

  // Initialize ToS modal
  initToSModal() {
    const checkbox = document.getElementById('tos-checkbox');
    const confirmBtn = document.getElementById('tos-confirm-btn');

    checkbox.addEventListener('change', () => {
      confirmBtn.disabled = !checkbox.checked;
    });

    confirmBtn.addEventListener('click', async () => {
      await this.submitToSAcceptance();
    });
  }

  // Submit ToS acceptance
  async submitToSAcceptance() {
    try {
      const response = await fetch('/api/user/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          ageAttested: this.ageAttested, // Keep existing age attestation
          tosAccepted: true
        })
      });

      if (response.ok) {
        this.tosAccepted = true;
        this.hideModal('tos-modal');
        
        // Proceed to join request
        await this.initiateJoinRequest();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to record ToS acceptance'}`);
      }
    } catch (error) {
      console.error('ToS acceptance error:', error);
      alert('An error occurred. Please try again.');
    }
  }

  // Initialize email login
  initEmailLogin() {
    const input = document.getElementById('email-input');
    const sendBtn = document.getElementById('email-send-btn');
    const errorDiv = document.getElementById('email-error');
    const sentMessage = document.getElementById('email-sent-message');

    sendBtn.addEventListener('click', async () => {
      const email = input.value.trim();
      
      if (!email) {
        errorDiv.textContent = 'Email is required';
        return;
      }

      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errorDiv.textContent = 'Invalid email format';
        return;
      }

      errorDiv.textContent = '';
      sendBtn.disabled = true;
      sendBtn.textContent = 'SENDING...';

      try {
        const returnTo = window.location.pathname;
        const response = await fetch('/api/auth/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, returnTo })
        });

        const data = await response.json();

        if (response.ok) {
          sentMessage.classList.remove('hidden');
          input.disabled = true;
          sendBtn.textContent = 'SENT';
        } else {
          errorDiv.textContent = data.error || 'Failed to send email';
          sendBtn.disabled = false;
          sendBtn.textContent = 'SEND MAGIC LINK';
        }
      } catch (error) {
        console.error('Email send error:', error);
        errorDiv.textContent = 'An error occurred. Please try again.';
        sendBtn.disabled = false;
        sendBtn.textContent = 'SEND MAGIC LINK';
      }
    });

    // Allow Enter key to submit
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendBtn.click();
      }
    });
  }

  // Initiate join request
  async initiateJoinRequest() {
    this.showModal('join-request-modal');
    
    const statusText = document.getElementById('join-status-text');
    const loading = document.getElementById('join-loading');
    const result = document.getElementById('join-result');
    
    statusText.textContent = 'Requesting access to room...';
    loading.style.display = 'block';
    result.classList.add('hidden');

    try {
      // Extract creator slug from URL (modelName in this case)
      const creatorSlug = modelName; // modelName from room.js context
      const roomSlugParam = roomSlug !== 'main' ? roomSlug : null;

      const response = await fetch('/api/join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          creatorSlug,
          roomSlug: roomSlugParam
        })
      });

      const data = await response.json();

      if (response.ok) {
        this.joinRequestId = data.requestId;
        
        // Start polling for status
        this.startPollingJoinStatus();
      } else {
        // Handle errors
        loading.style.display = 'none';
        result.classList.remove('hidden');
        
        const resultText = document.getElementById('join-result-text');
        const retryBtn = document.getElementById('join-retry-btn');
        
        if (data.requiresAcceptance) {
          resultText.textContent = 'Please accept age attestation and ToS first.';
          retryBtn.classList.remove('hidden');
          retryBtn.onclick = () => {
            this.hideModal('join-request-modal');
            this.startAuthFlow();
          };
        } else if (data.banned) {
          resultText.textContent = `You are banned: ${data.reason || 'No reason provided'}`;
          resultText.style.color = '#ff4444';
        } else {
          resultText.textContent = data.error || 'Failed to request access';
          retryBtn.classList.remove('hidden');
          retryBtn.onclick = () => {
            this.hideModal('join-request-modal');
            setTimeout(() => this.initiateJoinRequest(), 1000);
          };
        }
      }
    } catch (error) {
      console.error('Join request error:', error);
      loading.style.display = 'none';
      result.classList.remove('hidden');
      
      const resultText = document.getElementById('join-result-text');
      const retryBtn = document.getElementById('join-retry-btn');
      
      resultText.textContent = 'An error occurred. Please try again.';
      retryBtn.classList.remove('hidden');
      retryBtn.onclick = () => {
        this.hideModal('join-request-modal');
        setTimeout(() => this.initiateJoinRequest(), 1000);
      };
    }
  }

  // Poll join request status
  startPollingJoinStatus() {
    const statusText = document.getElementById('join-status-text');
    statusText.textContent = 'Waiting for creator approval...';

    // Poll every 3 seconds
    this.joinStatusInterval = setInterval(async () => {
      await this.checkJoinStatus();
    }, 3000);
  }

  // Check join request status
  async checkJoinStatus() {
    try {
      const response = await fetch(`/api/join-status?requestId=${this.joinRequestId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        if (data.status === 'approved' && data.dailyToken) {
          // Approved! Store token and proceed
          clearInterval(this.joinStatusInterval);
          
          const loading = document.getElementById('join-loading');
          const result = document.getElementById('join-result');
          const resultText = document.getElementById('join-result-text');
          const enterBtn = document.getElementById('join-enter-btn');
          
          loading.style.display = 'none';
          result.classList.remove('hidden');
          resultText.textContent = 'Access approved! You can now enter the room.';
          resultText.style.color = '#00ff88';
          enterBtn.classList.remove('hidden');
          
          // Store Daily token for room.js to use
          window.phase1DailyToken = data.dailyToken;
          window.phase1TokenExpires = data.tokenExpiresAt;
          
          enterBtn.onclick = () => {
            this.hideModal('join-request-modal');
            // Let room.js know it can proceed
            if (typeof window.phase1Approved === 'function') {
              window.phase1Approved();
            }
          };
        } else if (data.status === 'denied') {
          // Denied
          clearInterval(this.joinStatusInterval);
          
          const loading = document.getElementById('join-loading');
          const result = document.getElementById('join-result');
          const resultText = document.getElementById('join-result-text');
          
          loading.style.display = 'none';
          result.classList.remove('hidden');
          resultText.textContent = `Access denied: ${data.reason || 'No reason provided'}`;
          resultText.style.color = '#ff4444';
        }
        // If still pending, keep polling
      }
    } catch (error) {
      console.error('Join status check error:', error);
    }
  }

  // Start authentication flow
  async startAuthFlow() {
    // Check if already authenticated
    const isAuth = await this.checkAuth();
    
    if (!isAuth) {
      // Show email login
      this.showModal('email-login-modal');
      return;
    }

    // Check age attestation
    if (!this.ageAttested) {
      this.showModal('age-gate-modal');
      return;
    }

    // Check ToS acceptance
    if (!this.tosAccepted) {
      this.showModal('tos-modal');
      return;
    }

    // All checks passed, proceed to join request
    await this.initiateJoinRequest();
  }

  // Initialize all Phase 1 components
  init() {
    this.initAgeGate();
    this.initToSModal();
    this.initEmailLogin();

    // Override the original gatekeeper flow
    // Hide original gatekeeper and start Phase 1 flow
    const gatekeeper = document.getElementById('gatekeeper');
    if (gatekeeper) {
      gatekeeper.classList.remove('active');
      gatekeeper.classList.add('hidden');
    }

    // Start auth flow when page loads
    this.startAuthFlow();
  }
}

// Initialize Phase 1 when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.phase1Auth = new Phase1Auth();
  window.phase1Auth.init();
});
