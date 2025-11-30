# Resend Email Setup Guide

This guide will help you set up Resend for email verification in BloomNode.

## Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (3,000 emails/month)
3. Verify your email address

## Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "BloomNode Production")
5. Copy the API key (starts with `re_`)

## Step 3: Add Domain (Optional but Recommended)

### For Development/Testing:
You can use Resend's default domain: `onboarding@resend.dev`
- This works immediately without any setup
- Perfect for testing

### For Production:
1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `bloomnode.com`)
4. Follow the DNS verification steps
5. Once verified, you can send from addresses like `noreply@bloomnode.com`

## Step 4: Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=BloomNode <onboarding@resend.dev>

# Optional: Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

### Environment Variables Explained:

- **RESEND_API_KEY**: Your API key from Resend dashboard (Required)
- **RESEND_FROM_EMAIL**: The "from" address for emails
  - Development: `BloomNode <onboarding@resend.dev>`
  - Production: `BloomNode <noreply@yourdomain.com>`
- **FRONTEND_URL**: Your frontend URL for links in emails (Optional)

## Step 5: Test the Integration

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. Create a test account through your signup endpoint

3. Check your email for the verification code

4. Verify the code through the `/api/auth/verify-email` endpoint

## API Endpoints

### 1. Signup (Sends Verification Email)
```http
POST /api/auth/signup
Content-Type: application/json

{
  "unit": "Computer Science",
  "username": "testuser",
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "message": "Account created successfully! Please check your email for the verification code.",
  "user": {
    "id": "...",
    "username": "testuser",
    "email": "test@example.com",
    "approvalStatus": "pending",
    "isEmailVerified": false
  },
  "requiresVerification": true
}
```

### 2. Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "test@example.com",
  "code": "123456"
}
```

Response:
```json
{
  "message": "Email verified successfully! Your account is now pending admin approval.",
  "user": {
    "id": "...",
    "username": "testuser",
    "email": "test@example.com",
    "isEmailVerified": true,
    "approvalStatus": "pending"
  }
}
```

### 3. Resend Verification Code
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "test@example.com"
}
```

Response:
```json
{
  "message": "Verification code sent successfully! Please check your email."
}
```

### 4. Login (Checks Email Verification)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

If email not verified:
```json
{
  "message": "Please verify your email before logging in.",
  "requiresVerification": true,
  "email": "test@example.com"
}
```

## Email Flow

1. **User Signs Up** → Receives verification email with 6-digit code
2. **User Enters Code** → Email verified, account pending admin approval
3. **Admin Approves** → User receives approval email notification
4. **User Can Login** → Full access granted

## Free Tier Limits

- **3,000 emails/month** (100 emails/day)
- Perfect for small to medium applications
- No credit card required

## Troubleshooting

### Email Not Received?
1. Check spam/junk folder
2. Verify RESEND_API_KEY is correct in `.env`
3. Check server logs for errors
4. Use `/api/auth/resend-verification` to get a new code

### API Errors?
1. Ensure API key is valid (starts with `re_`)
2. Check Resend dashboard for usage limits
3. Verify email format is correct

### Code Expired?
- Codes expire after 10 minutes
- Request a new code using the resend endpoint

## Production Checklist

- [ ] Set up custom domain in Resend
- [ ] Update `RESEND_FROM_EMAIL` with your domain
- [ ] Update `FRONTEND_URL` with production URL
- [ ] Test email delivery
- [ ] Monitor usage in Resend dashboard
- [ ] Consider upgrading plan if needed (50k emails = $20/month)

## Support

- Resend Documentation: [resend.com/docs](https://resend.com/docs)
- Resend Support: support@resend.com

---

**Note**: Keep your API keys secure! Never commit them to version control.

