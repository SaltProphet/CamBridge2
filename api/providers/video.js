// Phase 0: Video Provider Abstraction
// Allows swapping video providers (Daily.co, Twilio, Agora, etc.) via configuration

/**
 * VideoProvider Interface
 * All video providers must implement these methods
 */
export class VideoProvider {
  /**
   * Create a video room
   * @param {string} roomName - Unique room identifier
   * @param {Object} options - Provider-specific options
   * @returns {Promise<{success: boolean, roomUrl?: string, error?: string}>}
   */
  async createRoom(roomName, options = {}) {
    throw new Error('createRoom() must be implemented by provider');
  }

  /**
   * Mint a meeting token for room access
   * @param {string} roomName - Room identifier
   * @param {string} userName - User display name
   * @param {number} ttlMinutes - Token expiration in minutes
   * @returns {Promise<{success: boolean, token?: string, expiresAt?: Date, error?: string}>}
   */
  async mintToken(roomName, userName, ttlMinutes = 15) {
    throw new Error('mintToken() must be implemented by provider');
  }

  /**
   * Delete a video room
   * @param {string} roomName - Room identifier
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteRoom(roomName) {
    throw new Error('deleteRoom() must be implemented by provider');
  }

  /**
   * Get room info
   * @param {string} roomName - Room identifier
   * @returns {Promise<{success: boolean, room?: Object, error?: string}>}
   */
  async getRoomInfo(roomName) {
    throw new Error('getRoomInfo() must be implemented by provider');
  }
}

/**
 * Daily.co Video Provider Implementation
 */
export class DailyVideoProvider extends VideoProvider {
  constructor(apiKey, domain = 'cambridge') {
    super();
    this.apiKey = apiKey;
    this.domain = domain;
    this.baseUrl = 'https://api.daily.co/v1';
  }

  async createRoom(roomName, options = {}) {
    if (!this.apiKey) {
      return { success: false, error: 'DAILY_API_KEY not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          name: roomName,
          privacy: options.privacy || 'private',
          properties: {
            enable_screenshare: options.enableScreenshare !== false,
            enable_chat: options.enableChat !== false,
            enable_knocking: options.enableKnocking !== false,
            max_participants: options.maxParticipants || 10,
            ...options.properties
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Daily API error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      return { 
        success: true, 
        roomUrl: data.url,
        roomData: data 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async mintToken(roomName, userName, ttlMinutes = 15) {
    if (!this.apiKey) {
      return { success: false, error: 'DAILY_API_KEY not configured' };
    }

    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      const response = await fetch(`${this.baseUrl}/meeting-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            user_name: userName,
            exp: Math.floor(expiresAt.getTime() / 1000)
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Daily API error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      return { 
        success: true, 
        token: data.token,
        expiresAt 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteRoom(roomName) {
    if (!this.apiKey) {
      return { success: false, error: 'DAILY_API_KEY not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        return { success: false, error: `Daily API error: ${response.status} - ${error}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getRoomInfo(roomName) {
    if (!this.apiKey) {
      return { success: false, error: 'DAILY_API_KEY not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Room not found' };
        }
        const error = await response.text();
        return { success: false, error: `Daily API error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      return { success: true, room: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Factory function to get the configured video provider
 */
export function getVideoProvider() {
  const provider = process.env.VIDEO_PROVIDER || 'daily';
  const apiKey = process.env.DAILY_API_KEY;
  const domain = process.env.DAILY_DOMAIN || 'cambridge';

  switch (provider.toLowerCase()) {
    case 'daily':
      return new DailyVideoProvider(apiKey, domain);
    // Add more providers here as needed:
    // case 'twilio':
    //   return new TwilioVideoProvider(process.env.TWILIO_API_KEY);
    // case 'agora':
    //   return new AgoraVideoProvider(process.env.AGORA_APP_ID);
    default:
      console.warn(`Unknown VIDEO_PROVIDER: ${provider}, defaulting to Daily.co`);
      return new DailyVideoProvider(apiKey, domain);
  }
}
