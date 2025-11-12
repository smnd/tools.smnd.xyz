# Deploy Portainer Updater on NAS via Portainer (Legacy Method)

> ⚠️ **OUTDATED:** This guide describes building images on your NAS and deploying manually.
>
> **RECOMMENDED:** Use these guides instead:
> - [Docker Hub Workflow](../../DOCKER_HUB_WORKFLOW.md) - Build locally, deploy remotely
> - [Git Deployment](PORTAINER_GIT_DEPLOY.md) - Deploy from Git with GitOps
>
> This guide is kept for reference only.

---

This guide shows how to deploy the Portainer Updater with Diun integration directly through Portainer's web interface (legacy method requiring git and build tools on NAS).

## Prerequisites

- Portainer installed and running on your NAS
- Docker installed on your NAS
- Access to Portainer web UI
- NAS directory for configuration (e.g., `/volume2/docker/portainer-updater/`)

## Deployment Steps

### Step 1: Prepare Configuration Directory on NAS

SSH into your NAS or use File Station to create:

```bash
# Create directory structure
mkdir -p /volume2/docker/portainer-updater/data

# Create config.json
nano /volume2/docker/portainer-updater/config.json
```

**config.json** (update with your values):
```json
{
  "pin": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  "backend_url": "http://portainer-updater-backend:3000",
  "webhooks": [
    {
      "name": "Nginx Web Server",
      "type": "container",
      "stack": "web-stack",
      "image": "nginx:latest",
      "container_name": "nginx",
      "webhook_url": "https://your-portainer-url/api/webhooks/your-webhook-id-1"
    },
    {
      "name": "PostgreSQL Database",
      "type": "container",
      "stack": "database-stack",
      "image": "postgres:15",
      "container_name": "postgres",
      "webhook_url": "https://your-portainer-url/api/webhooks/your-webhook-id-2"
    }
  ]
}
```

**Generate PIN hash:**
```bash
# On your local machine or NAS
echo -n "your-pin-here" | shasum -a 256
# Copy the hash to config.json "pin" field
```

**Set permissions:**
```bash
chmod 644 /volume2/docker/portainer-updater/config.json
chmod 755 /volume2/docker/portainer-updater/data
```

### Step 2: Build Docker Images

You have two options:

#### Option A: Build on NAS (Recommended)

1. Clone/copy the repository to your NAS:
   ```bash
   cd /volume2/docker/
   git clone https://github.com/your-repo/tools.smnd.xyz.git
   cd tools.smnd.xyz
   ```

2. Build images:
   ```bash
   # Build backend
   docker build -t portainer-updater-backend:latest -f apps/portainer-backend/Dockerfile .

   # Build frontend
   docker build -t portainer-updater:latest -f apps/portainer/Dockerfile .
   ```

3. Verify images:
   ```bash
   docker images | grep portainer-updater
   ```

#### Option B: Build Locally and Push to Registry

1. Build on your local machine:
   ```bash
   docker build -t your-registry/portainer-updater-backend:latest -f apps/portainer-backend/Dockerfile .
   docker build -t your-registry/portainer-updater:latest -f apps/portainer/Dockerfile .
   ```

2. Push to your registry:
   ```bash
   docker push your-registry/portainer-updater-backend:latest
   docker push your-registry/portainer-updater:latest
   ```

3. Update stack YAML to use registry images

### Step 3: Create Portainer Stack

1. **Open Portainer** web UI
2. Navigate to **Stacks** in the left sidebar
3. Click **+ Add stack**
4. Set **Name**: `portainer-updater`
5. Choose **Web editor**
6. Paste the stack configuration below

### Step 4: Stack Configuration

Copy this into the Portainer stack editor:

```yaml
version: '3.8'

services:
  backend:
    image: portainer-updater-backend:latest
    container_name: portainer-updater-backend
    restart: unless-stopped
    volumes:
      # UPDATE THIS PATH to match your NAS
      - /volume2/docker/portainer-updater/data:/app/data
      - /volume2/docker/portainer-updater/config.json:/app/config.json:ro
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/app/data
      - CONFIG_PATH=/app/config.json
    networks:
      - portainer-updater-net
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s

  frontend:
    image: portainer-updater:latest
    container_name: portainer-updater-frontend
    restart: unless-stopped
    ports:
      - "7890:80"  # Change 7890 to your preferred port
    volumes:
      # UPDATE THIS PATH to match your NAS
      - /volume2/docker/portainer-updater/config.json:/usr/share/nginx/html/config.json:ro
    depends_on:
      - backend
    networks:
      - portainer-updater-net
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

networks:
  portainer-updater-net:
    driver: bridge
```

