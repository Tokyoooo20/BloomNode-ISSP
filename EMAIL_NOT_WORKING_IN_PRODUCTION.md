# 🔧 Fix: Email Not Working in Production (Render.com)

## Problem
✅ Email works locally (offline)  
❌ Email doesn't work in production (online) - no verification codes received

## Most Common Causes

### 1. ❌ Missing Environment Variables in Render.com

**Check if these are set in Render.com:**
- `RESEND_API_KEY` (if using Resend)
- `RESEND_FROM_EMAIL` (if using Resend)
- OR
- `SENDGRID_API_KEY` (if using SendGrid)
- `SENDGRID_FROM_EMAIL` (if using SendGrid)

### 2. ❌ Wrong API Key in Production

Your local `.env` has the API key, but Render.com might have:
- No API key set
- Wrong/expired API key
- Different API key than local

### 3. ❌ Email Service Not Initializing

The service might not be initializing properly in production.

---

## ✅ Step-by-Step Fix

### Step 1: Check Render.com Logs

1. Go to your Render.com dashboard
2. Click on your backend service
3. Go to **Logs** tab
4. Look for these messages:

**✅ Good signs:**
```
✅ Resend email service initialized
```
OR
```
✅ SendGrid email service initialized
```

**❌ Bad signs:**
```
WARNING: No email API key configured!
WARNING: SENDGRID_API_KEY is not set in environment variables!
❌ EMAIL CONFIGURATION ERROR: Missing: RESEND_API_KEY or SENDGRID_API_KEY
```

### Step 2: Verify Environment Variables in Render.com

1. Go to your service in Render.com
2. Click **Environment** tab
3. Check if you have these variables:

**For Resend:**
```
RESEND_API_KEY=re_your_actual_key_here
RESEND_FROM_EMAIL=BloomNode <onboarding@resend.dev>
```

**For SendGrid:**
```
SENDGRID_API_KEY=SG.your_actual_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Step 3: Add Missing Variables

If variables are missing, add them:

1. Click **Add Environment Variable**
2. Add each variable:
   - **Key**: `RESEND_API_KEY`
   - **Value**: `re_` (your actual key from resend.com/api-keys)
3. Click **Save Changes**
4. Render will automatically redeploy

### Step 4: Get Your API Key (If You Don't Have One)

**For Resend (Easier):**
1. Go to https://resend.com/api-keys
2. Sign up (free - 3,000 emails/month)
3. Click "Create API Key"
4. Copy the key (starts with `re_`)
5. Add to Render.com as `RESEND_API_KEY`

**For SendGrid:**
1. Go to https://app.sendgrid.com
2. Settings → API Keys
3. Create API Key with "Full Access"
4. Copy the key (starts with `SG.`)
5. Add to Render.com as `SENDGRID_API_KEY`

### Step 5: Test After Redeploy

1. Wait for Render to finish redeploying (2-5 minutes)
2. Check logs again - should see:
   ```
   ✅ Resend email service initialized
   ```
3. Try signing up with a test email
4. Check your email inbox (and spam folder)

---

## 🔍 Debugging: Check What's Happening

### Check Render.com Logs During Signup

When someone signs up, you should see in logs:

**✅ Success:**
```
📧 SENDING VERIFICATION EMAIL
✅ VERIFICATION EMAIL SENT SUCCESSFULLY
✅ Verification email sent successfully via resend!
```

**❌ Failure:**
```
⚠️ VERIFICATION EMAIL FAILED TO SEND
❌ EMAIL SENDING FAILED
❌ EMAIL CONFIGURATION ERROR: Missing: RESEND_API_KEY or SENDGRID_API_KEY
```

### Common Error Messages

**Error 1: "Email service not configured"**
- **Fix**: Add `RESEND_API_KEY` or `SENDGRID_API_KEY` to Render.com

**Error 2: "API Key is invalid"**
- **Fix**: Regenerate API key and update in Render.com

**Error 3: "Sender email not verified"**
- **Fix**: Verify sender email in Resend/SendGrid dashboard

---

## 📋 Quick Checklist

- [ ] `RESEND_API_KEY` is set in Render.com (if using Resend)
- [ ] `RESEND_FROM_EMAIL` is set in Render.com (if using Resend)
- [ ] OR `SENDGRID_API_KEY` is set in Render.com (if using SendGrid)
- [ ] OR `SENDGRID_FROM_EMAIL` is set in Render.com (if using SendGrid)
- [ ] API key is valid (not expired)
- [ ] Render.com service has been redeployed after adding variables
- [ ] Logs show "✅ Resend email service initialized" or "✅ SendGrid email service initialized"

---

## 🚀 Quick Fix (Copy-Paste for Render.com)

**If using Resend:**
```
RESEND_API_KEY=re_your_actual_key_from_resend
RESEND_FROM_EMAIL=BloomNode <onboarding@resend.dev>
```

**If using SendGrid:**
```
SENDGRID_API_KEY=SG.your_actual_key_from_sendgrid
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

---

## 💡 Why It Works Locally But Not in Production

- **Local**: Your `.env` file has the API keys
- **Production**: Render.com needs the same variables set in the Environment tab
- **Solution**: Copy the same values from your local `.env` to Render.com Environment Variables

---

## 🆘 Still Not Working?

1. **Check Render.com logs** - Look for error messages
2. **Verify API key** - Make sure it's correct and active
3. **Check spam folder** - Emails might be going to spam
4. **Test with a different email** - Some email providers block automated emails
5. **Check Resend/SendGrid dashboard** - Look for delivery status and errors

