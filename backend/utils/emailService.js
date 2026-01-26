const sgMail = require('@sendgrid/mail');
const { Resend } = require('resend');

// Initialize SendGrid with API key
const sendGridApiKey = process.env.SENDGRID_API_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

// Determine which email service to use (prefer Resend, fallback to SendGrid)
let emailService = 'none';
let apiKey = null;

if (resendApiKey) {
  emailService = 'resend';
  apiKey = resendApiKey;
  try {
    const resend = new Resend(resendApiKey);
    console.log('✅ Resend email service initialized');
  } catch (err) {
    console.error('Error initializing Resend:', err.message);
  }
} else if (sendGridApiKey) {
  emailService = 'sendgrid';
  apiKey = sendGridApiKey;
  try {
    sgMail.setApiKey(sendGridApiKey);
    console.log('✅ SendGrid email service initialized');
  } catch (err) {
    console.error('Error setting SendGrid API key:', err.message);
  }
} else {
  console.error('WARNING: No email API key configured!');
  console.error('Please set either RESEND_API_KEY or SENDGRID_API_KEY in your environment variables.');
}

/**
 * Helper function to send email using configured service (Resend or SendGrid)
 */
const sendEmail = async (to, from, subject, html) => {
  if (emailService === 'resend') {
    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
    }

    return { success: true, service: 'resend', emailId: data?.id };
  } else if (emailService === 'sendgrid') {
    const msg = { to, from, subject, html };
    await sgMail.send(msg);
    return { success: true, service: 'sendgrid' };
  } else {
    throw new Error('Email service not configured. Please set either RESEND_API_KEY or SENDGRID_API_KEY.');
  }
};

/**
 * Generate a 6-digit verification code
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification email with code
 * @param {string} email - Recipient email
 * @param {string} username - Username for personalization
 * @param {string} code - 6-digit verification code
 */
