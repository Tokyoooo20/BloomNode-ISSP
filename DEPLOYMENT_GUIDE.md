# 🚀 BloomNode Deployment Guide

Complete step-by-step guide to deploy your BloomNode application to production.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup (MongoDB Atlas)](#database-setup)
3. [Backend Deployment (Render.com)](#backend-deployment)
4. [Frontend Deployment (Vercel)](#frontend-deployment)
5. [Connecting Everything](#connecting-everything)
6. [Testing Your Deployment](#testing-your-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, make sure you have:
- ✅ GitHub account (free)
- ✅ Vercel account (free) - Sign up at [vercel.com](https://vercel.com)
- ✅ Render.com account (free) - Sign up at [render.com](https://render.com)
- ✅ MongoDB Atlas account (free) - Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- ✅ Your code pushed to a GitHub repository

---

## Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Try Free" and sign up
3. Complete the registration

### Step 2: Create a Cluster
1. Choose **FREE** tier (M0 Sandbox)
2. Select a cloud provider (AWS recommended)
3. Choose a region closest to you
4. Click "Create Cluster" (takes 3-5 minutes)

### Step 3: Create Database User
1. Go to **Database Access** (left sidebar)
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `bloomnode-admin` (or your choice)
5. Password: Generate a strong password (save it!)
6. Database User Privileges: **Read and write to any database**
7. Click "Add User"

### Step 4: Whitelist IP Address
1. Go to **Network Access** (left sidebar)
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for Render.com)
   - Or add specific IPs: `0.0.0.0/0`
4. Click "Confirm"

### Step 5: Get Connection String
1. Go to **Clusters** (left sidebar)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster.mongodb.net/`
5. Replace `<password>` with your database user password
6. Add database name at the end: `?retryWrites=true&w=majority`
   - Final format: `mongodb+srv://username:password@cluster.mongodb.net/bloomnode?retryWrites=true&w=majority`
7. **Save this connection string** - you'll need it for Render.com

---

## Backend Deployment (Render.com)

### Step 1: Push Code to GitHub
1. If not already done, push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/bloomnode.git
   git push -u origin main
   ```

### Step 2: Create Render.com Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended)
3. Authorize Render to access your repositories

### Step 3: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the `BloomNode` repository
4. Configure the service:
   - **Name**: `bloomnode-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (or upgrade if needed)

### Step 4: Set Environment Variables
In Render.com dashboard, go to **Environment** tab and add:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_connection_string_from_atlas
JWT_SECRET=generate_a_long_random_string_here
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com
```

**How to generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**How to get Resend API Key:**
1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. Go to API Keys section
4. Create new API key
5. Copy and paste into Render.com

### Step 5: Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Once deployed, you'll get a URL like: `https://bloomnode-backend.onrender.com`
4. **Save this URL** - you'll need it for frontend

### Step 6: Test Backend
1. Visit your backend URL: `https://bloomnode-backend.onrender.com`
2. You should see: `{"message":"BloomNode Backend API is running!"}`
3. If you see this, backend is working! ✅

**Note:** Free tier spins down after 15 min inactivity. First request may take 30-60 seconds.

---

## Frontend Deployment (Vercel)

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access your repositories

### Step 2: Import Project
1. Click "Add New..." → "Project"
2. Import your `BloomNode` repository
3. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `Client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

### Step 3: Set Environment Variables
In Vercel dashboard, go to **Settings** → **Environment Variables**:

```
REACT_APP_API_URL=https://bloomnode-backend.onrender.com
```

**Important:** Replace with your actual Render.com backend URL!

### Step 4: Deploy
1. Click "Deploy"
2. Wait for build (2-5 minutes)
3. Once deployed, you'll get a URL like: `https://bloomnode.vercel.app`
4. **This is your live application URL!** 🎉

### Step 5: Test Frontend
1. Visit your Vercel URL
2. You should see the login page
3. Try logging in (if you have test accounts)

---

## Connecting Everything

### Update CORS in Backend (if needed)
If you get CORS errors, update `backend/server.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-url.vercel.app'
  ],
  credentials: true
}));
```

### Update Frontend API URL
Make sure your Vercel environment variable `REACT_APP_API_URL` points to your Render.com backend URL.

---

## Testing Your Deployment

### 1. Test Backend API
```bash
curl https://your-backend-url.onrender.com
```
Should return: `{"message":"BloomNode Backend API is running!"}`

### 2. Test Frontend
- Visit your Vercel URL
- Try to sign up a new user
- Check if emails are sent (check Resend dashboard)
- Try logging in

### 3. Test Database Connection
- Check Render.com logs for MongoDB connection messages
- Should see: "Connected to MongoDB"

---

## Troubleshooting

### Backend Issues

**Problem:** Backend won't start
- **Solution:** Check Render.com logs for errors
- Verify all environment variables are set correctly
- Check MongoDB connection string format

**Problem:** MongoDB connection fails
- **Solution:** 
  - Verify IP whitelist includes `0.0.0.0/0`
  - Check username/password in connection string
  - Verify database user has correct permissions

**Problem:** Backend spins down
- **Solution:** This is normal for free tier. First request after inactivity takes 30-60 seconds.

### Frontend Issues

**Problem:** Can't connect to backend
- **Solution:**
  - Verify `REACT_APP_API_URL` in Vercel environment variables
  - Check CORS settings in backend
  - Ensure backend URL doesn't have trailing slash

**Problem:** Build fails
- **Solution:**
  - Check Vercel build logs
  - Verify all dependencies are in `package.json`
  - Ensure `build` script exists in `package.json`

### General Issues

**Problem:** Environment variables not working
- **Solution:**
  - Restart deployment after adding env vars
  - For Vercel: Redeploy after adding env vars
  - For Render: Service restarts automatically

**Problem:** File uploads not working
- **Solution:**
  - Render.com free tier has limited storage
  - Consider using cloud storage (AWS S3, Cloudinary) for production

---

## Post-Deployment Checklist

- [ ] Backend is accessible and responding
- [ ] Frontend loads correctly
- [ ] Database connection is working
- [ ] User signup works
- [ ] Email verification works
- [ ] Login works
- [ ] File uploads work (if applicable)
- [ ] All API endpoints are accessible
- [ ] CORS is configured correctly

---

## Updating Your Deployment

### To update backend:
1. Push changes to GitHub
2. Render.com auto-deploys (or manually trigger in dashboard)

### To update frontend:
1. Push changes to GitHub
2. Vercel auto-deploys (or manually trigger in dashboard)

---

## Cost Summary

- **MongoDB Atlas**: FREE (512MB storage)
- **Render.com Backend**: FREE (with spin-down) or $7/month (always-on)
- **Vercel Frontend**: FREE
- **Resend Email**: FREE (100 emails/day) or $20/month (more)
- **Total**: **$0/month** (free tier) or **~$27/month** (production tier)

---

## Support

If you encounter issues:
1. Check the logs in Render.com and Vercel dashboards
2. Verify all environment variables are set correctly
3. Test API endpoints individually
4. Check MongoDB Atlas connection status

---

## Next Steps

1. ✅ Set up custom domain (optional)
2. ✅ Configure email templates
3. ✅ Set up monitoring/analytics
4. ✅ Configure backups
5. ✅ Set up CI/CD pipelines

---

**Congratulations! Your BloomNode application is now live! 🎉**

Your URLs:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.onrender.com`

Share your frontend URL with users to access the system!

