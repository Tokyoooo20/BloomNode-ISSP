const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;

if (!apiKey) {
  console.error('⚠️  WARNING: SENDGRID_API_KEY is not set in environment variables!');
  console.error('   Email functionality will not work. Please add SENDGRID_API_KEY to your .env file.');
}

sgMail.setApiKey(apiKey);

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
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@bloomnode.com',
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

    await sgMail.send(msg);

    console.log('✅ Verification email sent successfully to:', email);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    if (error.response) {
      console.error('SendGrid API Error:', error.response.body);
    }
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
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@bloomnode.com',
      subject: 'Your BloomNode Account Has Been Approved! 🎉',
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
      `,
    };

    await sgMail.send(msg);

    console.log('✅ Approval email sent successfully to:', email);
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
    
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@bloomnode.com',
      subject: 'Reset Your BloomNode Password',
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
      `,
    };

    await sgMail.send(msg);

    console.log('✅ Password reset email sent successfully to:', email);
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