**Important**: Update the volume paths:
- Replace `/volume2/docker/portainer-updater/` with your actual NAS path
- If using Synology, might be `/volume1/docker/portainer-updater/`
- If using QNAP, might be `/share/Container/portainer-updater/`

### Step 5: Deploy Stack

1. **Scroll down** in the stack editor
2. Click **Deploy the stack**
3. Wait for deployment to complete
4. Check container status in **Containers** view

### Step 6: Verify Deployment

#### Check Backend Health
1. In Portainer, go to **Containers**
2. Find `portainer-updater-backend`
3. Click on it → **Quick actions** → **Console**
4. Run:
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

#### Check Frontend Access
1. Open browser: `http://your-nas-ip:7890`
2. Enter your PIN
3. Should see the updater interface

#### Check Logs
In Portainer:
1. Go to **Containers**
2. Click container name → **Logs**
3. Backend should show: `🚀 Portainer Updater Backend running on port 3000`
4. Frontend should show nginx access logs

### Step 7: Configure Diun

Now add webhook to your existing Diun stack:

#### If Diun is a Portainer Stack

1. Go to **Stacks** → Find your Diun stack
2. Click **Editor**
3. Add to Diun service:
   ```yaml
   services:
     diun:
       image: crazymax/diun:latest
       environment:
         # ... your existing config ...
         - DIUN_NOTIF_WEBHOOK_ENDPOINT=http://portainer-updater-backend:3000/api/diun/webhook
         - DIUN_NOTIF_WEBHOOK_METHOD=POST
         - DIUN_NOTIF_WEBHOOK_HEADERS_CONTENT-TYPE=application/json
         - DIUN_NOTIF_WEBHOOK_TIMEOUT=10s
       networks:
         - portainer-updater-net  # Add this network

   networks:
     portainer-updater-net:
       external: true
       name: portainer-updater_portainer-updater-net
   ```
4. Click **Update the stack**

#### If Diun is a Standalone Container

1. Go to **Containers** → Find Diun
2. Click **Duplicate/Edit**
3. Add environment variables:
   - `DIUN_NOTIF_WEBHOOK_ENDPOINT=http://portainer-updater-backend:3000/api/diun/webhook`
   - `DIUN_NOTIF_WEBHOOK_METHOD=POST`
   - `DIUN_NOTIF_WEBHOOK_HEADERS_CONTENT-TYPE=application/json`
   - `DIUN_NOTIF_WEBHOOK_TIMEOUT=10s`
4. Under **Network**, add: `portainer-updater_portainer-updater-net`
5. Click **Deploy the container**

### Step 8: Test Integration

#### Test Diun Webhook

From any container on the same network:
```bash
docker run --rm --network portainer-updater_portainer-updater-net curlimages/curl:latest \
  curl -X POST http://portainer-updater-backend:3000/api/diun/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "image": "nginx:latest",
    "digest": "sha256:test123",
    "metadata": {
      "container_name": "nginx"
    }
  }'
```

Check backend logs - should see: `Received Diun webhook: { image: 'nginx:latest', ... }`

#### Check Web UI

1. Open `http://your-nas-ip:7890`
2. Authenticate with PIN
3. Click **Auto-Detected** tab
4. Should see the test update (if nginx is in config.json)

#### Trigger Real Scan

Force Diun to check for updates:
```bash
docker exec diun diun notif test
```

Or restart a container to trigger check:
```bash
docker restart nginx
```

Wait ~30 seconds, refresh web UI - should see any available updates.

## Network Configuration

The stack creates an isolated network: `portainer-updater-net`

**Containers that need to communicate:**
- ✅ `portainer-updater-backend` - on network (automatic)
- ✅ `portainer-updater-frontend` - on network (automatic)
- ⚠️ `diun` - **must be added to network** (see Step 7)

**Network name in Portainer:**
- Stack creates: `portainer-updater_portainer-updater-net`
- Use this full name when connecting other containers

## Port Configuration

Default ports:
- **7890** - Frontend web UI (exposed to host)
- **3000** - Backend API (internal only, not exposed)

To change frontend port:
1. Edit stack YAML: `- "YOUR_PORT:80"`
2. Update the stack
3. Access UI at: `http://nas-ip:YOUR_PORT`

## Updating the Stack

### Update Configuration

1. Edit `/volume2/docker/portainer-updater/config.json` on NAS
2. Changes are picked up automatically (config is reloaded)
3. For PIN changes, users must re-authenticate

### Update Code

1. Build new images with `:latest` tag
2. In Portainer: **Stacks** → `portainer-updater` → **Pull and redeploy**
3. Or use **Re-deploy** button

### Update Stack Configuration

1. Go to **Stacks** → `portainer-updater`
2. Click **Editor**
3. Modify YAML
4. Click **Update the stack**

## Backup

