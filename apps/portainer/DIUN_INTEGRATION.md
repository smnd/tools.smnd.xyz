# Diun Integration Guide

This guide explains how to integrate the Portainer Updater with [Diun](https://crazymax.dev/diun/) (Docker Image Update Notifier) to automatically detect image updates and display them in the web interface.

## Overview

With Diun integration, your workflow becomes:

1. **Diun detects** an image update is available
2. **Diun sends webhook** to backend service
3. **Backend stores** update information in database
4. **Web UI displays** pending updates with batch operations
5. **You click "Update"** to trigger Portainer webhook
6. **History tracks** all updates

## Architecture

```
┌──────────┐    webhook     ┌──────────┐    stores    ┌──────────┐
│   Diun   ├───────────────>│ Backend  ├─────────────>│ SQLite   │
└──────────┘                └────┬─────┘              └──────────┘
                                 │
                            REST API
                                 │
                                 v
                          ┌─────────────┐
                          │  Web UI     │
                          │ (Frontend)  │
                          └──────┬──────┘
                                 │
                            triggers
                                 │
                                 v
                          ┌─────────────┐
                          │ Portainer   │
                          │  Webhooks   │
                          └─────────────┘
```

## Prerequisites

- Docker and Docker Compose
- Existing Portainer installation
- Portainer webhooks configured for your containers/stacks

## Step 1: Update config.json

Add `backend_url` and image mapping to your existing `config.json`:

```json
{
  "pin": "your-sha256-pin-hash",
  "backend_url": "http://portainer-updater-backend:3000",
  "webhooks": [
    {
      "name": "Nginx Web Server",
      "type": "container",
      "stack": "web-stack",
      "image": "nginx:latest",
      "container_name": "nginx",
      "webhook_url": "https://your-portainer/api/webhooks/xxx"
    },
    {
      "name": "PostgreSQL",
      "type": "container",
      "stack": "database-stack",
      "image": "postgres:15",
      "container_name": "postgres",
      "webhook_url": "https://your-portainer/api/webhooks/yyy"
    },
    {
      "name": "Application Stack",
      "type": "stack",
      "stack": "app-stack",
      "webhook_url": "https://your-portainer/api/webhooks/zzz"
    }
  ]
}
```

### Key Fields

- **backend_url** - URL where backend service is accessible (use Docker service name)
- **image** - Full image name as used in Docker (e.g., `nginx:latest`, `postgres:15`)
- **container_name** - Optional, helps with specific container matching
- **stack** - Optional, groups containers for batch updates

## Step 2: Deploy Backend + Frontend

Use the provided `docker-compose.yml`:

```bash
cd apps/portainer
docker-compose up -d
```

This deploys:
- `portainer-updater-backend` - Backend service on port 3000 (internal)
- `portainer-updater` - Frontend on port 7890 (exposed)

### Directory Structure on Your Server

```
/volume2/docker/portainer-updater/
├── config.json        # Shared configuration
└── data/              # SQLite database (created automatically)
    └── updates.db
```

Make sure to create these directories and place `config.json` there:

```bash
mkdir -p /volume2/docker/portainer-updater/data
cp config.example.json /volume2/docker/portainer-updater/config.json
# Edit config.json with your PIN hash and webhook URLs
```

## Step 3: Configure Diun

Add webhook notification to your Diun configuration.

### Option A: Diun docker-compose.yml

Add to Diun's environment variables:

```yaml
services:
  diun:
    image: crazymax/diun:latest
    environment:
      - DIUN_NOTIF_WEBHOOK_ENDPOINT=http://portainer-updater-backend:3000/api/diun/webhook
      - DIUN_NOTIF_WEBHOOK_METHOD=POST
      - DIUN_NOTIF_WEBHOOK_HEADERS_CONTENT-TYPE=application/json
      - DIUN_NOTIF_WEBHOOK_TIMEOUT=10s
    networks:
      - portainer-net  # Must be on same network as backend
```

### Option B: Diun Configuration File

Create or update `diun.yml`:

```yaml
notif:
  webhook:
    endpoint: http://portainer-updater-backend:3000/api/diun/webhook
    method: POST
    headers:
      Content-Type: application/json
    timeout: 10s
```

### Important

- Diun and the backend must be on the **same Docker network** (`portainer-net`)
- Use the backend **container name** in the endpoint URL
- Endpoint is `/api/diun/webhook` (no authentication required)

## Step 4: Verify Integration

### 4.1 Check Backend Health

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

Or from inside Docker network:

```bash
docker exec -it some-container curl http://portainer-updater-backend:3000/health
```

### 4.2 Test Diun Webhook Manually

Send a test webhook to verify backend is receiving them:

```bash
curl -X POST http://localhost:3000/api/diun/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "image": "nginx:latest",
    "digest": "sha256:test123",
    "metadata": {
      "container_name": "nginx",
      "container_id": "abc123"
    }
  }'
```

Check backend logs:

```bash
docker logs portainer-updater-backend
# Should show: "Received Diun webhook: { image: 'nginx:latest', ... }"
```

### 4.3 Check Web UI

1. Open `http://your-server:7890`
2. Enter your PIN
3. You should see two tabs:
   - **Auto-Detected** - Updates detected by Diun
   - **Manual Webhooks** - Original webhook triggers
4. If you sent the test webhook above, you should see an update for nginx

### 4.4 Trigger Diun Scan

Force Diun to check for updates immediately:

```bash
docker exec -it diun diun --log-level=debug notif test
```

Or restart a container to trigger image check:

```bash
docker restart nginx
```

Wait a few seconds and check the web UI for new updates.

## Step 5: Usage

### Viewing Updates

1. Open web UI and authenticate
2. Click **Auto-Detected** tab
3. See list of containers with available updates
4. Updates are grouped by stack
5. Each update shows:
   - Container name
   - Image name
   - Detection timestamp

### Single Update

1. Click **Update** button next to a container
2. Backend triggers Portainer webhook
3. Update status changes to "completed"
4. Toast notification confirms success

### Batch Updates

1. **Method 1**: Check boxes next to multiple containers
   - Click **Update Selected**
2. **Method 2**: Expand a stack
   - Click **Update Stack** to update all containers in that stack

### Viewing History

1. Click **History** button (top right)
2. See all past updates with:
   - Trigger time
   - Completion time
   - Status (completed/failed)
   - Error messages (if any)
3. Paginate through history

### Dismissing Updates

Click **Dismiss** to remove an update from the pending list without updating.

## Troubleshooting

### No updates appearing in UI

**Problem**: Diun is running but updates don't show in web UI.

**Solutions**:
1. Check Diun logs for webhook send errors:
   ```bash
   docker logs diun
   ```
2. Verify Diun and backend are on same network:
   ```bash
   docker inspect diun | grep Networks
   docker inspect portainer-updater-backend | grep Networks
   ```
3. Check backend logs for webhook receipts:
   ```bash
   docker logs portainer-updater-backend
   ```
4. Verify `image` field in `config.json` exactly matches image name in Diun notification

### Updates not triggering

**Problem**: Click "Update" but nothing happens.

**Solutions**:
1. Check backend logs for trigger errors:
   ```bash
   docker logs portainer-updater-backend | grep trigger
   ```
2. Verify Portainer webhook URL is correct:
   - Test manually: `curl -X POST https://your-portainer/api/webhooks/xxx`
3. Check Portainer logs for webhook receipt:
   ```bash
   docker logs portainer
   ```
4. Verify webhook is enabled in Portainer UI

### Backend won't start

**Problem**: `portainer-updater-backend` container keeps restarting.

**Solutions**:
1. Check logs for errors:
   ```bash
   docker logs portainer-updater-backend
   ```
2. Verify `config.json` exists and is valid JSON:
   ```bash
   cat /volume2/docker/portainer-updater/config.json | jq
   ```
3. Ensure data directory is writable:
   ```bash
   ls -la /volume2/docker/portainer-updater/data
   chmod 755 /volume2/docker/portainer-updater/data
   ```

### Image names don't match

**Problem**: Diun detects update but backend can't match to webhook.

**Solution**: Check exact image name in Diun notification vs config.json:
1. Look at Diun logs for the exact image name:
   ```
   image: library/nginx:latest
   ```
2. Use the exact same name in config.json:
   ```json
   "image": "library/nginx:latest"
   ```

Common patterns:
- Docker Hub official images: `library/nginx:latest` or `nginx:latest`
- GHCR images: `ghcr.io/owner/repo:tag`
- Private registry: `registry.example.com/image:tag`

### Wrong updates showing

**Problem**: Updates show for wrong containers or too many containers.

**Solution**: Add `container_name` to config.json for specific matching:
```json
{
  "image": "nginx:latest",
  "container_name": "web-nginx",  // Only match this specific container
  "webhook_url": "..."
}
```

## Advanced Configuration

### Multiple Diun Instances

If you run multiple Diun instances (different registries), they can all send to the same backend:

```yaml
# diun-docker.yml
environment:
  - DIUN_NOTIF_WEBHOOK_ENDPOINT=http://portainer-updater-backend:3000/api/diun/webhook

# diun-ghcr.yml
environment:
  - DIUN_NOTIF_WEBHOOK_ENDPOINT=http://portainer-updater-backend:3000/api/diun/webhook
```

The backend will match based on image name regardless of source.

### Auto-Update (Experimental)

You can modify Diun to trigger updates automatically instead of storing them:

**NOT RECOMMENDED** - Defeats purpose of manual approval, but possible for non-critical containers.

### Backup Database

The SQLite database contains update history. To backup:

```bash
# Stop backend
docker-compose stop portainer-updater-backend

# Copy database
cp /volume2/docker/portainer-updater/data/updates.db \
   /volume2/docker/portainer-updater/data/updates.db.backup

# Start backend
docker-compose start portainer-updater-backend
```

Or use automated backups with cron.

### Custom Update Logic

The backend is extensible. You can modify:
- `src/routes/updates.ts` - Add custom validation before triggering
- `src/models/database.ts` - Add custom fields to database
- `src/routes/diun.ts` - Add filtering logic for which updates to store

## Comparison: With vs Without Diun

### Without Diun (Original)
- ❌ No automatic update detection
- ❌ Must manually trigger webhooks
- ✅ Simple setup
- ✅ No additional containers

### With Diun Integration
- ✅ Automatic update detection
- ✅ See all pending updates at a glance
- ✅ Batch update multiple containers
- ✅ Stack-level coordination
- ✅ Update history and audit log
- ❌ Requires Diun + backend
- ❌ More complex setup

## Next Steps

1. Configure more containers in `config.json`
2. Set up Diun to watch your registries
3. Test batch updates on a stack
4. Review update history
5. Set up database backups

## Support

For issues, check:
- Backend logs: `docker logs portainer-updater-backend`
- Frontend logs: `docker logs portainer-updater`
- Diun logs: `docker logs diun`
- Browser console for frontend errors

## Example Full Setup

See `config.example.json` for a complete configuration example with multiple containers and stacks.

---

**Note**: The integration is designed to be **non-breaking**. If you don't add `backend_url` to `config.json`, the app works exactly as before with just manual webhooks.
