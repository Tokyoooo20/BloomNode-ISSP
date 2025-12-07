# 🔄 Switch from Local MongoDB to MongoDB Atlas

## Problem
Your application is currently connected to **local MongoDB** (MongoDB Compass), but you need to use **MongoDB Atlas** for deployment.

## Quick Fix

### Step 1: Get Your MongoDB Atlas Connection String

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign in to your account
3. Click on **"Clusters"** in the left sidebar
4. Click **"Connect"** on your cluster
5. Choose **"Connect your application"**
6. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
7. Replace `<password>` with your database user password
8. Add your database name at the end: `?retryWrites=true&w=majority`
   - Example: `mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/bloomnode?retryWrites=true&w=majority`

### Step 2: Update Your .env File

1. Open `backend/.env` file (create it if it doesn't exist)
2. Add or update the `MONGODB_URI` line:

```env
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/bloomnode?retryWrites=true&w=majority
```

**Important:** 
- Replace `your-username` with your Atlas database username
- Replace `your-password` with your Atlas database password
- Replace `cluster0.xxxxx.mongodb.net` with your actual cluster URL
- Replace `bloomnode` with your database name (or keep it if that's your database name)

### Step 3: Verify Network Access in Atlas

1. In MongoDB Atlas, go to **"Network Access"** (left sidebar)
2. Make sure your IP is whitelisted OR add `0.0.0.0/0` to allow from anywhere
3. Click **"Add IP Address"** → **"Allow Access from Anywhere"** → **"Confirm"**

### Step 4: Restart Your Server

1. Stop your backend server (Ctrl+C)
2. Start it again: `npm start` (in the `backend` folder)
3. Check the console - you should see:
   ```
   🌐 Connecting to MongoDB Atlas...
   📦 Database: bloomnode
   ✅ Successfully connected to MongoDB!
   ✅ Using MongoDB Atlas (Cloud)
   ```

### Step 5: Verify Connection

1. Visit: `http://localhost:5000/api/health` (or your server URL)
2. You should see:
   ```json
   {
     "status": "ok",
     "mongodb": {
       "connected": true,
       "connectionType": "MongoDB Atlas (Cloud)",
       "usingAtlas": true
     }
   }
   ```

### Step 6: Test Creating an Account

1. Create a new account through your application
2. Check MongoDB Atlas → **"Browse Collections"**
3. You should see the new user in the `users` collection

## Troubleshooting

### ❌ "Authentication failed" error
- **Fix:** Double-check your username and password in the connection string
- Make sure you're using the **database user** password, not your Atlas account password

### ❌ "Connection timeout" error
- **Fix:** Check Network Access in Atlas - add `0.0.0.0/0` to allow all IPs
- Verify your internet connection

### ❌ "ENOTFOUND" or "getaddrinfo" error
- **Fix:** Check your cluster URL in the connection string
- Make sure your cluster is running (not paused)

### ❌ Still connecting to local MongoDB
- **Fix:** 
  1. Make sure your `.env` file is in the `backend` folder
  2. Restart your server after updating `.env`
  3. Check the console logs - it will show which database it's connecting to

### ❌ Data not appearing in Atlas
- **Fix:** 
  1. Check the database name in your connection string matches the database in Atlas
  2. Verify the connection is actually to Atlas (check `/api/health` endpoint)
  3. Make sure you're looking at the correct database in Atlas

## Verify Current Connection

You can check which database you're connected to by:

1. **Check server logs** when starting:
   - `🌐 Connecting to MongoDB Atlas...` = Atlas ✅
   - `⚠️ WARNING: Connecting to LOCAL MongoDB` = Local ❌

2. **Visit health endpoint**: `http://localhost:5000/api/health`
   - Look for `"usingAtlas": true` = Atlas ✅
   - Look for `"usingLocal": true` = Local ❌

## After Switching to Atlas

✅ Your data will now be saved to MongoDB Atlas (cloud)
✅ You can deploy your application and it will use Atlas
✅ You can access your data from anywhere
✅ Your data is backed up automatically by Atlas

---

**Need Help?**
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- Check server logs for detailed error messages
- Visit `/api/health` endpoint to see connection status

