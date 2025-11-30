# 🚀 Quick Deployment Steps

## Overview
- **Frontend**: Vercel (FREE)
- **Backend**: Render.com (FREE)
- **Database**: MongoDB Atlas (FREE)
- **Total Cost**: $0/month

---

## Step 1: Setup MongoDB Atlas (5 minutes)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Sign up FREE
2. Create cluster → Choose FREE tier (M0)
3. Database Access → Add user (save username/password!)
4. Network Access → Allow from anywhere (`0.0.0.0/0`)
5. Get connection string → Replace `<password>` with your password
6. **Save connection string** - you'll need it!

---

## Step 2: Deploy Backend to Render.com (10 minutes)

1. Push code to GitHub (if not already)
2. Go to [render.com](https://render.com) → Sign up with GitHub
3. New → Web Service → Connect your repo
4. Configure:
   - **Name**: `bloomnode-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your_connection_string_from_atlas
   JWT_SECRET=generate_random_string_here
   RESEND_API_KEY=your_resend_key
   FROM_EMAIL=noreply@yourdomain.com
   ```
6. Deploy → Wait 5-10 minutes
7. **Save backend URL** (e.g., `https://bloomnode-backend.onrender.com`)

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 3: Deploy Frontend to Vercel (5 minutes)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Add New Project → Import your repo
3. Configure:
   - **Framework**: Create React App
   - **Root Directory**: `Client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. Add Environment Variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```
   (Replace with your actual Render.com backend URL!)
5. Deploy → Wait 2-5 minutes
6. **Your app is live!** 🎉

---

## Step 4: Test Everything

1. Visit your Vercel URL
2. Try signing up a new user
3. Check email (Resend dashboard)
4. Try logging in
5. Test all features

---

## Important Notes

### Backend Free Tier Limitations:
- Spins down after 15 min inactivity
- First request after spin-down: 30-60 seconds
- This is normal! Subsequent requests are fast.

### To Fix CORS (if needed):
Update `backend/server.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend.vercel.app'
  ],
  credentials: true
}));
```

### Updating Your App:
- Push to GitHub → Auto-deploys on both platforms!

---

## Troubleshooting

**Backend won't start?**
- Check Render.com logs
- Verify all environment variables are set

**Frontend can't connect?**
- Verify `REACT_APP_API_URL` in Vercel
- Check backend URL has no trailing slash

**MongoDB connection fails?**
- Check IP whitelist includes `0.0.0.0/0`
- Verify connection string format

---

## Your URLs

After deployment, you'll have:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`

Share the frontend URL with users! 🚀

---

For detailed instructions, see `DEPLOYMENT_GUIDE.md`

