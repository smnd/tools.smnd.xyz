# Docker Hub Workflow

This repository is configured to use Docker Hub for image hosting, allowing you to build locally and deploy to your NAS without touching it.

## Quick Start

### One-Time Setup

1. **Create Docker Hub account** (if you don't have one):
   - Sign up at https://hub.docker.com

2. **Configure local environment:**
   ```bash
   # Copy example env file
   cp .env.example .env

   # Edit with your Docker Hub username
   nano .env
   ```

   In `.env`:
   ```bash
   DOCKER_HUB_USERNAME=your-dockerhub-username
   ```

3. **Login to Docker Hub:**
   ```bash
   docker login
   # Enter username and password
   ```

4. **Update portainer-stack.yml:**
   ```bash
   # Replace YOUR_DOCKERHUB_USERNAME with your actual username
   sed -i 's/YOUR_DOCKERHUB_USERNAME/your-username/g' apps/portainer/portainer-stack.yml
   ```

   Or manually edit:
   ```yaml
   services:
     backend:
       image: your-username/portainer-updater-backend:latest
     frontend:
       image: your-username/portainer-updater:latest
   ```

5. **Initial build and push:**
   ```bash
   ./build-and-push.sh
   ```

   This builds both images and pushes them to Docker Hub.

6. **Commit the updated stack file:**
   ```bash
   git add apps/portainer/portainer-stack.yml
   git commit -m "chore: update Docker Hub username"
   git push
   ```

7. **Deploy on NAS** (one time):
   - Create config on NAS (via File Station or SSH):
     ```bash
     ssh admin@nas-ip
     mkdir -p /volume1/docker/portainer-updater/data
     nano /volume1/docker/portainer-updater/config.json
     # Paste your config
     ```

   - In Portainer UI:
     - Stacks → Add stack → **Repository**
     - URL: `https://github.com/your-username/tools.smnd.xyz`
     - Path: `apps/portainer/portainer-stack.yml`
     - Branch: `refs/heads/main`
     - Enable GitOps: ✅
     - Deploy

## Daily Workflow

### Making Changes and Deploying

```bash
# 1. Make your code changes
vim apps/portainer/src/App.tsx

# 2. Build and push to Docker Hub
./build-and-push.sh

# 3. Commit changes (optional but recommended)
git add .
git commit -m "feat: add new feature"
git push

# 4. Update on NAS:
#    - Portainer auto-updates via GitOps (5 min)
#    - Or click "Pull and redeploy" in Portainer
```

That's it! No SSH to NAS, no file copying, no manual builds on NAS!

## Build Script Options

The `build-and-push.sh` script:
- ✅ Builds both backend and frontend images
- ✅ Tags with latest (or custom tag from .env)
- ✅ Pushes to Docker Hub
- ✅ Shows progress and errors
- ✅ Confirms before pushing

### Custom Tags

To build with a specific tag (e.g., for versioning):

In `.env`:
```bash
DOCKER_HUB_USERNAME=your-username
BACKEND_TAG=v1.2.0
FRONTEND_TAG=v1.2.0
```

Then run:
```bash
./build-and-push.sh
```

This creates:
- `your-username/portainer-updater-backend:v1.2.0`
- `your-username/portainer-updater:v1.2.0`

Update `portainer-stack.yml` to use the new tag:
```yaml
services:
  backend:
    image: your-username/portainer-updater-backend:v1.2.0
```

## Manual Build Commands

If you prefer manual control:

```bash
# Backend
docker build -t your-username/portainer-updater-backend:latest \
  -f apps/portainer-backend/Dockerfile .
docker push your-username/portainer-updater-backend:latest

# Frontend
docker build -t your-username/portainer-updater:latest \
  -f apps/portainer/Dockerfile .
docker push your-username/portainer-updater:latest
```

## Deployment Flow

```
┌──────────────┐
│ Local Dev    │ 1. Make changes
│ (Your Mac)   │ 2. Run ./build-and-push.sh
└──────┬───────┘
       │
       ↓ (push images)
┌──────────────┐
│ Docker Hub   │ 3. Images stored
└──────┬───────┘
       │
       ↓ (Portainer pulls)
┌──────────────┐
│ Your NAS     │ 4. Auto-updates (GitOps)
│ (Portainer)  │    or click "Pull and redeploy"
└──────────────┘
```

## Benefits of This Workflow

### ✅ Build Locally
- No git on NAS needed
- No build tools on NAS needed
- Use your fast development machine

### ✅ Deploy Remotely
- Portainer pulls from Docker Hub
- No SSH to NAS
- No file copying
- No manual builds

### ✅ Easy Updates
- One command: `./build-and-push.sh`
- Portainer auto-updates (GitOps)
- Or manual "Pull and redeploy"

### ✅ Version Control
- Tag releases: `BACKEND_TAG=v1.0.0`
- Roll back easily: Change tag in stack YAML
- Track what's deployed in git

## Troubleshooting

### "Permission denied" when pushing

**Issue:** Not logged in to Docker Hub

**Solution:**
```bash
docker login
# Enter username and password
```

### "Repository does not exist"

**Issue:** First time pushing to a new repository

**Solution:** Repositories are created automatically on first push. If it fails:
1. Go to https://hub.docker.com
2. Create repositories manually:
   - `portainer-updater-backend`
   - `portainer-updater`
3. Try pushing again

### Build fails

**Issue:** Build errors in code

**Solution:**
```bash
# Check what failed
./build-and-push.sh

# Fix the errors shown
# Try building just one image to test:
docker build -t test -f apps/portainer-backend/Dockerfile .
```

### Portainer doesn't pull new image

**Issue:** Portainer uses cached image

**Solutions:**

1. **Force pull in Portainer:**
   - Stacks → Your stack → "Pull and redeploy"
   - Enable "Re-pull images"

2. **Use image digest instead of tag:**
   ```bash
   # Get digest after pushing
   docker inspect your-username/portainer-updater:latest | grep Digest

   # Use in stack:
   image: your-username/portainer-updater@sha256:abc123...
   ```

3. **Change tag:**
   ```bash
   # In .env:
   BACKEND_TAG=v1.0.1  # Increment version
   FRONTEND_TAG=v1.0.1

   # Build and push
   ./build-and-push.sh

   # Update stack YAML with new tag
   ```

## Making Images Public or Private

### Public (Default)
- Free on Docker Hub
- Anyone can pull
- Good for open-source

### Private
- Requires Docker Hub subscription ($5/mo for 1 private repo)
- Only you can pull
- Better for proprietary code

To make private:
1. Go to https://hub.docker.com
2. Find your repository
3. Settings → Make Private

Then in Portainer, add registry credentials:
- Registries → Add registry
- Name: Docker Hub
- URL: `docker.io`
- Username: your-dockerhub-username
- Password: your-password

## CI/CD (Optional - Automate Builds)

You can automate builds using GitHub Actions:

**.github/workflows/build.yml:**
```yaml
name: Build and Push

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: .
          file: apps/portainer-backend/Dockerfile
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/portainer-updater-backend:latest

      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: .
          file: apps/portainer/Dockerfile
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/portainer-updater:latest
```

Add secrets in GitHub:
- Settings → Secrets → Actions → New secret
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Then every push to main automatically builds and pushes to Docker Hub!

## Cost

**Docker Hub Pricing:**
- Free: Unlimited public repositories
- Pro ($5/mo): 1 private repository + unlimited public
- Team ($9/user/mo): Unlimited private repositories

For this project, **free tier is perfect** unless you need private images.

## Summary

This workflow gives you:
- ✅ **Build locally** on your fast machine
- ✅ **Deploy remotely** without touching NAS
- ✅ **Easy updates** with one command
- ✅ **Version control** with tags
- ✅ **GitOps** for automatic updates
- ✅ **No git on NAS** required

Just run `./build-and-push.sh` after making changes, and your NAS automatically updates! 🚀