const sendVerificationEmail = async (email, username, code) => {
  try {
    // Validate configuration before attempting to send
    if (!apiKey || emailService === 'none') {
      const error = new Error('Email service not configured. Please set either RESEND_API_KEY or SENDGRID_API_KEY in your environment variables.');
      console.error('❌ EMAIL CONFIGURATION ERROR:');
      console.error('   Missing: RESEND_API_KEY or SENDGRID_API_KEY');
      console.error('   Fix: Add one of these to your Render.com environment variables');
      throw error;
    }

    // Get from email based on service
    let fromEmail;
    if (emailService === 'resend') {
      fromEmail = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'BloomNode <onboarding@resend.dev>';
    } else {
      fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@bloomnode.com';
    }
    
    if (!fromEmail) {
      const missingVar = emailService === 'resend' ? 'RESEND_FROM_EMAIL' : 'SENDGRID_FROM_EMAIL';
      const error = new Error(`${missingVar} is not configured`);
      console.error('❌ EMAIL CONFIGURATION ERROR:');
      console.error(`   Missing: ${missingVar}`);
      console.error(`   Fix: Add ${missingVar} to your Render.com environment variables`);
      throw error;
    }

    console.log('📧 Attempting to send verification email...');
    console.log('   To:', email);
    console.log('   From:', fromEmail);
    console.log('   API Key (first 10 chars):', apiKey.substring(0, 10) + '...');

    const msg = {
      to: email,
      from: fromEmail,
      subject: 'Verify Your BloomNode Account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">BloomNode</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Welcome, ${username}!</h2>
                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                          Thank you for signing up with BloomNode. To complete your registration, please verify your email address using the code below:
                        </p>
                        
                        <!-- Verification Code Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <div style="background-color: #f7fafc; border: 2px dashed #4a5568; border-radius: 8px; padding: 20px; display: inline-block;">
                                <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                                <p style="color: #2d3748; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
                              </div>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                          This code will expire in <strong>10 minutes</strong>. If you didn't request this verification, please ignore this email.
                        </p>
                        
                        <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                          <strong>Note:</strong> After verification, your account will be pending admin approval before you can log in.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                        <p style="color: #999999; font-size: 14px; margin: 0;">
                          &copy; ${new Date().getFullYear()} BloomNode. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    // Send email using the configured service
    const result = await sendEmail(email, fromEmail, msg.subject, msg.html);
    
    console.log(`✅ Verification email sent successfully via ${result.service}!`);
    console.log('   Recipient:', email);
    console.log('   Verification Code:', code);
    if (result.emailId) {
      console.log('   Email ID:', result.emailId);
    }

    return { success: true };
  } catch (error) {
    console.error('\n❌ ============================================');
    console.error('❌ EMAIL SENDING FAILED');
    console.error('❌ ============================================');
    console.error('📧 Email Details:');
    console.error('   To:', email);
    console.error('   From:', process.env.SENDGRID_FROM_EMAIL || 'noreply@bloomnode.com');
    console.error('   Verification Code:', code);
    console.error('\n🔍 Error Information:');
    console.error('   Error Type:', error.name || 'Unknown');
    console.error('   Error Message:', error.message || 'No message');
    
    if (error.response) {
      console.error('\n📡 SendGrid API Response:');
      console.error('   Status Code:', error.response.statusCode || error.response.status);
      console.error('   Response Body:', JSON.stringify(error.response.body, null, 2));
      
      if (error.response.body?.errors && Array.isArray(error.response.body.errors)) {
        console.error('\n🚨 SendGrid Error Details:');
        error.response.body.errors.forEach((err, index) => {
          console.error(`   Error ${index + 1}:`);
          console.error('      Message:', err.message || 'No message');
          console.error('      Field:', err.field || 'N/A');
          console.error('      Help:', err.help || 'No help available');
        });
      }
    }

    // Provide specific fix instructions based on error type
    console.error('\n🔧 TROUBLESHOOTING GUIDE:');
    
    if (error.message?.includes('SENDGRID_API_KEY') || error.message?.includes('not configured')) {
      console.error('   ❌ Problem: API Key is missing');
      console.error('   ✅ Solution:');
      console.error('      1. Check your .env file has: SENDGRID_API_KEY=SG.your_key_here');
      console.error('      2. Make sure there are no spaces or quotes around the value');
      console.error('      3. Restart your server after updating .env');
    } else if (error.response?.statusCode === 401 || error.response?.status === 401) {
      console.error('   ❌ Problem: API Key is invalid, expired, or revoked');
      console.error('   ✅ Solution:');
      console.error('      1. Go to https://app.sendgrid.com');
      console.error('      2. Navigate to Settings > API Keys');
      console.error('      3. Create a new API key with "Full Access" permissions');
      console.error('      4. Copy the new key (starts with SG.)');
      console.error('      5. Update .env: SENDGRID_API_KEY=SG.your_new_key');
      console.error('      6. Restart your server');
    } else if (error.response?.body?.errors?.some(e => e.message?.includes('from') || e.message?.includes('sender'))) {
      console.error('   ❌ Problem: Sender email is not verified');
      console.error('   ✅ Solution:');
      console.error('      1. Go to https://app.sendgrid.com');
      console.error('      2. Navigate to Settings > Sender Authentication > Single Sender Verification');
      console.error('      3. Verify your sender email:', process.env.SENDGRID_FROM_EMAIL);
      console.error('      4. Check your email inbox for verification link');
      console.error('      5. Click the verification link');
    } else if (error.response?.statusCode === 403 || error.response?.status === 403) {
      console.error('   ❌ Problem: API Key lacks required permissions');
      console.error('   ✅ Solution:');
      console.error('      1. Go to https://app.sendgrid.com');
      console.error('      2. Navigate to Settings > API Keys');
      console.error('      3. Edit your API key or create a new one');
      console.error('      4. Select "Full Access" permissions (or at minimum "Mail Send")');
    } else {
      console.error('   ❌ Problem: Unknown error occurred');
      console.error('   ✅ General Solutions:');
      console.error('      1. Verify your .env file has both SENDGRID_API_KEY and SENDGRID_FROM_EMAIL');
      console.error('      2. Check SendGrid dashboard for account status');
      console.error('      3. Verify your internet connection');
      console.error('      4. Check SendGrid service status: https://status.sendgrid.com');
    }
    
    console.error('\n📝 Current Configuration:');
    console.error('   Email Service:', emailService);
    console.error('   RESEND_API_KEY:', resendApiKey ? `${resendApiKey.substring(0, 10)}...` : 'NOT SET');
    console.error('   SENDGRID_API_KEY:', sendGridApiKey ? `${sendGridApiKey.substring(0, 10)}...` : 'NOT SET');
    console.error('   FROM_EMAIL:', process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'NOT SET');
    console.error('   NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
    console.error('❌ ============================================\n');
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send account approval notification
 * @param {string} email - Recipient email
 * @param {string} username - Username
 */
const sendApprovalEmail = async (email, username) => {
  try {
    // Get from email based on service
    let fromEmail;
    if (emailService === 'resend') {
      fromEmail = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'BloomNode <onboarding@resend.dev>';
    } else {
      fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@bloomnode.com';
    }

    const subject = 'Your BloomNode Account Has Been Approved! 🎉';
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Approved</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 Account Approved!</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Great news, ${username}!</h2>
                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                          Your BloomNode account has been approved by the administrator. You can now log in and start using the platform!
                        </p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                                 style="display: inline-block; background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                Log In Now
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                          If you have any questions or need assistance, feel free to contact our support team.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                        <p style="color: #999999; font-size: 14px; margin: 0;">
                          &copy; ${new Date().getFullYear()} BloomNode. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

    // Send email using the configured service
    const result = await sendEmail(email, fromEmail, subject, html);
    
    console.log(`✅ Approval email sent successfully via ${result.service} to:`, email);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending approval email:', error);
    if (error.response) {
      console.error('SendGrid API Error:', error.response.body);
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send password reset email with reset link
 * @param {string} email - Recipient email
 * @param {string} username - Username
 * @param {string} resetToken - Reset token
 */
const sendPasswordResetEmail = async (email, username, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    // Get from email based on service
    let fromEmail;
    if (emailService === 'resend') {
      fromEmail = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'BloomNode <onboarding@resend.dev>';
    } else {
      fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@bloomnode.com';
    }

    const subject = 'Reset Your BloomNode Password';
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🔐 Password Reset</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hi ${username},</h2>
                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                          We received a request to reset your password for your BloomNode account. Click the button below to create a new password:
                        </p>
                        
                        <!-- Reset Button -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" 
                                 style="display: inline-block; background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0; padding: 15px; background-color: #f7fafc; border-left: 3px solid #4a5568; border-radius: 4px;">
                          <strong>Or copy and paste this link:</strong><br>
                          <a href="${resetUrl}" style="color: #2d3748; word-break: break-all;">${resetUrl}</a>
                        </p>
                        
                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                          This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                        </p>
                        
                        <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                          <strong>Security Tip:</strong> Never share your password or reset link with anyone.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                        <p style="color: #999999; font-size: 14px; margin: 0;">
                          &copy; ${new Date().getFullYear()} BloomNode. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

    // Send email using the configured service
    const result = await sendEmail(email, fromEmail, subject, html);
    
    console.log(`✅ Password reset email sent successfully via ${result.service} to:`, email);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    if (error.response) {
      console.error('SendGrid API Error:', error.response.body);
    }
    
    // Check for common issues
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is not configured. Please add it to your .env file.');
    }
    
    throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationEmail,
  sendApprovalEmail,
  sendPasswordResetEmail
};

