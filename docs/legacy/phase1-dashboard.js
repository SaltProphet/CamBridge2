// Phase 1: Dashboard Extensions for Join Requests and Ban Management
// Adds creator-specific functionality to the dashboard

class Phase1Dashboard {
  constructor() {
    this.authToken = this.getAuthToken();
    this.isCreator = false;
    this.creatorId = null;
    this.pollInterval = null;
  }

  // Get auth token from localStorage or cookie
  getAuthToken() {
    // First try to get from cookie (Phase 1 auth)
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token') {
        return value;
      }
    }
    // Fallback to localStorage for existing auth
    return localStorage.getItem('auth_token');
  }

  // Check if user is a creator
  async checkCreatorStatus() {
    if (!this.authToken) return false;

    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        this.isCreator = user.role === 'creator';
        
        if (this.isCreator) {
          // Get creator info
          const creatorResponse = await fetch('/api/creator/info', {
            headers: {
              'Authorization': `Bearer ${this.authToken}`
            }
          });
          
          if (creatorResponse.ok) {
            const creator = await creatorResponse.json();
            this.creatorId = creator.id;
          }
        }
        
        return this.isCreator;
      }
      return false;
    } catch (error) {
      console.error('Creator status check failed:', error);
      return false;
    }
  }

  // Load join requests
  async loadJoinRequests() {
    if (!this.isCreator || !this.authToken) return;

    try {
      const response = await fetch('/api/join-requests/pending', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        const requests = await response.json();
        this.renderJoinRequests(requests);
      } else {
        console.error('Failed to load join requests:', response.statusText);
      }
    } catch (error) {
      console.error('Join requests load error:', error);
    }
  }

  // Render join requests
  renderJoinRequests(requests) {
    const container = document.getElementById('join-requests-list');
    
    if (!requests || requests.length === 0) {
      container.innerHTML = '<p style="color: var(--text); text-align: center; padding: 2rem;">No pending requests</p>';
      return;
    }

    container.innerHTML = requests.map(request => `
      <div class="request-item" data-request-id="${this.escapeHTML(request.id)}" style="
        background: rgba(212, 175, 55, 0.05);
        border: 1px solid rgba(212, 175, 55, 0.2);
        padding: 1rem;
        margin-bottom: 1rem;
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <div>
            <strong style="color: var(--text-light);">${this.escapeHTML(request.username || request.email)}</strong>
            ${request.display_name ? `<br><span style="color: var(--text); font-size: 0.9rem;">${this.escapeHTML(request.display_name)}</span>` : ''}
          </div>
          <span style="color: var(--text); font-size: 0.8rem;">${this.formatTime(request.created_at)}</span>
        </div>
        ${request.room_name ? `
          <div style="color: var(--text); font-size: 0.9rem; margin-bottom: 0.5rem;">
            <i class="fas fa-door-open"></i> ${this.escapeHTML(request.room_name)}
          </div>
        ` : ''}
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button class="btn btn-primary approve-request-btn" style="flex: 1; padding: 0.5rem;">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="btn btn-secondary deny-request-btn" style="flex: 1; padding: 0.5rem;">
            <i class="fas fa-times"></i> Deny
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners using event delegation
    container.querySelectorAll('.approve-request-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => this.approveRequest(requests[index].id));
    });
    
    container.querySelectorAll('.deny-request-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => this.denyRequest(requests[index].id));
    });
  }

  // Approve join request
  async approveRequest(requestId) {
    if (!confirm('Approve this join request?')) return;

    try {
      const response = await fetch('/api/join-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ requestId })
      });

      if (response.ok) {
        alert('Request approved! User can now join.');
        await this.loadJoinRequests();
      } else {
        const error = await response.json();
        alert(`Failed to approve: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert('An error occurred while approving the request.');
    }
  }

  // Deny join request
  async denyRequest(requestId) {
    const reason = prompt('Enter reason for denial (optional):');
    if (reason === null) return; // User cancelled

    try {
      const response = await fetch('/api/join-deny', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ requestId, reason })
      });

      if (response.ok) {
        alert('Request denied.');
        await this.loadJoinRequests();
      } else {
        const error = await response.json();
        alert(`Failed to deny: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Deny error:', error);
      alert('An error occurred while denying the request.');
    }
  }

  // Load bans
  async loadBans() {
    if (!this.isCreator || !this.authToken) return;

    try {
      const response = await fetch('/api/creator/bans', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        const bans = await response.json();
        this.renderBans(bans);
      } else {
        console.error('Failed to load bans:', response.statusText);
      }
    } catch (error) {
      console.error('Bans load error:', error);
    }
  }

  // Render bans
  renderBans(bans) {
    const container = document.getElementById('bans-list');
    
    if (!bans || bans.length === 0) {
      container.innerHTML = '<p style="color: var(--text); text-align: center; padding: 2rem;">No banned users</p>';
      return;
    }

    container.innerHTML = bans.map(ban => `
      <div class="ban-item" data-ban-id="${this.escapeHTML(ban.id)}" style="
        background: rgba(255, 68, 68, 0.05);
        border: 1px solid rgba(255, 68, 68, 0.2);
        padding: 1rem;
        margin-bottom: 1rem;
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <div>
            <strong style="color: var(--text-light);">${this.escapeHTML(ban.username || ban.email || 'Unknown User')}</strong>
            ${ban.user_email ? `<br><span style="color: var(--text); font-size: 0.9rem;">${this.escapeHTML(ban.user_email)}</span>` : ''}
          </div>
          <span style="color: var(--text); font-size: 0.8rem;">${this.formatTime(ban.created_at)}</span>
        </div>
        ${ban.reason ? `
          <div style="color: var(--text); font-size: 0.9rem; margin-bottom: 0.5rem; font-style: italic;">
            <i class="fas fa-info-circle"></i> ${this.escapeHTML(ban.reason)}
          </div>
        ` : ''}
        <div style="margin-top: 1rem;">
          <button class="btn btn-secondary unban-user-btn" style="padding: 0.5rem 1rem;">
            <i class="fas fa-undo"></i> Unban
          </button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners using event delegation
    container.querySelectorAll('.unban-user-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => this.unbanUser(bans[index].id));
    });
  }

  // Unban user
  async unbanUser(banId) {
    if (!confirm('Remove this ban?')) return;

    try {
      const response = await fetch('/api/creator/unban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ banId })
      });

      if (response.ok) {
        alert('User unbanned successfully.');
        await this.loadBans();
      } else {
        const error = await response.json();
        alert(`Failed to unban: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Unban error:', error);
      alert('An error occurred while unbanning the user.');
    }
  }

  // Format timestamp
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  // Escape HTML to prevent XSS
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Start polling for new requests
  startPolling() {
    if (!this.isCreator) return;

    // Poll every 10 seconds
    this.pollInterval = setInterval(() => {
      this.loadJoinRequests();
    }, 10000);
  }

  // Stop polling
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Initialize Phase 1 dashboard features
  async init() {
    // Check if user is a creator
    const isCreator = await this.checkCreatorStatus();
    
    if (isCreator) {
      // Show Phase 1 cards
      const joinRequestsCard = document.getElementById('join-requests-card');
      const banManagementCard = document.getElementById('ban-management-card');
      
      if (joinRequestsCard) joinRequestsCard.style.display = 'block';
      if (banManagementCard) banManagementCard.style.display = 'block';

      // Load initial data
      await this.loadJoinRequests();
      await this.loadBans();

      // Start polling for new requests
      this.startPolling();

      // Set up refresh buttons
      const refreshRequestsBtn = document.getElementById('refresh-requests-btn');
      const refreshBansBtn = document.getElementById('refresh-bans-btn');

      if (refreshRequestsBtn) {
        refreshRequestsBtn.addEventListener('click', () => this.loadJoinRequests());
      }

      if (refreshBansBtn) {
        refreshBansBtn.addEventListener('click', () => this.loadBans());
      }
    }
  }
}

// Initialize when dashboard is loaded
let phase1Dashboard = null;

// Wait for dashboard to be shown (after login)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    const dashboard = document.getElementById('dashboard');
    if (dashboard && dashboard.classList.contains('active') && !phase1Dashboard) {
      phase1Dashboard = new Phase1Dashboard();
      phase1Dashboard.init();
    }
  });
});

// Start observing
const dashboardElement = document.getElementById('dashboard');
if (dashboardElement) {
  observer.observe(dashboardElement, {
    attributes: true,
    attributeFilter: ['class']
  });
  
  // Also check if already active
  if (dashboardElement.classList.contains('active')) {
    phase1Dashboard = new Phase1Dashboard();
    phase1Dashboard.init();
  }
}
