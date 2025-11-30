# ⚡ Quick Migration: Compass → Atlas

## TL;DR - Fastest Way

### 1. Export from Compass (5 min)
- Open MongoDB Compass
- For each collection → Click "Export Collection" → Save as JSON
- Collections to export: `users`, `issps`, `requests`, `notifications`, etc.

### 2. Create Atlas Account (5 min)
- Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Sign up FREE
- Create FREE cluster (M0)
- Create database user (save password!)
- Allow IP: `0.0.0.0/0` (anywhere)

### 3. Get Connection String (2 min)
- Click "Connect" on cluster
- Choose "Connect your application"
- Copy string, replace `<username>` and `<password>`
- Add database name: `/bloomnode?retryWrites=true&w=majority`
- **Save this string!**

### 4. Import to Atlas (5 min)
- Open Compass → Connect to Atlas (use connection string)
- For each exported file → "Add Data" → "Import File"
- Import all collections

### 5. Verify (2 min)
- Check data in Atlas Compass
- Update local `.env` with Atlas connection string
- Test your app locally
- If working → Ready to deploy!

---

## Total Time: ~20 minutes

**Then proceed with deployment!** 🚀

See `MONGODB_MIGRATION_GUIDE.md` for detailed steps.

