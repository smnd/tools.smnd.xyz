# Portainer Updater

A simple web application to trigger Portainer stack and container updates via webhooks. Designed for self-hosting on your local network (Synology NAS or any Docker-capable device).

## Features

- **Simple UI**: Clean interface listing all your stacks and containers
- **One-click updates**: Trigger Portainer webhooks with a single button click
- **PIN authentication**: Protect your webhooks with a PIN (SHA-256 hashed)
- **Search & filter**: Quickly find webhooks when you have many configured
- **Dark mode**: Automatic theme switching
- **Local network only**: Designed to run on your home network, not exposed to the internet

## Security

⚠️ **IMPORTANT SECURITY NOTES**

1. **Config file is NOT committed to git** - Your actual `config.json` with webhook URLs is gitignored and should only exist on your NAS
2. **Webhook URLs contain secrets** - These URLs have tokens that allow triggering updates without additional authentication
3. **PIN protection** - The app requires a PIN (stored as SHA-256 hash) to access webhook triggers
4. **Network isolation** - This app should only be accessible on your local network, not exposed to the internet
5. **Session-based auth** - PIN is checked once per session and stored in sessionStorage

## Quick Start

### 1. Generate Your PIN Hash

```bash
cd apps/portainer
node generate-pin.js
```

Enter your desired PIN when prompted, and you'll get a SHA-256 hash to use in your config.

### 2. Create Your Config File

Create `config.json` on your NAS at `/volume1/docker/portainer-updater/config.json` (adjust path as needed):

```json
{
  "pin": "your-sha256-hash-from-step-1",
  "webhooks": [
    {
      "name": "Plex Media Server",
      "type": "stack",
      "url": "https://your-nas-ip:9443/api/stacks/webhooks/abc123..."
    },
    {
      "name": "Homepage",
      "type": "container",
      "url": "https://your-nas-ip:9443/api/webhooks/def456..."
    }
  ]
}
```

**How to get webhook URLs from Portainer:**

1. Open Portainer
2. Go to **Stacks** (for stack webhooks) or **Containers** (for container webhooks)
3. Click on your stack/container
4. Scroll down to find the **Webhook** section
5. Click "Create webhook" or copy the existing webhook URL

### 3. Deploy to Portainer

#### Option A: Using Portainer Stacks UI

1. In Portainer, go to **Stacks** → **Add stack**
2. Name it `portainer-updater`
3. Choose **Repository** build method
4. Repository URL: Your git repo URL
5. Repository reference: `main` (or your branch)
6. Compose path: `apps/portainer/docker-compose.yml`
7. Add environment variables if needed
8. Click **Deploy the stack**

#### Option B: Manual Docker Build & Run

From the **repository root**:

```bash
# Build the image
docker build -f apps/portainer/Dockerfile -t portainer-updater:latest .

# Run the container
docker run -d \
  --name portainer-updater \
  -p 3001:80 \
  -v /volume1/docker/portainer-updater/config.json:/usr/share/nginx/html/config.json:ro \
  --restart unless-stopped \
  portainer-updater:latest
```

### 4. Access the App

Open your browser and navigate to:

```
http://your-nas-ip:3001
```

Enter your PIN to unlock and start triggering updates!

## Development

### Local Development

```bash
# From repository root
pnpm install
pnpm dev:portainer
```

For local development, copy `public/config.example.json` to `public/config.json` and add your own webhook URLs.

### Build

```bash
pnpm build:portainer
```

## Configuration Reference

### Config Structure

```json
{
  "pin": "SHA-256 hash of your PIN",
  "webhooks": [
    {
      "name": "Display name for your stack/container",
      "type": "stack | container",
      "url": "Full Portainer webhook URL"
    }
  ]
}
```

### Config Fields

- **pin** (string, required): SHA-256 hash of your PIN (use `generate-pin.js` to create)
- **webhooks** (array, required): List of webhook configurations
  - **name** (string): Display name shown in the UI
  - **type** (string): Either `"stack"` or `"container"`
  - **url** (string): Full Portainer webhook URL

### Example with Multiple Webhooks

```json
{
  "pin": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  "webhooks": [
    {
      "name": "Media Stack",
      "type": "stack",
      "url": "https://192.168.1.100:9443/api/stacks/webhooks/..."
    },
    {
      "name": "Plex Container",
      "type": "container",
      "url": "https://192.168.1.100:9443/api/webhooks/..."
    },
    {
      "name": "Sonarr Container",
      "type": "container",
      "url": "https://192.168.1.100:9443/api/webhooks/..."
    }
  ]
}
```

## Docker Compose Reference

The `docker-compose.yml` file includes:

- **Port mapping**: Change `3001:80` to your preferred port
- **Volume mount**: Update the left side of the volume mount to match where you store `config.json` on your NAS
- **Health checks**: Automatic container health monitoring
- **Restart policy**: Container restarts unless explicitly stopped

Example modifications:

```yaml
ports:
  - "8080:80"  # Use port 8080 instead

volumes:
  # If you store config in a different location:
  - /mnt/data/configs/portainer-updater/config.json:/usr/share/nginx/html/config.json:ro
```

## Troubleshooting

### "Config file not found" error

- Ensure `config.json` exists at the path specified in the volume mount
- Check file permissions (should be readable by the nginx user in the container)
- Verify the volume mount path in `docker-compose.yml` is correct for your system

### PIN doesn't work

- Regenerate your PIN hash using `generate-pin.js`
- Ensure there are no extra spaces or newlines in the hash in `config.json`
- Clear your browser's sessionStorage and try again

### Webhook trigger fails

- Check that the webhook URL is correct and complete
- Verify your Portainer instance is accessible from the container
- Check Portainer logs for any errors
- Ensure the webhook hasn't been deleted in Portainer

### Can't access from other devices on network

- Verify the port mapping in docker-compose.yml
- Check your NAS firewall settings
- Ensure the container is running: `docker ps | grep portainer-updater`

## Security Best Practices

1. **Never commit `config.json`** - It's already in `.gitignore`, keep it that way
2. **Use a strong PIN** - At least 6 characters, mix of numbers and letters recommended
3. **Keep it local** - Don't expose this app to the internet via port forwarding or reverse proxy
4. **Regular updates** - Rebuild the Docker image periodically to get security updates
5. **HTTPS on NAS** - If possible, access the app via HTTPS through a reverse proxy on your NAS
6. **Webhook rotation** - Periodically regenerate your Portainer webhooks
7. **Limit access** - Use your router's VLAN features to limit which devices can access this app

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Nginx** - Web server in Docker container
- **@tools/ui** - Shared component library from monorepo

## License

Part of the tools.smnd.xyz monorepo. See repository root for license information.

## Contributing

This is part of a larger monorepo. See `CONTRIBUTING.md` in the repository root.

---

**Made with ❤️ for simplifying Portainer stack management**
