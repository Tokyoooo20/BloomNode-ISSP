const express = require('express');
const sgMail = require('@sendgrid/mail');

const router = express.Router();

// Test endpoint to verify SendGrid API connection
router.get('/test-sendgrid', async (req, res) => {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'SENDGRID_API_KEY is not set in environment variables',
        fix: 'Add SENDGRID_API_KEY to your .env file'
      });
    }

    console.log('🧪 Testing SendGrid API connection...');
    console.log('   API Key:', apiKey.substring(0, 10) + '...');
    console.log('   From Email:', process.env.SENDGRID_FROM_EMAIL || 'noreply@bloomnode.com');
    
    sgMail.setApiKey(apiKey);
    
    // Try to send a test email
    const msg = {
      to: req.query.email || 'test@example.com', // Use query param or default
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@bloomnode.com',
      subject: 'BloomNode - SendGrid API Test',
      html: '<p>This is a test email to verify SendGrid API connectivity.</p>',
    };

    await sgMail.send(msg);

    console.log('✅ SendGrid API Test Successful!');
    
    return res.json({
      success: true,
      message: 'SendGrid API is working correctly!',
      apiKeyPreview: apiKey.substring(0, 10) + '...',
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@bloomnode.com',
      sentTo: msg.to
    });

  } catch (error) {
    console.error('❌ SendGrid API Test Failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      errorDetails: error.response?.body || error,
      troubleshooting: [
        'Check if your API key is valid',
        'Regenerate your API key at app.sendgrid.com',
        'Verify your internet connection',
        'Check SendGrid service status',
        'Make sure your "from" email is verified in SendGrid'
      ]
    });
  }
});

module.exports = router;

