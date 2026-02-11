// Phase 0: Email Provider Abstraction
// Allows swapping email providers (Resend, SendGrid, Mailgun, etc.) via configuration
import { assertProviderSecrets } from '../env.js';

/**
 * EmailProvider Interface
 * All email providers must implement these methods
 */
export class EmailProvider {
  /**
   * Send magic-link authentication email
   * @param {string} to - Recipient email
   * @param {string} magicLink - Magic link URL
   * @param {Object} options - Additional options
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendMagicLink(to, magicLink, options = {}) {
    throw new Error('sendMagicLink() must be implemented by provider');
  }

  /**
   * Send transactional notification email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body (HTML)
   * @param {Object} options - Additional options
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendNotification(to, subject, body, options = {}) {
    throw new Error('sendNotification() must be implemented by provider');
  }
}

/**
 * Resend Email Provider Implementation
 */
export class ResendEmailProvider extends EmailProvider {
  constructor(apiKey, fromEmail) {
    super();
    this.apiKey = apiKey;
    this.fromEmail = fromEmail || 'noreply@cambridge.app';
    this.baseUrl = 'https://api.resend.com';
  }

  async sendMagicLink(to, magicLink, options = {}) {
    if (!this.apiKey) {
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'JetBrains Mono', monospace; background: #000; color: #fff; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { color: #00ff88; font-size: 24px; letter-spacing: 0.2rem; margin-bottom: 20px; }
          .content { line-height: 1.6; color: #ccc; }
          .button { 
            display: inline-block; 
            background: #00ff88; 
            color: #000; 
            padding: 12px 24px; 
            text-decoration: none; 
            font-weight: bold;
            margin: 20px 0;
            letter-spacing: 0.1rem;
          }
          .footer { color: #555; font-size: 12px; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">CAMBRIDGE</div>
          <div class="content">
            <p>Click the button below to log in to your CamBridge account:</p>
            <a href="${magicLink}" class="button">LOG IN TO CAMBRIDGE</a>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this login link, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>CamBridge - Privacy-First Video Bridge</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to,
          subject: options.subject || 'Your CamBridge Login Link',
          html
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Resend API error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendNotification(to, subject, body, options = {}) {
    if (!this.apiKey) {
      return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to,
          subject,
          html: body
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Resend API error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Console Email Provider (for development/testing)
 * Logs emails to console instead of sending
 */
export class ConsoleEmailProvider extends EmailProvider {
  async sendMagicLink(to, magicLink, options = {}) {
    console.log('\n=== MAGIC LINK EMAIL (Console Provider) ===');
    console.log('To:', to);
    console.log('Magic Link:', magicLink);
    console.log('Subject:', options.subject || 'Your CamBridge Login Link');
    console.log('==========================================\n');
    return { success: true, messageId: `console-${Date.now()}` };
  }

  async sendNotification(to, subject, body, options = {}) {
    console.log('\n=== NOTIFICATION EMAIL (Console Provider) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', body);
    console.log('===========================================\n');
    return { success: true, messageId: `console-${Date.now()}` };
  }
}

/**
 * Factory function to get the configured email provider
 */
export function getEmailProvider() {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  assertProviderSecrets('email', provider);
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  switch (provider.toLowerCase()) {
    case 'resend':
      return new ResendEmailProvider(apiKey, fromEmail);
    case 'console':
      return new ConsoleEmailProvider();
    // Add more providers here as needed:
    // case 'sendgrid':
    //   return new SendGridEmailProvider(process.env.SENDGRID_API_KEY);
    // case 'mailgun':
    //   return new MailgunEmailProvider(process.env.MAILGUN_API_KEY);
    default:
      console.warn(`Unknown EMAIL_PROVIDER: ${provider}, defaulting to Resend`);
      return new ResendEmailProvider(apiKey, fromEmail);
  }
}
