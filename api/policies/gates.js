// Phase 0: Centralized Policy Gates
// All authentication and authorization checks go through these gates

import { getUserById, getCreatorById, checkBan } from '../db.js';
import crypto from 'crypto';

/**
 * Kill Switch Configuration
 * Controls what operations are allowed platform-wide
 */
class KillSwitch {
  constructor() {
    // Load from environment variables
    this.allowNewSignups = process.env.KILL_SWITCH_SIGNUPS !== 'false';
    this.allowNewRooms = process.env.KILL_SWITCH_NEW_ROOMS !== 'false';
    this.allowJoinApprovals = process.env.KILL_SWITCH_JOIN_APPROVALS !== 'false';
    this.allowNewCreators = process.env.KILL_SWITCH_NEW_CREATORS !== 'false';
    // BETA_MODE: Enable self-serve creator signup without subscription enforcement
    this.betaMode = process.env.BETA_MODE === 'true';
  }

  isSignupsEnabled() {
    return this.allowNewSignups;
  }

  isNewRoomsEnabled() {
    return this.allowNewRooms;
  }

  isJoinApprovalsEnabled() {
    return this.allowJoinApprovals;
  }

  isNewCreatorsEnabled() {
    return this.allowNewCreators;
  }

  isBetaMode() {
    return this.betaMode;
  }

  getStatus() {
    return {
      signups: this.allowNewSignups,
      newRooms: this.allowNewRooms,
      joinApprovals: this.allowJoinApprovals,
      newCreators: this.allowNewCreators,
      betaMode: this.betaMode
    };
  }
}

// Singleton instance
export const killSwitch = new KillSwitch();

/**
 * Policy Gates
 * Centralized enforcement of all platform policies
 */
export class PolicyGates {
  /**
   * Check if user meets age attestation requirement
   * @param {Object} user - User object from database
   * @returns {{allowed: boolean, reason?: string}}
   */
  static checkAgeAttestation(user) {
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    if (!user.age_attested_at) {
      return { allowed: false, reason: 'Age attestation required' };
    }

    return { allowed: true };
  }

  /**
   * Check if user has accepted Terms of Service
   * @param {Object} user - User object from database
   * @returns {{allowed: boolean, reason?: string}}
   */
  static checkToSAcceptance(user) {
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    if (!user.tos_accepted_at) {
      return { allowed: false, reason: 'Terms of Service acceptance required' };
    }

    return { allowed: true };
  }

  /**
   * Combined check for age attestation AND ToS acceptance
   * @param {Object} user - User object from database
   * @returns {{allowed: boolean, reason?: string}}
   */
  static checkUserCompliance(user) {
    const ageCheck = this.checkAgeAttestation(user);
    if (!ageCheck.allowed) {
      return ageCheck;
    }

    const tosCheck = this.checkToSAcceptance(user);
    if (!tosCheck.allowed) {
      return tosCheck;
    }

    return { allowed: true };
  }

