# Quick SendGrid Verification Checklist

Your `.env` file already has SendGrid configured. Follow these steps to make sure it works:

## ✅ Step 1: Verify Your Sender Email

The email `bloomnode1@gmail.com` must be verified in SendGrid:

1. Go to [https://app.sendgrid.com](https://app.sendgrid.com)
2. Navigate to **Settings** → **Sender Authentication** → **Single Sender Verification**
3. Check if `bloomnode1@gmail.com` is listed and shows as **Verified**
4. If it's NOT verified:
   - Click **Create New Sender**
   - Enter `bloomnode1@gmail.com` as the email
   - Fill in all required fields
   - Check your Gmail inbox for the verification email
   - Click the verification link in the email
   - Wait for it to show as "Verified" in SendGrid

## ✅ Step 2: Verify Your API Key

1. Go to [https://app.sendgrid.com](https://app.sendgrid.com)
2. Navigate to **Settings** → **API Keys**
3. Check if your API key exists and is active
4. If it shows as "Revoked" or you're not sure:
   - Create a new API key
   - Select **Full Access** permissions
   - Copy the new key
   - Update your `.env` file: `SENDGRID_API_KEY=SG.your_new_key_here`
   - Restart your server

## ✅ Step 3: Test Email Sending

After verifying both, restart your server and try registering a new user. The email should be sent successfully.

## Common Issues:

### Issue: "The provided authorization grant is invalid, expired, or revoked"
**Solution:** Your API key is invalid. Create a new one in SendGrid and update your `.env` file.

### Issue: "The from address does not match a verified Sender Identity"
**Solution:** Your sender email (`bloomnode1@gmail.com`) is not verified. Verify it in SendGrid dashboard.

### Issue: Emails going to spam
**Solution:** This is normal for new SendGrid accounts. Consider using Domain Authentication for better deliverability.

