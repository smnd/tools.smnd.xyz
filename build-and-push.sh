#!/bin/bash

# Build and Push Docker Images to Docker Hub
# This script builds both backend and frontend images and pushes them to Docker Hub

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Portainer Updater - Build and Push${NC}"
echo "========================================"
echo ""

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓${NC} Loaded configuration from .env"
else
    echo -e "${YELLOW}⚠${NC}  .env file not found"
    echo ""
    echo "Please create a .env file with your Docker Hub username:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    echo ""
    exit 1
fi

# Check if DOCKER_HUB_USERNAME is set
if [ -z "$DOCKER_HUB_USERNAME" ]; then
    echo -e "${RED}✗${NC} DOCKER_HUB_USERNAME not set in .env file"
    echo ""
    echo "Please add your Docker Hub username to .env:"
    echo "  DOCKER_HUB_USERNAME=your-username"
    echo ""
    exit 1
fi

# Set default tags if not specified
BACKEND_TAG=${BACKEND_TAG:-latest}
FRONTEND_TAG=${FRONTEND_TAG:-latest}

echo ""
echo "Configuration:"
echo "  Docker Hub User: $DOCKER_HUB_USERNAME"
echo "  Backend Tag:     $BACKEND_TAG"
echo "  Frontend Tag:    $FRONTEND_TAG"
echo ""

# Confirm
read -p "Continue with build and push? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${BLUE}📦 Building Backend Image...${NC}"
echo "-------------------------------------------"
docker build \
    --platform linux/amd64 \
    --pull \
    --no-cache \
    -t $DOCKER_HUB_USERNAME/portainer-updater-backend:$BACKEND_TAG \
    -f apps/portainer-backend/Dockerfile \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Backend image built successfully"
else
    echo -e "${RED}✗${NC} Backend build failed"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Building Frontend Image...${NC}"
echo "-------------------------------------------"
docker build \
    --platform linux/amd64 \
    --pull \
    --no-cache \
    -t $DOCKER_HUB_USERNAME/portainer-updater:$FRONTEND_TAG \
    -f apps/portainer/Dockerfile \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Frontend image built successfully"
else
    echo -e "${RED}✗${NC} Frontend build failed"
    exit 1
fi

echo ""
echo -e "${BLUE}🔐 Checking Docker Hub Authentication...${NC}"
echo "-------------------------------------------"

# Check if logged in
if ! docker info 2>/dev/null | grep -q "Username: $DOCKER_HUB_USERNAME"; then
    echo -e "${YELLOW}⚠${NC}  Not logged in to Docker Hub"
    echo ""
    echo "Please login to Docker Hub:"
    docker login
    echo ""
fi

echo ""
echo -e "${BLUE}⬆️  Pushing Backend Image to Docker Hub...${NC}"
echo "-------------------------------------------"
docker push $DOCKER_HUB_USERNAME/portainer-updater-backend:$BACKEND_TAG

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Backend image pushed successfully"
else
    echo -e "${RED}✗${NC} Backend push failed"
    exit 1
fi

echo ""
echo -e "${BLUE}⬆️  Pushing Frontend Image to Docker Hub...${NC}"
echo "-------------------------------------------"
docker push $DOCKER_HUB_USERNAME/portainer-updater:$FRONTEND_TAG

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Frontend image pushed successfully"
else
    echo -e "${RED}✗${NC} Frontend push failed"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Build and Push Complete!${NC}"
echo "========================================"
echo ""
echo "Images published:"
echo "  📦 $DOCKER_HUB_USERNAME/portainer-updater-backend:$BACKEND_TAG"
echo "  📦 $DOCKER_HUB_USERNAME/portainer-updater:$FRONTEND_TAG"
echo ""
echo "Next steps:"
echo "  1. Update portainer-stack.yml with your Docker Hub username"
echo "  2. Commit and push to git"
echo "  3. In Portainer, click 'Pull and redeploy' to update"
echo ""
echo "Or just wait for GitOps to auto-update (if enabled)!"
echo ""
