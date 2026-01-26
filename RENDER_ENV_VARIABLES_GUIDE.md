# 🔑 Render.com Environment Variables Guide

## AI Assistant API Key

### Variable Name:
```
GEMINI_API_KEY
```

### Where It's Used:
- **File**: `backend/routes/ai.js`
- **Line**: 6
- **Code**: `const GEMINI_API_KEY = process.env.GEMINI_API_KEY;`

### What It Does:
- Powers the AI assistant feature that provides item insights
- Used to call Google's Gemini API for generating procurement recommendations
- Required for the `/api/ai/item-insights` and `/api/ai/chat` endpoints

### How to Get It:
1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### Add to Render.com:
```
Key: GEMINI_API_KEY
Value: AIza...your_actual_key_here
```

---

## Email Service API Keys (Choose ONE)

The email service sends verification codes to users when they sign up. You need to choose **either Resend OR SendGrid**.

### Option A: Resend (Recommended - Easier Setup)

#### Variable Names:
```
RESEND_API_KEY
RESEND_FROM_EMAIL
```

#### Where They're Used:
- **File**: `backend/utils/emailService.js`
- **Lines**: 6, 12-20, 39-52, 88-89
- **Code**: 
  ```javascript
  const resendApiKey = process.env.RESEND_API_KEY;
  // Used to send verification emails with codes
  ```

#### What They Do:
- `RESEND_API_KEY`: Authenticates with Resend email service
- `RESEND_FROM_EMAIL`: Sets the "from" email address (format: `Name <email@domain.com>`)
- Used in `sendVerificationEmail()` function (line 75) to send 6-digit verification codes

#### How to Get It:
1. Go to https://resend.com/api-keys
2. Sign up (free tier: 3,000 emails/month)
3. Create an API key
4. Copy the key (starts with `re_`)

#### Add to Render.com:
```
Key: RESEND_API_KEY
Value: re_your_actual_key_here

Key: RESEND_FROM_EMAIL
Value: BloomNode <onboarding@resend.dev>
```

---

### Option B: SendGrid (Alternative)

#### Variable Names:
```
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
```

#### Where They're Used:
- **File**: `backend/utils/emailService.js`
- **Lines**: 5, 21-29, 53-56, 91
- **Code**:
  ```javascript
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  // Used to send verification emails with codes
  ```

#### What They Do:
- `SENDGRID_API_KEY`: Authenticates with SendGrid email service
- `SENDGRID_FROM_EMAIL`: Sets the "from" email address (must be verified in SendGrid)
- Used in `sendVerificationEmail()` function (line 75) to send 6-digit verification codes

#### How to Get It:
1. Go to https://app.sendgrid.com
2. Sign up (free tier: 100 emails/day)
3. Settings → API Keys → Create API Key
4. Select "Full Access" permissions
5. Copy the key (starts with `SG.`)
6. Verify your sender email in Settings → Sender Authentication

#### Add to Render.com:
```
Key: SENDGRID_API_KEY
Value: SG.your_actual_key_here

Key: SENDGRID_FROM_EMAIL
Value: noreply@yourdomain.com
```

---

## 📧 Email Verification Code Flow

The email service sends verification codes in the `sendVerificationEmail()` function:

**File**: `backend/utils/emailService.js`
**Function**: `sendVerificationEmail()` (lines 75-269)

**What happens:**
1. User signs up
2. System generates a 6-digit code (line 66)
3. Code is sent via email using either Resend or SendGrid API
4. Email contains the verification code in a formatted HTML template (lines 111-175)
5. User enters the code to verify their email

**The API key is used here:**
- Line 40: `const resend = new Resend(resendApiKey);` (for Resend)
- Line 25: `sgMail.setApiKey(sendGridApiKey);` (for SendGrid)
- Line 179: `await sendEmail(email, fromEmail, msg.subject, msg.html);` (sends the email)

---

## 📋 Complete Checklist for Render.com

### Required Variables:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your_long_random_secret_here
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### AI Assistant (Optional but Recommended):
```
GEMINI_API_KEY=AIza...your_gemini_key_here
GEMINI_MODEL=gemini-pro
```

### Email Service (Choose ONE):

**Option 1: Resend (Recommended)**
```
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=BloomNode <onboarding@resend.dev>
```

**Option 2: SendGrid**
```
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

---

## 🔍 Code References

### AI Assistant API Key Usage:
- **File**: `backend/routes/ai.js`
- **Line 6**: `const GEMINI_API_KEY = process.env.GEMINI_API_KEY;`
- **Line 34**: Used in API call: `${GEMINI_API_BASE}/models?key=${GEMINI_API_KEY}`
- **Line 124**: Used in API call: `${GEMINI_API_BASE}/models/${modelToUse}:generateContent?key=${GEMINI_API_KEY}`
- **Line 197**: Checked if missing: `if (!GEMINI_API_KEY)`

### Email API Key Usage:
- **File**: `backend/utils/emailService.js`
- **Line 5**: `const sendGridApiKey = process.env.SENDGRID_API_KEY;`
- **Line 6**: `const resendApiKey = process.env.RESEND_API_KEY;`
- **Line 12-20**: Resend initialization
- **Line 21-29**: SendGrid initialization
- **Line 39-52**: Resend email sending
- **Line 53-56**: SendGrid email sending
- **Line 75-269**: `sendVerificationEmail()` function that sends codes

---

## ✅ After Adding Variables

1. **Save** the environment variables in Render.com
2. **Redeploy** your backend service (Render usually auto-redeploys when env vars change)
3. **Test**:
   - Try the AI assistant feature
   - Try signing up with a new email
   - Check your inbox for the verification code

---

## 🚨 Important Notes

- **No spaces** around the `=` sign: `GEMINI_API_KEY=value` ✅ (not `GEMINI_API_KEY = value` ❌)
- **No quotes** needed unless the value itself contains special characters
- **Resend is easier** to set up (no email verification needed for `onboarding@resend.dev`)
- **SendGrid requires** email verification before you can send emails
- Both email services will work - the code automatically detects which API key is available

