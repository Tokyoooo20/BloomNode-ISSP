# 🔧 Fix Resend API Error

## Error You're Seeing:

```
Resend API Error: {
  name: 'application_error',
  statusCode: null,
  message: 'Unable to fetch data. The request could not be resolved.'
}
```

## 🎯 What This Means:

This error typically indicates:
1. ❌ **Invalid or expired API key** (most common)
2. ❌ **Network connectivity issue**
3. ❌ **Resend service temporary issue**

---

## ✅ Solution: Regenerate Your API Key

### Step 1: Get a Fresh API Key

1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. Log in to your Resend account
3. **Delete the old API key** (optional but recommended)
4. Click **"Create API Key"**
5. Name it: "BloomNode"
6. Select **"Sending access"** permission
7. Click **"Add"**
8. **Copy the new key immediately** (it starts with `re_`)

### Step 2: Update Your .env File

Open `backend/.env` and replace the old API key:

```env
RESEND_API_KEY=re_your_NEW_api_key_here
RESEND_FROM_EMAIL=BloomNode <onboarding@resend.dev>
FRONTEND_URL=http://localhost:3000
```

### Step 3: Restart Your Server

Stop the current server (Ctrl+C) and restart:

```bash
cd backend
npm start
```

---

## 🧪 Test Your Connection

I've added a test endpoint! After restarting, visit:

```
http://localhost:5000/api/test/test-resend
```

Or use curl:

```bash
curl http://localhost:5000/api/test/test-resend
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Resend API is working correctly!",
  "messageId": "abc123...",
  "apiKeyPreview": "re_1234567...",
  "fromEmail": "BloomNode <onboarding@resend.dev>"
}
```

**If Still Failed:**
```json
{
  "success": false,
  "error": "...",
  "troubleshooting": [
    "Check if your API key is valid",
    "Regenerate your API key at resend.com/api-keys",
    "Verify your internet connection",
    "Check Resend service status"
  ]
}
```

---

## 🔍 Additional Diagnostics

### Check Your .env File

Make sure your `.env` file has all required variables:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/bloomnode

# JWT
JWT_SECRET=your_jwt_secret_here

# Resend Email (THIS IS THE IMPORTANT PART)
RESEND_API_KEY=re_your_actual_key_here
RESEND_FROM_EMAIL=BloomNode <onboarding@resend.dev>
FRONTEND_URL=http://localhost:3000
```

### Verify API Key Format

Your API key should:
- ✅ Start with `re_`
- ✅ Be about 30-40 characters long
- ✅ Contain letters and numbers
- ❌ Not have any spaces
- ❌ Not have quotes around it

**Example (fake):**
```
RESEND_API_KEY=re_2SQh8Kb9_3a4D8gFjM4eY7wPqT6mN1Vx
```

---

## 🚨 Common Mistakes

### Mistake 1: Old/Expired API Key
**Problem:** The key you're using was created days ago and might be expired or revoked.

**Solution:** Generate a brand new API key.

### Mistake 2: Quotes in .env File
**Wrong:**
```env
RESEND_API_KEY="re_your_key_here"
```

**Correct:**
```env
RESEND_API_KEY=re_your_key_here
```

### Mistake 3: Extra Spaces
**Wrong:**
```env
RESEND_API_KEY= re_your_key_here
RESEND_API_KEY=re_your_key_here 
```

**Correct:**
```env
RESEND_API_KEY=re_your_key_here
```

### Mistake 4: Wrong Key Type
Make sure you created a key with **"Sending access"** permission, not "Full access" (though full access should work too).

---

## 🔄 Step-by-Step Fix Checklist

- [ ] 1. Go to resend.com/api-keys
- [ ] 2. Delete old API key (if exists)
- [ ] 3. Create new API key with "Sending access"
- [ ] 4. Copy the new key (starts with `re_`)
- [ ] 5. Open `backend/.env` file
- [ ] 6. Replace RESEND_API_KEY with new key (no quotes, no spaces)
- [ ] 7. Save the file
- [ ] 8. Stop server (Ctrl+C)
- [ ] 9. Restart server (`npm start`)
- [ ] 10. Test with: `http://localhost:5000/api/test/test-resend`

---

## 📞 Still Not Working?

### Check Network Connection
```bash
ping resend.com
```

### Check Resend Status
Visit: [status.resend.com](https://status.resend.com)

### Try With Curl (Direct Test)
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "delivered@resend.dev",
    "subject": "Test",
    "html": "<p>Test email</p>"
  }'
```

If this works, the issue is in your .env configuration.

---

## 💡 Quick Fix Summary

**Most likely cause:** Your API key is invalid or expired.

**Quick fix:**
1. Go to resend.com/api-keys
2. Generate new API key
3. Update `backend/.env`
4. Restart server
5. Test with: http://localhost:5000/api/test/test-resend

---

## ✅ After Fixing

Once your test endpoint returns success, try:
1. **Sign up** with a new account
2. **Check email** for verification code
3. **Forgot password** flow
4. **Reset password** email

All should work perfectly! 🎉

---

Need more help? Check:
- Resend Documentation: [resend.com/docs](https://resend.com/docs)
- Resend Support: support@resend.com

