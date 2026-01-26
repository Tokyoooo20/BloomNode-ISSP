# 🔍 How to Check Render.com Logs for Email Errors

## Step 1: View Logs
1. Go to your Render.com dashboard
2. Click on your backend service
3. Click **Logs** tab

## Step 2: Look for These Messages

### ✅ Good Signs (Email Should Work):
```
✅ SendGrid email service initialized
📧 Attempting to send verification email...
✅ Verification email sent successfully via sendgrid!
```

### ❌ Bad Signs (Email Not Working):

**Error 1: Sender Not Verified**
```
❌ EMAIL SENDING FAILED
❌ Problem: Sender email is not verified
```
**Fix**: Verify `noreply@yourdomain.com` in SendGrid dashboard

**Error 2: Invalid API Key**
```
❌ Problem: API Key is invalid, expired, or revoked
```
**Fix**: Regenerate API key in SendGrid

**Error 3: Missing Configuration**
```
WARNING: No email API key configured!
❌ EMAIL CONFIGURATION ERROR: Missing: RESEND_API_KEY or SENDGRID_API_KEY
```
**Fix**: Add API key to Render.com

## Step 3: Test Signup
1. Try signing up with a test email
2. Watch the logs in real-time
3. Look for error messages

## Common SendGrid Errors:

**403 Forbidden**: API key lacks permissions
**401 Unauthorized**: Invalid API key
**400 Bad Request**: Sender email not verified












































