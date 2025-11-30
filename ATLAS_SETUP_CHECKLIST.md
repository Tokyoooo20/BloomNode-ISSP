# ✅ MongoDB Atlas Setup Checklist

## Quick Checklist

### Account & Cluster
- [ ] Created MongoDB Atlas account
- [ ] Created FREE cluster (M0 Sandbox)
- [ ] Cluster is created and running

### Database Access
- [ ] Created database user
- [ ] Saved username: ________________
- [ ] Saved password: ________________

### Network Access
- [ ] Added IP address: `0.0.0.0/0` (Allow from anywhere)
- [ ] Network access confirmed

### Connection String
- [ ] Got connection string from Atlas
- [ ] Replaced `<username>` with: ________________
- [ ] Replaced `<password>` with: ________________
- [ ] Added database name: `/bloomnode?retryWrites=true&w=majority`
- [ ] Saved connection string: ________________

### Data Import
- [ ] Imported `auditlogs.json`
- [ ] Imported `users.json`
- [ ] Imported `issps.json`
- [ ] Imported `requests.json`
- [ ] Imported `notifications.json`
- [ ] Imported `pendingusers.json` (if exists)
- [ ] Verified data in Atlas

### Ready for Deployment
- [ ] All data imported
- [ ] Connection string ready
- [ ] Ready to deploy to Render.com!

---

## Your Connection String Format

```
mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/bloomnode?retryWrites=true&w=majority
```

Replace:
- `YOUR_USERNAME` → Your database username
- `YOUR_PASSWORD` → Your database password
- `cluster0.xxxxx` → Your actual cluster address

---

## Need Help?

- **Atlas Dashboard**: https://cloud.mongodb.com
- **Connection Help**: Check Step 5 in the guide
- **Import Issues**: Try using MongoDB Compass method

