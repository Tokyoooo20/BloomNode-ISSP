# 📦 MongoDB Migration Guide: Compass → Atlas

Since you're currently using **MongoDB Compass** (local database), you need to migrate to **MongoDB Atlas** (cloud) for deployment.

---

## Why Migrate?

- ✅ **Render.com/Vercel** are cloud platforms - they can't access your local database
- ✅ **MongoDB Atlas** is the cloud version that works with cloud deployments
- ✅ **Free tier available** - Same as local, but accessible from anywhere
- ✅ **Better for production** - Automatic backups, scaling, security

---

## Step 1: Export Data from MongoDB Compass (Local)

### Option A: Using MongoDB Compass Export Feature

1. **Open MongoDB Compass**
2. **Connect to your local database** (usually `mongodb://localhost:27017`)
3. **Select your database** (check what database name you're using)
4. **For each collection:**
   - Click on the collection name
   - Click the **"Export Collection"** button (top right)
   - Choose format: **JSON** or **CSV**
   - Save the file (e.g., `users.json`, `issps.json`, `requests.json`)

### Option B: Using Command Line (mongodump)

If you have MongoDB tools installed:

```bash
# Export entire database
mongodump --uri="mongodb://localhost:27017" --db=your_database_name --out=./backup

# This creates a folder with all your collections
```

### Option C: Using MongoDB Compass Aggregation

1. In Compass, go to your collection
2. Click **"Aggregations"** tab
3. Use this pipeline to export:
   ```json
   [
     { $match: {} }
   ]
   ```
4. Click **"Export Results"** → Save as JSON

---

## Step 2: Create MongoDB Atlas Account

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Try Free"** → Sign up (free account)
3. Complete registration

---

## Step 3: Create Atlas Cluster

1. **Choose FREE tier** (M0 Sandbox)
2. **Select cloud provider**: AWS (recommended)
3. **Choose region**: Closest to you
4. **Cluster name**: `BloomNode-Cluster` (or any name)
5. Click **"Create Cluster"** (takes 3-5 minutes)

---

## Step 4: Set Up Database Access

1. Go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. **Username**: `bloomnode-admin` (or your choice)
5. **Password**: Create a strong password (SAVE THIS!)
6. **Database User Privileges**: **Read and write to any database**
7. Click **"Add User"**

---

## Step 5: Configure Network Access

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for Render.com)
   - This adds `0.0.0.0/0` (allows all IPs)
4. Click **"Confirm"**

---

## Step 6: Get Connection String

1. Go to **"Clusters"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. **Driver**: Node.js
5. **Version**: 5.5 or later
6. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. **Replace placeholders:**
   - `<username>` → Your database username (e.g., `bloomnode-admin`)
   - `<password>` → Your database password
   - Add database name: `/?retryWrites=true&w=majority` → `/bloomnode?retryWrites=true&w=majority`
   
   **Final format:**
   ```
   mongodb+srv://bloomnode-admin:yourpassword@cluster0.xxxxx.mongodb.net/bloomnode?retryWrites=true&w=majority
   ```
8. **Save this connection string** - You'll need it for Render.com!

---

## Step 7: Import Data to Atlas

### Option A: Using MongoDB Compass (Easiest)

1. **Get Atlas connection string** (from Step 6)
2. **Open MongoDB Compass**
3. **Connect to Atlas:**
   - Click "New Connection"
   - Paste your Atlas connection string
   - Click "Connect"
4. **For each collection you exported:**
   - Click on your database in Atlas
   - Click "Add Data" → "Import File"
   - Select your exported JSON file
   - Choose collection name (same as before)
   - Click "Import"

### Option B: Using Command Line (mongoimport)

If you exported using mongodump:

```bash
# Import entire database
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/bloomnode" ./backup/your_database_name
```

Or for individual collections:

```bash
# Import single collection
mongoimport --uri="mongodb+srv://username:password@cluster.mongodb.net/bloomnode" --collection=users --file=users.json
```

### Option C: Using Atlas Data Import (Web UI)

1. In Atlas dashboard, go to your cluster
2. Click **"Browse Collections"**
3. Click **"Add My Own Data"**
4. **Database name**: `bloomnode` (or your database name)
5. **Collection name**: Enter collection name
6. Click **"Create"**
7. Click **"Insert Document"** → Paste JSON data
8. Or use **"Import File"** if you have JSON files

---

## Step 8: Verify Data Migration

1. **In MongoDB Compass**, connect to Atlas
2. **Check each collection:**
   - Count documents (should match local)
   - Spot check a few documents
   - Verify data looks correct

3. **Test connection from your app:**
   - Update your local `.env` file temporarily:
     ```
     MONGODB_URI=your_atlas_connection_string
     ```
   - Restart your backend
   - Test if data loads correctly
   - If working, you're ready to deploy!

---

## Collections to Migrate

Based on your codebase, you likely have these collections:

- ✅ `users` - User accounts
- ✅ `issps` - ISSP documents
- ✅ `requests` - User requests
- ✅ `notifications` - Notifications
- ✅ `auditlogs` - Audit logs (optional)
- ✅ `pendingusers` - Pending user approvals

**Export and import each one!**

---

## Quick Checklist

- [ ] Exported all collections from local MongoDB Compass
- [ ] Created MongoDB Atlas account
- [ ] Created FREE cluster
- [ ] Created database user (saved credentials)
- [ ] Whitelisted IP (Allow from anywhere)
- [ ] Got connection string (saved it)
- [ ] Imported all collections to Atlas
- [ ] Verified data in Atlas
- [ ] Tested connection from local app
- [ ] Ready to deploy!

---

## Troubleshooting

### "Connection refused" error
- Check Network Access in Atlas (should allow `0.0.0.0/0`)
- Verify username/password in connection string

### "Authentication failed" error
- Check database user credentials
- Verify user has "Read and write" permissions

### Data not showing in Atlas
- Check database name in connection string
- Verify collections were imported correctly
- Check if you're looking at the right database

### Import errors
- Make sure JSON format is correct
- Check for special characters in data
- Try importing one collection at a time

---

## After Migration

Once data is in Atlas:

1. ✅ **Update local `.env`** (for testing):
   ```
   MONGODB_URI=your_atlas_connection_string
   ```

2. ✅ **Use Atlas connection string in Render.com** (for deployment)

3. ✅ **Keep local MongoDB** (optional - for development)

4. ✅ **You can now deploy!** Follow `DEPLOYMENT_GUIDE.md`

---

## Need Help?

- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Compass Export Guide**: https://www.mongodb.com/docs/compass/current/import-export/
- **Connection String Help**: Check Step 6 above

---

**Once migration is complete, proceed with deployment! 🚀**

