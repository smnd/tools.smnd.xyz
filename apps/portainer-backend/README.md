# Portainer Updater Backend

Backend service for the Portainer Updater app that integrates with [Diun](https://crazymax.dev/diun/) to detect Docker image updates and trigger Portainer webhooks.

## Features

- **Diun Webhook Integration** - Receives notifications when Diun detects image updates
- **Update Management** - Stores pending updates in SQLite database
- **Batch Operations** - Trigger multiple container updates at once
- **Stack Support** - Group containers by stack for coordinated updates
- **Update History** - Audit log of all triggered updates with timestamps and status
- **PIN Authentication** - Same SHA-256 PIN hash authentication as frontend

## Architecture

``` md
Diun → Backend API → SQLite Database
         ↓
    Frontend Web UI
```

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4
- **Database**: SQLite 3 (better-sqlite3)
- **Language**: TypeScript 5.9
- **Validation**: Zod 3

## API Endpoints

### Diun Integration

- `POST /api/diun/webhook` - Receive webhook notifications from Diun (no auth)

### Updates Management

- `GET /api/updates` - List all pending updates (requires PIN)
- `POST /api/updates/:id/trigger` - Trigger single update (requires PIN)
- `POST /api/updates/batch` - Trigger multiple updates (requires PIN)
- `DELETE /api/updates/:id` - Dismiss an update (requires PIN)

### History

- `GET /api/history?page=1&pageSize=20` - Get update history with pagination (requires PIN)

### Health Check

- `GET /health` - Health check endpoint

## Configuration

### Environment Variables

- `NODE_ENV` - Environment (production/development) - default: `development`
- `PORT` - Server port - default: `3000`
- `DATA_DIR` - Directory for SQLite database - default: `./data`
- `CONFIG_PATH` - Path to config.json file - default: `./config.json`

### config.json Format

The backend reads the same `config.json` as the frontend:

```json
{
  "pin": "sha256-hash-of-pin",
  "backend_url": "http://portainer-updater-backend:3000",
  "webhooks": [
    {
      "name": "Nginx",
      "type": "container",
      "stack": "web-stack",
      "image": "nginx:latest",
      "container_name": "nginx",
      "webhook_url": "https://portainer.example.com/api/webhooks/xxx"
    }
  ]
}
```

**Important Fields for Backend:**

- `image` - Used to match Diun notifications to webhook configurations
- `container_name` - Used for more specific matching (optional)
- `stack` - Used to group containers for batch operations (optional)
- `webhook_url` - The Portainer webhook URL to trigger

## Database Schema

### updates Table

Stores detected updates from Diun:

```sql
CREATE TABLE updates (
  id INTEGER PRIMARY KEY,
  image TEXT NOT NULL,
  container_name TEXT,
  container_id TEXT,
  stack TEXT,
  current_digest TEXT,
  new_digest TEXT NOT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',
  webhook_url TEXT,
  metadata TEXT
);
```

### update_history Table

Audit log of triggered updates:

```sql
CREATE TABLE update_history (
  id INTEGER PRIMARY KEY,
  update_id INTEGER,
  image TEXT NOT NULL,
  container_name TEXT,
  stack TEXT,
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'triggered',
  error_message TEXT,
  webhook_url TEXT
);
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode with watch
pnpm dev

# Build TypeScript
pnpm build

# Run production build
pnpm start

# Lint code
pnpm lint
```

## Docker Deployment

### Using docker-compose (Recommended)

See the main `apps/portainer/docker-compose.yml` for complete setup with frontend.

### Manual Docker Build

```bash
# Build image
docker build -t portainer-updater-backend:latest -f apps/portainer-backend/Dockerfile .

# Run container
docker run -d \
  --name portainer-updater-backend \
  -v /path/to/data:/app/data \
  -v /path/to/config.json:/app/config.json:ro \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DATA_DIR=/app/data \
  -e CONFIG_PATH=/app/config.json \
  --network portainer-net \
  portainer-updater-backend:latest
```

## Diun Configuration

Configure Diun to send webhooks to this backend:

```yaml
notif:
  webhook:
    endpoint: http://portainer-updater-backend:3000/api/diun/webhook
    method: POST
    headers:
      Content-Type: application/json
    timeout: 10s
```

Or using environment variables:

```bash
DIUN_NOTIF_WEBHOOK_ENDPOINT=http://portainer-updater-backend:3000/api/diun/webhook
DIUN_NOTIF_WEBHOOK_METHOD=POST
DIUN_NOTIF_WEBHOOK_HEADERS_CONTENT-TYPE=application/json
DIUN_NOTIF_WEBHOOK_TIMEOUT=10s
```

## Image Matching Logic

When Diun sends a webhook, the backend tries to find a matching webhook configuration:

1. **Exact match** - image name + container name match
2. **Image match** - image name matches
3. **Container match** - container name matches

If no match is found, the notification is acknowledged but not stored.

## Authentication

The backend uses the same PIN hash authentication as the frontend:

1. Frontend hashes PIN with SHA-256
2. Sends hash in `Authorization: Bearer <hash>` header
3. Backend compares with `pin` field in `config.json`

## Health Checks

The `/health` endpoint returns:

```json
{
  "status": "ok",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

Use for Docker healthchecks and monitoring.

## Logs

The backend logs all significant events to stdout:

- Diun webhook receipts
- Update triggers
- API errors
- Database operations

Monitor logs with:

```bash
docker logs -f portainer-updater-backend
```

## Error Handling

- **400** - Invalid request payload
- **401** - Missing authentication
- **403** - Invalid PIN
- **404** - Resource not found
- **500** - Internal server error

All errors return JSON:

```json
{
  "error": "Error message",
  "message": "Detailed description"
}
```

## Security Notes

- The backend does NOT expose Portainer webhook URLs publicly
- All update/history endpoints require PIN authentication
- Diun webhook endpoint (`/api/diun/webhook`) is unauthenticated by design
- SQLite database is stored in mounted volume (backup recommended)
- Use reverse proxy with HTTPS in production

## Troubleshooting

### Diun notifications not appearing in UI

1. Check Diun logs for webhook send errors
2. Verify backend is accessible from Diun container
3. Check backend logs for webhook receipts
4. Verify `image` field in config.json matches Diun image name

### Updates not triggering

1. Verify Portainer webhook URL is correct
2. Check backend logs for trigger errors
3. Verify Portainer webhooks are enabled
4. Test webhook URL manually with curl

### Database errors

1. Ensure data directory is writable
2. Check disk space
3. Verify SQLite database file permissions
4. Try deleting database to recreate schema

## License

MIT
