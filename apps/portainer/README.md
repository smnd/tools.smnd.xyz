# Portainer Updater with Diun Integration

Web interface to trigger Portainer webhook updates with automatic update detection via Diun.

## Features

- 🔔 **Auto-detect updates** - Diun webhook integration
- 📦 **Batch updates** - Update multiple containers at once
- 📚 **Stack grouping** - Group containers by stack with expand/collapse
- 📊 **Update history** - Track all updates with timestamps
- 🎯 **Manual webhooks** - Original one-click webhook triggers (backward compatible)
- 🔐 **PIN authentication** - Secure access with SHA-256 hashing
- 🌓 **Dark mode** - Light/dark/auto theme
- 🔄 **GitOps** - Auto-deploy from Git via Portainer

## Quick Start

### 1. Setup Docker Hub (One Time)

```bash
# Configure your Docker Hub username
./setup-dockerhub.sh

# Login to Docker Hub
docker login

# Build and push images
./build-and-push.sh
```

### 2. Prepare NAS Configuration

```bash
# SSH into NAS or use File Station
mkdir -p /volume1/docker/portainer-updater/data

# Create config.json
nano /volume1/docker/portainer-updater/config.json
```

Paste:

```json
{
  "pin": "your-sha256-hash",
  "backend_url": "http://portainer-updater-backend:3000",
  "webhooks": [
    {
      "name": "Nginx Web Server",
      "type": "container",
      "stack": "web-stack",
      "image": "nginx:latest",
      "container_name": "nginx",
      "webhook_url": "https://portainer/api/webhooks/xxx"
    }
  ]
}
```

Generate PIN hash:

```bash
echo -n "your-pin" | shasum -a 256
# Or use: node apps/portainer/generate-pin.js
```

### 3. Deploy in Portainer (Git Method)

1. **Portainer** → **Stacks** → **Add stack**
2. **Build method**: **Repository** ⭐
3. Fill in:
   - **Name**: `portainer-updater`
   - **Repository URL**: `https://github.com/your-username/tools.smnd.xyz`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `apps/portainer/docker-compose.yml`
4. **Enable GitOps** ✅ (5 minute polling)
5. **Deploy**

### 4. Configure Diun (Optional)

Add to your Diun stack/container:

```yaml
environment:
  - DIUN_NOTIF_WEBHOOK_ENDPOINT=http://portainer-updater-backend:3000/api/diun/webhook
  - DIUN_NOTIF_WEBHOOK_METHOD=POST
networks:
  - portainer-updater-net
```

## Daily Workflow

```bash
# Make changes
vim src/App.tsx

# Build and push to Docker Hub
./build-and-push.sh

# Commit changes (optional)
git commit -am "Add new feature"
git push

# Portainer auto-updates (5 min via GitOps)
# Or click "Pull and redeploy" in Portainer
```

**No SSH to NAS, no building on NAS!** 🚀

## Documentation

- 🚀 **[DOCKER_HUB_WORKFLOW.md](../../DOCKER_HUB_WORKFLOW.md)** - Build locally, deploy remotely (RECOMMENDED)
- 🔔 **[DIUN_INTEGRATION.md](DIUN_INTEGRATION.md)** - Diun integration details
- 🛠️ **[../portainer-backend/README.md](../portainer-backend/README.md)** - Backend technical docs

## Architecture

### Overview

```md
┌──────────────┐
│  Local Dev   │  1. Make changes
│  (Your Mac)  │  2. ./build-and-push.sh
└──────┬───────┘
       │
       ↓ (push images)
┌──────────────┐
│  Docker Hub  │  3. Store images
└──────┬───────┘
       │
       ↓ (Portainer GitOps pulls)
┌──────────────┐     webhook     ┌───────────┐     stores     ┌─────────┐
│     Diun     ├────────────────>│  Backend  ├───────────────>│ SQLite  │
└──────────────┘                 └─────┬─────┘                └─────────┘
                                       │
                                       ↓ (REST API)
                                 ┌─────────────┐
                                 │   Web UI    │
                                 │  (Frontend) │
                                 └──────┬──────┘
                                        │
                                        ↓ (trigger webhooks)
                                 ┌──────────────┐
                                 │  Portainer   │
                                 │  (on NAS)    │
                                 └──────────────┘
```

### Components

**Backend Service:**

- Node.js + Express + TypeScript
- Receives Diun webhooks
- Stores updates in SQLite
- REST API for frontend
- PIN authentication

**Frontend App:**

- React 19 + TypeScript + Vite
- Auto-detected updates tab (from Diun)
- Manual webhooks tab (original)
- Update history modal
- Batch & stack operations

**Deployment:**

- Docker Hub for image hosting
- Portainer for orchestration
- GitOps for auto-updates
- No git needed on NAS!

## Configuration

### config.json Structure

```json
{
  "pin": "SHA-256 hash",
  "backend_url": "http://portainer-updater-backend:3000",
  "webhooks": [
    {
      "name": "Display name",
      "type": "container" | "stack",
      "stack": "stack-name (optional, for grouping)",
      "image": "nginx:latest (for Diun matching)",
      "container_name": "nginx (for Diun matching)",
      "webhook_url": "https://portainer/api/webhooks/xxx"
    }
  ]
}
```

### Key Fields Explained

