# SendGrid Email Setup Guide

This guide will help you set up SendGrid to send real verification emails to users.

## Step 1: Create a SendGrid Account

1. Go to [https://sendgrid.com](https://sendgrid.com)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

## Step 2: Get Your API Key

1. Log in to your SendGrid dashboard: [https://app.sendgrid.com](https://app.sendgrid.com)
2. Navigate to **Settings** → **API Keys** (in the left sidebar)
3. Click **Create API Key** button
4. Give it a name (e.g., "BloomNode Production")
5. Select **Full Access** permissions (or at minimum: Mail Send permissions)
6. Click **Create & View**
7. **IMPORTANT**: Copy the API key immediately - you won't be able to see it again!
   - The key will look like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Verify Your Sender Email

You need to verify the email address you'll be sending from.

### Option A: Single Sender Verification (Easiest for Testing)

1. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
2. Click **Create New Sender**
3. Fill in your details:
   - **From Email**: The email you want to send from (e.g., `noreply@yourdomain.com`)
   - **From Name**: Your name or organization name
   - **Reply To**: Your email address
   - **Address, City, State, Zip, Country**: Your business address
4. Click **Create**
5. Check your email and click the verification link
6. Once verified, you can use this email as your `SENDGRID_FROM_EMAIL`

### Option B: Domain Authentication (Recommended for Production)

1. Go to **Settings** → **Sender Authentication** → **Domain Authentication**
2. Click **Authenticate Your Domain**
3. Follow the DNS setup instructions
4. Once verified, you can send from any email address on that domain

## Step 4: Configure Environment Variables

Create or update your `backend/.env` file with:

```env
# SendGrid Email Configuration
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Optional: Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

**Important Notes:**
- Replace `SG.your_actual_api_key_here` with your actual API key from Step 2
- Replace `noreply@yourdomain.com` with your verified sender email from Step 3
- Make sure there are no spaces or quotes around the values

## Step 5: Restart Your Server

After updating your `.env` file:

```bash
# Stop your current server (Ctrl+C)
# Then restart it
cd backend
npm start
```

You should see:
```
✅ SendGrid API key loaded (first 10 chars): SG.xxxxx...
```

## Step 6: Test Email Sending

1. Try registering a new user through your signup form
2. Check the email inbox for the verification code
3. If you see errors, check the console logs for troubleshooting tips

## Troubleshooting

### Error: "The provided authorization grant is invalid, expired, or revoked"

**Solution:**
- Your API key is invalid or expired
- Go to SendGrid dashboard → Settings → API Keys
- Create a new API key
- Update your `.env` file with the new key
- Restart your server

### Error: "The from address does not match a verified Sender Identity"

**Solution:**
- Your "from" email is not verified
- Go to SendGrid dashboard → Settings → Sender Authentication
- Verify your sender email or domain
- Update your `.env` file: `SENDGRID_FROM_EMAIL=your-verified-email@yourdomain.com`
- Restart your server

### Error: "SENDGRID_API_KEY is not set"

**Solution:**
- Make sure you have a `.env` file in the `backend/` directory
- Make sure the file contains: `SENDGRID_API_KEY=your_key_here`
- Make sure there are no typos in the variable name
- Restart your server after adding the key

### Emails Not Arriving

1. Check your spam/junk folder
2. Check SendGrid Activity Feed: Dashboard → Activity
3. Look for any bounces or blocks
4. Make sure your sender email is verified
5. Check the server console for error messages

## Free Tier Limits

SendGrid's free tier includes:
- **100 emails per day**
- **40,000 emails for the first 30 days**
- After 30 days: 100 emails/day

For production use, you may need to upgrade to a paid plan.

## Need Help?

- SendGrid Documentation: [https://docs.sendgrid.com](https://docs.sendgrid.com)
- SendGrid Support: [https://support.sendgrid.com](https://support.sendgrid.com)

