# Portainer Deployment - Quick Start

Deploy Portainer Updater with Diun integration on your NAS in ~10 minutes.

## TL;DR

```bash
# On your NAS (via SSH)
cd /volume2/docker/
git clone <your-repo-url> tools.smnd.xyz
cd tools.smnd.xyz
./apps/portainer/build-images.sh

mkdir -p /volume2/docker/portainer-updater/data
cp apps/portainer/config.example.json /volume2/docker/portainer-updater/config.json
nano /volume2/docker/portainer-updater/config.json  # Edit with your values

# Then in Portainer UI:
# Stacks → Add stack → Copy/paste portainer-stack.yml → Deploy
```

## Step-by-Step

### 1️⃣ Prepare NAS (5 min)

SSH into your NAS:

```bash
# Clone repository
cd /volume2/docker/
git clone <your-repo-url> tools.smnd.xyz
cd tools.smnd.xyz

# Build Docker images
./apps/portainer/build-images.sh

# Wait ~3-5 minutes for build to complete
# You should see: ✅ Backend image built successfully
#                 ✅ Frontend image built successfully
```

### 2️⃣ Create Configuration (2 min)

```bash
# Create config directory
mkdir -p /volume2/docker/portainer-updater/data

# Copy example config
cp apps/portainer/config.example.json /volume2/docker/portainer-updater/config.json

# Edit config
nano /volume2/docker/portainer-updater/config.json
```

**Update these fields:**

```json
{
  "pin": "GENERATE_THIS",
  "backend_url": "http://portainer-updater-backend:3000",
  "webhooks": [
    {
      "name": "Your Container",
      "image": "nginx:latest",
      "container_name": "nginx",
      "webhook_url": "https://your-portainer/api/webhooks/YOUR-WEBHOOK-ID"
    }
  ]
}
```

**Generate PIN hash:**
```bash
echo -n "yourpin123" | shasum -a 256
# Copy output to "pin" field
```

**Get webhook URLs from Portainer:**
1. Open Portainer → Containers
2. Click container → Webhook
3. Copy webhook URL

### 3️⃣ Deploy Stack in Portainer (2 min)

1. **Open Portainer** web UI
2. Go to **Stacks** (left sidebar)
3. Click **+ Add stack**
4. **Name**: `portainer-updater`
5. **Build method**: Web editor
6. **Copy/paste** from `apps/portainer/portainer-stack.yml`
7. **Update paths** in YAML:
   - Change `/volume2/docker/portainer-updater/` to your actual path
   - Change port `7890` if needed
8. Click **Deploy the stack**

Wait ~30 seconds for containers to start.

### 4️⃣ Test Access (1 min)

Open browser: `http://your-nas-ip:7890`

You should see:
- Login screen
- Enter your PIN
- See "Auto-Detected" and "Manual Webhooks" tabs

### 5️⃣ Configure Diun (Optional - if you have Diun)

**If Diun is a Stack:**

1. Go to **Stacks** → Your Diun stack → **Editor**
2. Add to Diun service:
   ```yaml
   environment:
     - DIUN_NOTIF_WEBHOOK_ENDPOINT=http://portainer-updater-backend:3000/api/diun/webhook
     - DIUN_NOTIF_WEBHOOK_METHOD=POST
   networks:
     - portainer-updater-net

   networks:
     portainer-updater-net:
       external: true
       name: portainer-updater-net
   ```
3. **Update the stack**

**If Diun is a Container:**

1. Go to **Containers** → Diun → **Duplicate/Edit**
2. Add environment variables:
   - `DIUN_NOTIF_WEBHOOK_ENDPOINT` = `http://portainer-updater-backend:3000/api/diun/webhook`
   - `DIUN_NOTIF_WEBHOOK_METHOD` = `POST`
3. Add network: `portainer-updater-net`
4. **Deploy the container**

## Verification

### Check Backend Health

In Portainer:
1. **Containers** → `portainer-updater-backend` → **Console** → Connect
2. Run: `curl http://localhost:3000/health`
3. Should return: `{"status":"ok",...}`

### Check Frontend

1. Browser: `http://nas-ip:7890`
2. Login with PIN
3. Should see interface with tabs

### Check Diun Integration

Send test webhook:
```bash
docker exec -it portainer-updater-backend sh -c '
curl -X POST http://localhost:3000/api/diun/webhook \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"nginx:latest\",\"digest\":\"sha256:test\"}"
'
```

Refresh web UI → Auto-Detected tab → Should see nginx update

## Troubleshooting

### Build fails on NAS

**Check Docker version:**
```bash
docker --version
# Should be 20.10+
```

**Check disk space:**
```bash
df -h /volume2
# Need at least 2GB free
```

### Can't access web UI

**Check port:**
```bash
netstat -tuln | grep 7890
# Should show LISTEN
```

**Check firewall:**
- Synology: Control Panel → Security → Firewall → Allow port 7890
- QNAP: Security → Firewall → Add rule for port 7890

**Try different port:**
Edit stack YAML: `- "8080:80"` and update stack

### No updates showing

**Check Diun is connected:**
```bash
docker network inspect portainer-updater-net
# Should show Diun container
```

**Check backend logs:**
```bash
docker logs portainer-updater-backend | grep webhook
# Should show webhook receipts when Diun sends them
```

### Image names don't match

**Check what Diun sees:**
```bash
docker logs diun | grep "image:" | tail -5
```

**Match exactly in config.json:**
```json
"image": "library/nginx:latest"  // Use exact name from Diun logs
```

## File Structure on NAS

After deployment:
```
/volume2/docker/
├── tools.smnd.xyz/           # Git repository
│   └── apps/portainer/       # Source code
└── portainer-updater/        # Runtime data
    ├── config.json           # Configuration
    └── data/                 # SQLite database
        └── updates.db        # Created automatically
```

## Common NAS Paths

- **Synology**: `/volume1/docker/` or `/volume2/docker/`
- **QNAP**: `/share/Container/` or `/share/docker/`
- **Unraid**: `/mnt/user/appdata/`
- **TrueNAS**: `/mnt/pool/docker/`

Update paths in `portainer-stack.yml` accordingly.

## Default Credentials

- **PIN**: Whatever you set in config.json (hash it with `shasum -a 256`)
- **Port**: 7890 (configurable in stack YAML)
- **No username** - only PIN authentication

## What's Next?

1. ✅ Add more containers to `config.json`
2. ✅ Configure Portainer webhooks for each container
3. ✅ Set up Diun to monitor your registries
4. 🔲 Set up database backups (cron job)
5. 🔲 Configure reverse proxy with HTTPS (optional)

## Backup

**Config:**
```bash
cp /volume2/docker/portainer-updater/config.json \
   /volume2/docker/portainer-updater/config.json.backup
```

**Database:**
```bash
docker stop portainer-updater-backend
cp /volume2/docker/portainer-updater/data/updates.db \
   /volume2/docker/portainer-updater/data/updates.db.backup
docker start portainer-updater-backend
```

## Updating

**Rebuild images:**
```bash
cd /volume2/docker/tools.smnd.xyz
git pull
./apps/portainer/build-images.sh
```

**Redeploy in Portainer:**
- Stacks → `portainer-updater` → **Pull and redeploy**

## Support

- Full guide: `PORTAINER_DEPLOYMENT.md`
- Diun setup: `DIUN_INTEGRATION.md`
- Backend docs: `../portainer-backend/README.md`

---

**Problems?**

1. Check container logs in Portainer
2. Verify file paths in stack YAML
3. Test backend health endpoint
4. Check network connectivity with Diun

**Still stuck?** Check the detailed guides above! ☝️
