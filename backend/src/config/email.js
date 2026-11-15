import nodemailer from 'nodemailer';

/**
 * Email Configuration
 * Supports multiple email providers (Gmail, Outlook, Custom SMTP)
 */

// Create transporter based on environment
let transporter = null;

const getTransporter = () => {
  // Return cached transporter if already created
  if (transporter) return transporter;

  // Check if SMTP credentials are available
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('✅ Email service configured - emails will be sent via SMTP');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    return transporter;
  }

  // Fallback: Console logging only (no actual emails sent)
  console.warn('⚠️ Email service not configured. Emails will be logged to console only.');
  return null;
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (fallback)
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const emailTransporter = getTransporter();
    
    // If no transporter, log to console only
    if (!emailTransporter) {
      console.log('📧 Email (Console Only):');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', text || html);
      return { success: true, mode: 'console' };
    }

    // Send actual email
    const info = await emailTransporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Studdy Buddy'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId, mode: 'smtp' };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error('Failed to send email');
  }
};

/**
 * Send password reset email with code
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} resetCode - 6-digit reset code
 */
export const sendPasswordResetEmail = async (email, name, resetCode) => {
  const subject = 'Reset Your Password - Studdy Buddy';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
        .message { font-size: 15px; color: #666; line-height: 1.6; margin-bottom: 30px; }
        .code-box { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border: 2px dashed #6366f1; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0; }
        .code { font-size: 36px; font-weight: bold; color: #6366f1; letter-spacing: 8px; margin: 10px 0; font-family: 'Courier New', monospace; }
        .code-label { font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        .expiry { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #92400e; }
        .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #991b1b; }
        .footer { background: #f9fafb; padding: 30px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        .footer a { color: #6366f1; text-decoration: none; }
        .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <div class="greeting">Hi ${name},</div>
          <div class="message">
            We received a request to reset your password for your Studdy Buddy account. 
            Use the verification code below to reset your password:
          </div>
          
          <div class="code-box">
            <div class="code-label">Your Verification Code</div>
            <div class="code">${resetCode}</div>
          </div>
          
          <div class="expiry">
            ⏱️ <strong>Important:</strong> This code will expire in <strong>10 minutes</strong> for security reasons.
          </div>
          
          <div class="message">
            Enter this code on the password reset page along with your new password. 
            If you didn't request this reset, please ignore this email or contact support immediately.
          </div>
          
          <div class="warning">
            🚨 <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
          </div>
        </div>
        
        <div class="footer">
          <p>This email was sent from <strong>Studdy Buddy</strong></p>
          <p>If you have any questions, contact us at support@studdybuddy.com</p>
          <p style="margin-top: 20px; color: #9ca3af;">
            © 2026 Studdy Buddy. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${name},

We received a request to reset your password for your Studdy Buddy account.

Your Verification Code: ${resetCode}

This code will expire in 10 minutes for security reasons.

Enter this code on the password reset page along with your new password. If you didn't request this reset, please ignore this email or contact support immediately.

Security Notice: Never share this code with anyone. Our team will never ask for your verification code.

---
Studdy Buddy
© 2026 All rights reserved.
  `;

  return await sendEmail({ to: email, subject, html, text });
};

/**
 * Send password change confirmation email
 * @param {string} email - User email
 * @param {string} name - User name
 */
export const sendPasswordChangedEmail = async (email, name) => {
  const subject = 'Your Password Has Been Changed - Studdy Buddy';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 40px 30px; }
        .success-icon { font-size: 64px; text-align: center; margin: 20px 0; }
        .message { font-size: 15px; color: #666; line-height: 1.6; margin-bottom: 20px; }
        .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #991b1b; }
        .footer { background: #f9fafb; padding: 30px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Password Changed Successfully</h1>
        </div>
        <div class="content">
          <div class="success-icon">🔒</div>
          <div class="message">
            Hi ${name},<br><br>
            This email confirms that your Studdy Buddy account password was successfully changed.
          </div>
          <div class="message">
            <strong>Changed at:</strong> ${new Date().toLocaleString()}<br>
            <strong>Account:</strong> ${email}
          </div>
          <div class="warning">
            🚨 <strong>Didn't make this change?</strong><br>
            If you didn't change your password, your account may be compromised. 
            Please contact our support team immediately at support@studdybuddy.com
          </div>
        </div>
        <div class="footer">
          <p>This email was sent from <strong>Studdy Buddy</strong></p>
          <p>© 2026 Studdy Buddy. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${name},

This email confirms that your Studdy Buddy account password was successfully changed.

Changed at: ${new Date().toLocaleString()}
Account: ${email}

Didn't make this change?
If you didn't change your password, your account may be compromised. Please contact our support team immediately at support@studdybuddy.com

---
Studdy Buddy
© 2026 All rights reserved.
  `;

  return await sendEmail({ to: email, subject, html, text });
};

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
};
