# 🛠️ Development Mode (Email Issues Workaround)

## ⚠️ Current Situation

Your Resend API is having connection issues. Instead of blocking development, I've added **Development Mode** that lets you test everything without working emails!

---

## ✅ Quick Fix: Enable Development Mode

Add this to your `backend/.env` file:

```env
NODE_ENV=development
```

Your `.env` should now look like:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/bloomnode

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Node Environment
NODE_ENV=development

# Resend Email Configuration (not working yet - but that's okay!)
RESEND_API_KEY=re_WJ6eaCaL_76KD4t5N9UdQfU5K5jwzzkQE
RESEND_FROM_EMAIL=BloomNode <onboarding@resend.dev>
FRONTEND_URL=http://localhost:3000
```

---

## 🎯 What Development Mode Does

### 1. **Email Verification (Signup)**
Instead of sending emails, the verification code is:
- ✅ Printed in the console
- ✅ Still saved to database
- ✅ Works exactly the same, just no email

**What you'll see in console:**
```
⚠️  DEVELOPMENT MODE: Email not sent, but verification code generated.
   📧 Email: user@example.com
   🔢 Verification Code: 123456
   ⏰ Expires: 2024-01-01T10:10:00.000Z
```

### 2. **Password Reset**
Instead of sending reset emails, the reset link is:
- ✅ Printed in the console
- ✅ Returned in API response (for testing)
- ✅ Token still saved and works

**API Response includes:**
```json
{
  "message": "If an account exists with this email, you will receive a password reset link.",
  "devMode": true,
  "resetToken": "abc123...",
  "resetUrl": "http://localhost:3000/reset-password?token=abc123..."
}
```

### 3. **Resend Verification Code**
Returns the code in the response:
```json
{
  "message": "Verification code sent successfully!",
  "devMode": true,
  "code": "123456"
}
```

---

## 🧪 How to Test

### Test Signup Flow:

1. **Sign up** a new user
2. **Check the backend console** - you'll see:
   ```
   ⚠️  DEVELOPMENT MODE: Email not sent, but verification code generated.
      📧 Email: test@example.com
      🔢 Verification Code: 123456
   ```
3. **Copy the code** from console
4. **Enter it** in the verification page
5. ✅ Works perfectly!

### Test Password Reset Flow:

1. **Click "Forgot password?"**
2. **Enter your email**
3. **Check the backend console** - you'll see:
   ```
   ⚠️  DEVELOPMENT MODE: Email not sent, but reset token saved.
      Reset URL: http://localhost:3000/reset-password?token=abc123...
   ```
4. **Copy the reset URL** from console
5. **Paste it** in your browser
6. ✅ Set new password!

**OR** check the API response (in browser dev tools):
```json
{
  "resetUrl": "http://localhost:3000/reset-password?token=abc123..."
}
```

---

## 📋 Step-by-Step Setup

### 1. Add NODE_ENV to .env
```bash
cd backend
# Edit .env file and add:
NODE_ENV=development
```

### 2. Restart Server
```bash
npm start
```

### 3. Test Signup
```bash
# Open frontend
cd ../Client
npm start
```

Go to http://localhost:3000/signup and create account.

### 4. Check Console
Look at your **backend terminal** for the verification code!

---

## 🎓 Example Development Workflow

### Scenario: Testing Signup

**Step 1 - Sign Up:**
```
Frontend: User fills form → Submits
```

**Step 2 - Backend Console Shows:**
```
⚠️  DEVELOPMENT MODE: Email not sent, but verification code generated.
   📧 Email: john@test.com
   🔢 Verification Code: 856234
   ⏰ Expires: 2024-01-01T15:30:00.000Z
```

**Step 3 - Verify:**
```
Frontend: User enters code 856234
Backend: Code verified ✅
Frontend: Redirects to login
```

**Perfect!** No email needed! 🎉

---

## 🔧 When to Fix Resend API

Development mode is great for testing, but for production you'll want working emails.

### To Fix Resend API (Later):

1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. **Delete** old API key
3. **Create** new API key
4. **Copy** the new key
5. **Update** `backend/.env`:
   ```env
   RESEND_API_KEY=re_your_new_key_here
   ```
6. **Change** to production mode:
   ```env
   NODE_ENV=production
   ```
7. **Restart** server

---

## ⚡ Benefits of Development Mode

- ✅ **Keep developing** without email working
- ✅ **Test all features** manually
- ✅ **No blocking issues** - development continues
- ✅ **Easy debugging** - see codes in console
- ✅ **Fast testing** - no need to check email
- ✅ **Works offline** - no API required

---

## 🚀 Quick Commands

### Restart Backend:
```bash
cd backend
# Stop current server (Ctrl+C)
npm start
```

### Watch Backend Logs:
```bash
# Logs will show verification codes and reset URLs
```

### Test API Directly:
```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "unit": "IT",
    "username": "testuser",
    "email": "test@test.com",
    "password": "TestPassword123!"
  }'
# Then check backend console for code!

# Forgot Password
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com"}'
# Check response for resetUrl OR backend console
```

---

## 📝 Summary

**Problem:** Resend API not working

**Solution:** Development Mode
- Add `NODE_ENV=development` to .env
- Restart server
- Check console for codes/links
- Everything works without emails!

**Later:** Fix Resend API key when ready

---

## 🎯 Current Status

✅ **Email Verification** - Works (console output)  
✅ **Password Reset** - Works (console output)  
✅ **Account Approval** - Works (admin doesn't need email)  
✅ **All Features** - Fully testable  

**You can continue development normally!** 🚀

---

## 💡 Pro Tips

1. **Keep backend console visible** - You'll see codes there
2. **Copy codes quickly** - They expire in 10 minutes
3. **Use browser dev tools** - Check API responses for reset URLs
4. **Test thoroughly** - Make sure everything works before production
5. **Fix email later** - Not blocking for development!

---

**Happy coding!** 🎉 Your app works perfectly in development mode!

