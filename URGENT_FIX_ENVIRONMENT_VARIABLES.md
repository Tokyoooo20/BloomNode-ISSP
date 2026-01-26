# 🚨 URGENT: Fix AI Assistant & Email Issues

## Current Problems:
1. ❌ **AI Assistant**: "Unable to fetch AI insights right now. Gemini API key not configured"
2. ❌ **Email Verification**: Signup works but verification code email is not received

## ✅ Solution: Add Missing Environment Variables in Render.com

### Step-by-Step Instructions:

1. **Go to Render.com Dashboard**
   - Log in to https://dashboard.render.com
   - Navigate to your backend service

2. **Open Environment Variables**
   - Click on your service
   - Go to **Environment** tab (in the left sidebar)
   - Click **Add Environment Variable** button

3. **Add These Variables:**

#### For AI Assistant (REQUIRED):
```
Key: GEMINI_API_KEY
Value: your_actual_gemini_api_key_here
```

**How to get Gemini API Key:**
- Go to https://aistudio.google.com/apikey
- Sign in with your Google account
- Click "Create API Key"
- Copy the key (starts with something like `AIza...`)
- Paste it as the value for `GEMINI_API_KEY`

#### For Email Service (REQUIRED - Choose ONE option):

**Option A: Resend (EASIEST - Recommended)**
```
Key: RESEND_API_KEY
Value: re_your_resend_api_key_here

Key: RESEND_FROM_EMAIL
Value: BloomNode <onboarding@resend.dev>
```

**How to get Resend API Key:**
- Go to https://resend.com/api-keys
- Sign up (free tier available)
- Create an API key
- Copy the key (starts with `re_`)
- Use `onboarding@resend.dev` as the from email (works immediately, no verification needed)

**Option B: SendGrid**
```
Key: SENDGRID_API_KEY
Value: SG.your_sendgrid_api_key_here

Key: SENDGRID_FROM_EMAIL
Value: noreply@yourdomain.com
```

**How to get SendGrid API Key:**
- Go to https://app.sendgrid.com
- Settings → API Keys
- Create API Key with "Full Access"
- Verify your sender email in SendGrid dashboard

#### Also Make Sure You Have:
```
Key: FRONTEND_URL
Value: https://your-frontend-url.vercel.app
```
(Replace with your actual Vercel frontend URL)

---

## 📋 Complete Checklist

Make sure ALL of these are set in Render.com:

### ✅ Required Variables:
- [ ] `MONGODB_URI` - Your MongoDB connection string
- [ ] `JWT_SECRET` - A long random secret key
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Set to `10000`
- [ ] `FRONTEND_URL` - Your Vercel frontend URL

### ✅ Email Service (ONE of these):
- [ ] `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (Easier)
- [ ] OR `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL`

### ✅ AI Assistant:
- [ ] `GEMINI_API_KEY` - Your Gemini API key

---

## 🔄 After Adding Variables:

1. **Save the environment variables** in Render.com
2. **Redeploy your backend service**:
   - Go to your service in Render.com
   - Click **Manual Deploy** → **Deploy latest commit**
   - OR wait for automatic redeploy (Render usually redeploys when env vars change)

3. **Wait for deployment to complete** (usually 2-5 minutes)

4. **Test:**
   - Try the AI assistant again
   - Try signing up with a new email
   - Check your email inbox (and spam folder) for verification code

---

## 🔍 Verify Variables Are Set:

After redeploying, check Render.com logs:
1. Go to your service → **Logs** tab
2. Look for these messages on startup:
   - `✅ Resend email service initialized` (if using Resend)
   - OR `✅ SendGrid email service initialized` (if using SendGrid)
   - If you see `WARNING: No email API key configured!` → Email variables are missing
   - If you see `Gemini API key not configured` → `GEMINI_API_KEY` is missing

---

## ⚠️ Common Mistakes:

1. **Spaces in values**: Make sure there are NO spaces around the `=` sign
   - ❌ Wrong: `GEMINI_API_KEY = your_key`
   - ✅ Correct: `GEMINI_API_KEY=your_key`

2. **Quotes in values**: Don't add quotes unless the value itself needs them
   - ❌ Wrong: `RESEND_FROM_EMAIL="BloomNode <onboarding@resend.dev>"`
   - ✅ Correct: `RESEND_FROM_EMAIL=BloomNode <onboarding@resend.dev>`

3. **Not redeploying**: After adding variables, you MUST redeploy for changes to take effect

4. **Wrong API key format**: 
   - Resend keys start with `re_`
   - SendGrid keys start with `SG.`
   - Gemini keys start with `AIza`

---

## 🆘 Still Not Working?

1. **Check Render.com Logs** for error messages
2. **Verify API keys are valid**:
   - Test Resend: https://resend.com/docs/send-with-nodejs
   - Test SendGrid: https://app.sendgrid.com/test
   - Test Gemini: https://aistudio.google.com/apikey
3. **Check spam folder** for verification emails
4. **Verify `FRONTEND_URL`** matches your actual frontend URL exactly

---

## 📞 Quick Reference:

**Minimum Required for Your Issues:**
```
GEMINI_API_KEY=your_gemini_key_here
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=BloomNode <onboarding@resend.dev>
FRONTEND_URL=https://your-frontend-url.vercel.app
```

Add these 4 variables, redeploy, and both issues should be fixed! 🎉












































