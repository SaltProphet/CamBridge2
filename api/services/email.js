import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Email service - handles template rendering and sending
 * Uses Resend in production, console in development
 */

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  // Resend SDK is available when RESEND_API_KEY is set
  try {
    const { Resend } = await import('resend');
    return new Resend(apiKey);
  } catch (err) {
    console.warn('Resend SDK not available, will fall back to console logging');
    return null;
  }
}

/**
 * Load and render an email template
 * @param {string} templateName - Name of template in api/templates/
 * @param {Object} variables - Variables to interpolate: {key} -> value
 * @returns {string} Rendered HTML
 */
export function renderEmailTemplate(templateName, variables = {}) {
  const templatePath = join(__dirname, `${templateName}.html`);
  let html = '';

  try {
    html = readFileSync(templatePath, 'utf-8');
  } catch (err) {
    throw new Error(`Could not load template '${templateName}': ${err.message}`);
  }

  // Replace all template variables: {key} -> value
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, 'g');
    html = html.replace(placeholder, String(value || ''));
  }

  return html;
}

/**
 * Send invoice email to creator
 * @param {Object} options - { to, creatorId, invoiceId, plan, amount }
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendInvoiceEmail(options) {
  const {
    to,
    creatorId,
    invoiceId,
    plan,
    amount,
    dashboardLink = 'https://cambridge.so/dashboard',
    subscribeLink = 'https://cambridge.so/subscribe',
    websiteLink = 'https://cambridge.so'
  } = options;

  // Plan details
  const planDetails = {
    pro: {
      name: 'Pro Creator Plan',
      description: 'Unlimited rooms, priority support, 100% of tips retained',
      price: 30
    },
    enterprise: {
      name: 'Enterprise Creator Plan',
      description: 'Dedicated account manager, priority support, custom features',
      price: 99
    }
  };

  const planInfo = planDetails[plan] || { name: 'Custom Plan', description: '', price: amount || 0 };

  // Build email variables
  const now = new Date();
  const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

  const templateVars = {
    invoiceId: invoiceId.slice(-8).toUpperCase(),
    invoiceDate: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    dueDate: dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    creatorEmail: to,
    creatorId: creatorId,
    planName: planInfo.name,
    planDescription: planInfo.description,
    planPrice: planInfo.price,
    billingCycle: 'Monthly billing • Cancellable anytime',
    dashboardLink: dashboardLink,
    subscribeLink: subscribeLink,
    websiteLink: websiteLink
  };

  // Render HTML from template
  let html = '';
  try {
    html = renderEmailTemplate('manual-invoice', templateVars);
  } catch (err) {
    console.error('Template render error:', err);
    return { success: false, error: `Failed to render email template: ${err.message}` };
  }

  // Try to send via Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      // Dynamic import to avoid dependency issues if not installed
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const response = await resend.emails.send({
        from: 'invoices@cambridge.so',
        to: to,
        subject: `Invoice #${templateVars.invoiceId} - CamBridge ${planInfo.name}`,
        html: html,
        text: `Invoice created for ${planInfo.name} subscription. Visit your account to complete payment.`,
        headers: {
          'X-Cambridge-Invoice-ID': invoiceId,
          'X-Cambridge-Creator-ID': creatorId,
          'X-Cambridge-Plan': plan
        }
      });

      if (response.error) {
        console.error('Resend send error:', response.error);
        // Fall back to console logging
      } else {
        console.log(`Invoice email sent to ${to}:`, { messageId: response.data?.id, invoiceId });
        return { success: true, messageId: response.data?.id };
      }
    } catch (err) {
      console.error('Error sending via Resend:', err.message);
      // Fall back to console logging
    }
  }

  // Fallback: Log to console in development
  console.log('📧 DEV: Invoice email (console fallback)');
  console.log('  To:', to);
  console.log('  Subject: Invoice #' + templateVars.invoiceId + ' - CamBridge ' + planInfo.name);
  console.log('  Plan:', plan);
  console.log('  Amount: $' + planInfo.price);
  console.log('  Creator:', creatorId);
  console.log('  Invoice ID:', invoiceId);
  console.log('  Due Date:', templateVars.dueDate);

  return { success: true, messageId: `dev-${invoiceId}` };
}

/**
 * Send subscription confirmation email
 * @param {Object} options - { to, creatorId, plan, billingDate }
 * @returns {Promise<{success: boolean, messageId?: string}>}
 */
export async function sendSubscriptionConfirmationEmail(options) {
  const { to, creatorId, plan, billingDate } = options;

  const subject = `Subscription Confirmed - CamBridge ${plan} Plan`;
  const html = `
    <html>
      <body style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00cc6a;">✓ Subscription Activated</h2>
        <p>Hi,</p>
        <p>Your <strong>${plan}</strong> subscription is now active on CamBridge.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Subscription Details</strong></p>
          <p>Plan: <strong>${plan}</strong></p>
          <p>Status: <strong>ACTIVE</strong></p>
          <p>Next Billing: <strong>${billingDate}</strong></p>
          <p>Creator ID: <code>${creatorId}</code></p>
        </div>
        <p>You can manage your subscription at any time from your <a href="https://cambridge.so/dashboard" style="color: #00cc6a;">creator dashboard</a>.</p>
        <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          CamBridge © 2026 • <a href="https://cambridge.so" style="color: #00cc6a; text-decoration: none;">Visit our site</a>
        </p>
      </body>
    </html>
  `;

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const response = await resend.emails.send({
        from: 'hello@cambridge.so',
        to: to,
        subject: subject,
        html: html,
        headers: {
          'X-Cambridge-Creator-ID': creatorId,
          'X-Cambridge-Plan': plan,
          'X-Cambridge-Event': 'subscription.confirmed'
        }
      });

      if (!response.error) {
        return { success: true, messageId: response.data?.id };
      }
    } catch (err) {
      console.error('Error sending confirmation email:', err.message);
    }
  }

  // Fallback
  console.log('📧 DEV: Subscription confirmation email to', to, 'for plan', plan);
  return { success: true, messageId: `dev-confirmation-${creatorId}` };
}

/**
 * Send payment reminder email
 * @param {Object} options - { to, creatorId, invoiceId, plan, dueDate }
 * @returns {Promise<{success: boolean, messageId?: string}>}
 */
export async function sendPaymentReminderEmail(options) {
  const { to, creatorId, invoiceId, plan, dueDate } = options;

  const subject = `Payment Reminder - Invoice #${invoiceId.slice(-8)}`;
  const html = `
    <html>
      <body style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ffc107;">⏰ Payment Reminder</h2>
        <p>Hi,</p>
        <p>This is a friendly reminder that payment is due for your ${plan} subscription invoice.</p>
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>Invoice #${invoiceId.slice(-8)}</strong></p>
          <p>Due: <strong>${dueDate}</strong></p>
          <p><a href="https://cambridge.so/dashboard" style="color: #0066cc; text-decoration: none;">Complete payment →</a></p>
        </div>
        <p style="color: #888; font-size: 12px;">Reply to this email if you have any questions about payment.</p>
      </body>
    </html>
  `;

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const response = await resend.emails.send({
        from: 'invoices@cambridge.so',
        to: to,
        subject: subject,
        html: html
      });

      if (!response.error) {
        return { success: true, messageId: response.data?.id };
      }
    } catch (err) {
      console.error('Error sending reminder email:', err.message);
    }
  }

  console.log('📧 DEV: Payment reminder email to', to);
  return { success: true, messageId: `dev-reminder-${invoiceId}` };
}