  /**
   * Check if creator is active and plan is valid
   * @param {Object} creator - Creator object from database
   * @param {Object} paymentsProvider - Payments provider instance
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  static async checkCreatorStatus(creator, paymentsProvider) {
    if (!creator) {
      return { allowed: false, reason: 'Creator not found' };
    }

    // Check if creator status is active
    if (creator.status !== 'active') {
      return { allowed: false, reason: 'Creator account is not active' };
    }

    // BETA_MODE: Skip subscription checks for beta creators
    if (killSwitch.isBetaMode() && creator.plan_status === 'beta') {
      return { allowed: true };
    }

    // Check payment/subscription status if provider is configured
    if (paymentsProvider) {
      try {
        const subStatus = await paymentsProvider.isSubscriptionActive(creator.id);
        if (!subStatus.success || !subStatus.active) {
          return { allowed: false, reason: 'Creator subscription is not active' };
        }
      } catch (error) {
        console.error('Error checking creator subscription:', error);
        // Allow if payment check fails (don't block on payment provider errors)
      }
    }

    return { allowed: true };
  }

  /**
   * Check if user is banned by creator
   * @param {string} creatorId - Creator UUID
   * @param {number} userId - User ID
   * @param {string} email - User email
   * @param {Object} req - Request object for IP/device info
   * @returns {Promise<{allowed: boolean, reason?: string, ban?: Object}>}
   */
  static async checkBanStatus(creatorId, userId, email, req) {
    try {
      // Generate hashes for ban checking
      const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
      
      const userAgent = req.headers['user-agent'] || '';
      const deviceHash = crypto.createHash('sha256').update(`${userAgent}:${userId}`).digest('hex');

      // Check for bans
      const ban = await checkBan(creatorId, userId, email, ipHash, deviceHash);
      
      if (ban) {
        return { 
          allowed: false, 
          reason: ban.reason || 'You are banned from this creator\'s rooms',
          ban 
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking ban status:', error);
      // Allow if ban check fails (don't block on database errors)
      return { allowed: true };
    }
  }

  /**
   * Rate limit check (uses existing rate limit logic)
   * @param {string} key - Rate limit key (email, userId, etc.)
   * @param {number} maxRequests - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @param {Map} store - Rate limit storage
   * @returns {{allowed: boolean, remaining?: number}}
   */
  static checkRateLimit(key, maxRequests, windowMs, store) {
    const now = Date.now();
    
    let entry = store.get(key);
    if (!entry || now - entry.resetTime > windowMs) {
      entry = { count: 0, resetTime: now };
      store.set(key, entry);
    }
    
    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count };
  }

  /**
   * Master gate: Check all policies for join request
   * @param {Object} params - All required parameters
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  static async checkJoinRequestPolicies(params) {
    const { userId, creatorId, creator, paymentsProvider, req } = params;

    // 1. Check kill switch
    if (!killSwitch.isJoinApprovalsEnabled()) {
      return { allowed: false, reason: 'Join approvals are temporarily disabled' };
    }

    // 2. Get user
    const user = await getUserById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // 3. Check age attestation and ToS
    const complianceCheck = this.checkUserCompliance(user);
    if (!complianceCheck.allowed) {
      return complianceCheck;
    }

    // 4. Check creator status
    const creatorCheck = await this.checkCreatorStatus(creator, paymentsProvider);
    if (!creatorCheck.allowed) {
      return creatorCheck;
    }

    // 5. Check ban status
    const banCheck = await this.checkBanStatus(creatorId, userId, user.email, req);
    if (!banCheck.allowed) {
      return banCheck;
    }

    return { allowed: true };
  }

  /**
   * Master gate: Check all policies for creator onboarding
   * @param {Object} params - All required parameters
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  static async checkCreatorOnboardingPolicies(params) {
    const { userId } = params;

    // 1. Check kill switch
    if (!killSwitch.isNewCreatorsEnabled()) {
      return { allowed: false, reason: 'New creator accounts are temporarily disabled' };
    }

    // 2. Get user
    const user = await getUserById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // 3. Check age attestation and ToS
    const complianceCheck = this.checkUserCompliance(user);
    if (!complianceCheck.allowed) {
      return complianceCheck;
    }

    return { allowed: true };
  }

  /**
   * Master gate: Check all policies for signup
   * @returns {{allowed: boolean, reason?: string}}
   */
  static checkSignupPolicies() {
    // Check kill switch
    if (!killSwitch.isSignupsEnabled()) {
      return { allowed: false, reason: 'New signups are temporarily disabled' };
    }

    return { allowed: true };
  }

  /**
   * Master gate: Check all policies for new room creation
   * @param {Object} params - All required parameters
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  static async checkNewRoomPolicies(params) {
    const { userId, creator, paymentsProvider } = params;

    // 1. Check kill switch
    if (!killSwitch.isNewRoomsEnabled()) {
      return { allowed: false, reason: 'New room creation is temporarily disabled' };
    }

    // 2. Get user
    const user = await getUserById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // 3. Check creator status
    const creatorCheck = await this.checkCreatorStatus(creator, paymentsProvider);
    if (!creatorCheck.allowed) {
      return creatorCheck;
    }

    return { allowed: true };
  }
}