- **pin** - SHA-256 hash of your PIN (use `generate-pin.js` or `echo -n "pin" | shasum -a 256`)
- **backend_url** - Backend service URL (use Docker service name)
- **image** - Docker image name, must match what Diun sees (e.g., `nginx:latest`, `postgres:15`)
- **container_name** - Container name, helps with specific matching
- **stack** - Groups containers for batch operations
- **webhook_url** - Portainer webhook URL (get from Portainer UI)

### Environment Variables (.env)

```bash
DOCKER_HUB_USERNAME=your-dockerhub-username
BACKEND_TAG=latest
FRONTEND_TAG=latest
```

## Scripts

Repository root:

- `setup-dockerhub.sh` - Configure Docker Hub username
- `build-and-push.sh` - Build and push images to Docker Hub

App directory:

- `build-images.sh` - Build images locally (old method, for manual NAS builds)
- `generate-pin.js` - Generate SHA-256 PIN hash

## Ports

- **7890** - Frontend web UI (configurable in stack YAML)
- **3000** - Backend API (internal only, not exposed)

## Updating

### Update Application Code

```bash
# Make changes
vim src/App.tsx

# Build and push
./build-and-push.sh

# Commit (optional)
git commit -am "Update feature"
git push

# Portainer auto-updates via GitOps (5 min)
# Or manually: Stacks → portainer-updater → Pull and redeploy
```

### Update Configuration

```bash
# Edit config.json on NAS
ssh admin@nas-ip
nano /volume1/docker/portainer-updater/config.json

# Changes are picked up automatically
# Backend reloads config on each request
```

### Update Stack Configuration

```bash
# Edit stack YAML
vim apps/portainer/docker-compose.yml

# Commit and push
git commit -am "Update stack config"
git push

# Portainer auto-updates via GitOps (5 min)
```

## Troubleshooting

### Can't Access Web UI

**Check port:**

```bash
netstat -tuln | grep 7890
```

**Try different port in `docker-compose.yml`:**

```yaml
ports:
  - "8080:80"  # Change 7890 to 8080
```

**Check firewall** (Synology/QNAP)

### No Updates Showing

**Check Diun network:**

```bash
docker network inspect portainer-updater-net
# Should show both Diun and backend containers
```

**Check backend logs:**

```bash
docker logs portainer-updater-backend | grep webhook
```

**Verify image names match:**

```bash
# What Diun sees:
docker logs diun | grep "image:"

# What's in config.json:
cat /volume1/docker/portainer-updater/config.json | grep "image"

# Must match exactly!
```

### Images Not Updating

**Force pull in Portainer:**

- Stacks → portainer-updater → Pull and redeploy
- Enable "Re-pull images"

**Or use image digest:**

```yaml
image: username/portainer-updater@sha256:abc123...
```

### Build Fails

**Check Docker version:**

```bash
docker --version
# Need 20.10+
```

**Check disk space:**

```bash
df -h
# Need 2GB+ free
```

## Security

⚠️ **Important Security Notes:**

1. **Config file not in git** - `config.json` contains secrets (webhook URLs with auth tokens)
2. **PIN protection** - SHA-256 hashed PIN required for access
3. **Session auth** - PIN checked once per session (sessionStorage)
4. **Local network only** - Not designed for internet exposure
5. **HTTPS recommended** - Use reverse proxy with SSL/TLS
6. **Webhook rotation** - Regenerate Portainer webhooks periodically

### Best Practices

- Use strong PIN (8+ characters)
- Don't expose port 7890 to internet
- Use HTTPS via reverse proxy
- Keep Docker images updated
- Back up config.json and database
- Use private Docker Hub repos (if needed)

## Development

### Local Development

```bash
# Install dependencies
pnpm install

# Run frontend (no backend needed for basic testing)
pnpm dev:portainer

# Run backend
cd apps/portainer-backend
pnpm dev

# Build for production
pnpm build:portainer
```

### Local Testing with Backend

```bash
# Start backend
cd apps/portainer-backend
pnpm dev

# In another terminal, start frontend
pnpm dev:portainer

# Create local config
cp apps/portainer/config.example.json apps/portainer/public/config.json
nano apps/portainer/public/config.json
```

## Backup

### Configuration

```bash
cp /volume1/docker/portainer-updater/config.json \
   /volume1/docker/portainer-updater/config.json.backup
```

### Database

```bash
docker stop portainer-updater-backend
cp /volume1/docker/portainer-updater/data/updates.db \
   /volume1/docker/portainer-updater/data/updates.db.backup
docker start portainer-updater-backend
```

### Automated Backup

Use Synology Task Scheduler or cron:

```bash
0 2 * * * docker stop portainer-updater-backend && \
          cp /volume1/docker/portainer-updater/data/updates.db \
             /volume1/docker/backups/updates-$(date +\%Y\%m\%d).db && \
          docker start portainer-updater-backend
```

## Support

- **Backend docs:** [../portainer-backend/README.md](../portainer-backend/README.md)
- **Workflow guide:** [../../DOCKER_HUB_WORKFLOW.md](../../DOCKER_HUB_WORKFLOW.md)
- **Issues:** GitHub Issues

## License

MIT - Part of tools.smnd.xyz monorepo

---

**Made with ❤️ for simplifying Docker updates**
