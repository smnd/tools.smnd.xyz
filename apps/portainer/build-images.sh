#!/bin/bash

# Build Docker images for Portainer Updater
# Run this script on your NAS after cloning the repository

set -e  # Exit on error

echo "🚀 Building Portainer Updater Docker Images"
echo "============================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "apps/portainer/Dockerfile" ]; then
    echo "❌ Error: Please run this script from the repository root directory"
    echo "   Example: cd /volume2/docker/tools.smnd.xyz && ./apps/portainer/build-images.sh"
    exit 1
fi

# Build backend
echo "📦 Building backend image..."
docker build -t portainer-updater-backend:latest \
    -f apps/portainer-backend/Dockerfile \
    .

if [ $? -eq 0 ]; then
    echo "✅ Backend image built successfully"
else
    echo "❌ Backend build failed"
    exit 1
fi

echo ""

# Build frontend
echo "📦 Building frontend image..."
docker build -t portainer-updater:latest \
    -f apps/portainer/Dockerfile \
    .

if [ $? -eq 0 ]; then
    echo "✅ Frontend image built successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "🎉 Build complete!"
echo ""
echo "Images created:"
docker images | grep portainer-updater

echo ""
echo "Next steps:"
echo "1. Create directory: mkdir -p /volume2/docker/portainer-updater/data"
echo "2. Create config.json in /volume2/docker/portainer-updater/"
echo "3. Deploy stack in Portainer using portainer-stack.yml"
echo ""