### Backup Configuration
```bash
cp /volume2/docker/portainer-updater/config.json \
   /volume2/docker/portainer-updater/config.json.backup
```

### Backup Database
```bash
# Stop backend first
docker stop portainer-updater-backend

# Copy database
cp /volume2/docker/portainer-updater/data/updates.db \
   /volume2/docker/portainer-updater/data/updates.db.backup

# Start backend
docker start portainer-updater-backend
```

Or create automated backup with Synology Task Scheduler / QNAP cron.

## Troubleshooting

### Containers won't start

**Check logs in Portainer:**
1. Go to **Containers**
2. Click container → **Logs**
3. Look for error messages

**Common issues:**
- Volume paths don't exist → Create directories on NAS
- config.json not found → Check path in volumes section
- Permission denied → Run `chmod 755` on data directory

### Can't access web UI

**Check firewall:**
```bash
# Synology
sudo iptables -L -n | grep 7890

# QNAP
# Check firewall in web UI
```

**Check port is listening:**
```bash
netstat -tuln | grep 7890
```

**Try different port:**
1. Edit stack YAML
2. Change `- "7890:80"` to `- "8080:80"`
3. Update stack

### Updates not showing

**Check Diun is on correct network:**
```bash
docker inspect diun | grep -A 10 Networks
# Should show: portainer-updater_portainer-updater-net
```

**Check backend logs:**
```bash
docker logs portainer-updater-backend | grep webhook
```

**Test connectivity:**
```bash
docker exec diun ping portainer-updater-backend
```

### Image matching issues

**Check exact image names:**
```bash
# What Diun sees:
docker logs diun | grep "image:"

# What's in config.json:
cat /volume2/docker/portainer-updater/config.json | grep "image"
```

They must match exactly!

## Security Notes

### Pin Security
- Use a strong, unique PIN (6+ characters)
- Don't reuse PINs from other services
- Generate hash securely: `echo -n "pin" | shasum -a 256`

### Network Isolation
- Backend is not exposed to host network
- Only frontend is accessible externally
- Use reverse proxy with HTTPS for production

### File Permissions
```bash
# Recommended permissions
chmod 644 /volume2/docker/portainer-updater/config.json
chmod 755 /volume2/docker/portainer-updater/data
chmod 644 /volume2/docker/portainer-updater/data/updates.db
```

### Webhook URLs
- Webhook URLs contain authentication tokens
- Keep config.json secure (read-only mount)
- Don't commit config.json to git

## Advanced: Using Docker Registry

If you want to use a private registry:

1. **Build and tag images:**
   ```bash
   docker build -t registry.local:5000/portainer-updater-backend:latest -f apps/portainer-backend/Dockerfile .
   docker build -t registry.local:5000/portainer-updater:latest -f apps/portainer/Dockerfile .
   ```

2. **Push to registry:**
   ```bash
   docker push registry.local:5000/portainer-updater-backend:latest
   docker push registry.local:5000/portainer-updater:latest
   ```

3. **Update stack YAML:**
   ```yaml
   services:
     backend:
       image: registry.local:5000/portainer-updater-backend:latest
     frontend:
       image: registry.local:5000/portainer-updater:latest
   ```

4. **Configure registry in Portainer:**
   - Go to **Registries** → **Add registry**
   - Add your private registry credentials

## Maintenance

### View Backend Stats
```bash
docker exec portainer-updater-backend sh -c "ls -lh /app/data"
# Shows database size
```

### Clear Old History
```bash
docker exec portainer-updater-backend sh -c "sqlite3 /app/data/updates.db 'DELETE FROM update_history WHERE triggered_at < date(\"now\", \"-30 days\");'"
# Deletes history older than 30 days
```

### Restart Services
```bash
# Via Portainer UI:
# Containers → Click container → Restart

# Or via CLI:
docker restart portainer-updater-backend
docker restart portainer-updater-frontend
```

## Next Steps

1. ✅ Deploy stack in Portainer
2. ✅ Configure Diun webhook
3. ✅ Test with manual webhook trigger
4. ✅ Add more containers to config.json
5. ✅ Set up database backups
6. 🔲 Configure reverse proxy (optional)
7. 🔲 Set up HTTPS (optional)

## Support

If you encounter issues:

1. Check container logs in Portainer
2. Verify network connectivity
3. Test backend health endpoint
4. Review config.json syntax
5. Check file permissions on NAS

For detailed troubleshooting, see `DIUN_INTEGRATION.md`.

---

**Quick Start Summary:**

1. Create `/volume2/docker/portainer-updater/` on NAS
2. Add `config.json` with your webhooks
3. Build images on NAS
4. Create stack in Portainer with YAML above
5. Deploy stack
6. Add Diun to same network
7. Test at `http://nas-ip:7890`
