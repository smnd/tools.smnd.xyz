#!/bin/bash

# Build and Push Multi-Architecture Docker Images to Docker Hub
# Builds for both amd64 (x86_64) and arm64 architectures
# Requires Docker Buildx

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Portainer Updater - Multi-Arch Build and Push${NC}"
echo "======================================================="
echo ""

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓${NC} Loaded configuration from .env"
else
    echo -e "${RED}✗${NC} .env file not found"
    echo "Please run ./setup-dockerhub.sh first"
    exit 1
fi

# Check if DOCKER_HUB_USERNAME is set
if [ -z "$DOCKER_HUB_USERNAME" ]; then
    echo -e "${RED}✗${NC} DOCKER_HUB_USERNAME not set in .env"
    exit 1
fi

# Set default tags
BACKEND_TAG=${BACKEND_TAG:-latest}
FRONTEND_TAG=${FRONTEND_TAG:-latest}

echo ""
echo "Configuration:"
echo "  Docker Hub User: $DOCKER_HUB_USERNAME"
echo "  Backend Tag:     $BACKEND_TAG"
echo "  Frontend Tag:    $FRONTEND_TAG"
echo "  Platforms:       linux/amd64, linux/arm64"
echo ""

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
    echo -e "${RED}✗${NC} Docker Buildx not available"
    echo ""
    echo "Install Docker Buildx:"
    echo "  https://docs.docker.com/buildx/working-with-buildx/"
    exit 1
fi

# Create builder if it doesn't exist
if ! docker buildx ls | grep -q "multiarch-builder"; then
    echo -e "${BLUE}Creating buildx builder...${NC}"
    docker buildx create --name multiarch-builder --use
    docker buildx inspect --bootstrap
fi

# Use the builder
docker buildx use multiarch-builder

# Confirm
read -p "Continue with multi-arch build and push? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Login check
echo ""
echo -e "${BLUE}🔐 Checking Docker Hub Authentication...${NC}"
if ! docker info 2>/dev/null | grep -q "Username: $DOCKER_HUB_USERNAME"; then
    echo -e "${YELLOW}⚠${NC}  Not logged in to Docker Hub"
    docker login
fi

echo ""
echo -e "${BLUE}📦 Building and Pushing Backend (Multi-Arch)...${NC}"
echo "-----------------------------------------------------------"
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t $DOCKER_HUB_USERNAME/portainer-updater-backend:$BACKEND_TAG \
    -f apps/portainer-backend/Dockerfile \
    --push \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Backend multi-arch image built and pushed successfully"
else
    echo -e "${RED}✗${NC} Backend build failed"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Building and Pushing Frontend (Multi-Arch)...${NC}"
echo "-----------------------------------------------------------"
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t $DOCKER_HUB_USERNAME/portainer-updater:$FRONTEND_TAG \
    -f apps/portainer/Dockerfile \
    --push \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Frontend multi-arch image built and pushed successfully"
else
    echo -e "${RED}✗${NC} Frontend build failed"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Multi-Arch Build and Push Complete!${NC}"
echo "======================================================="
echo ""
echo "Images published for linux/amd64 and linux/arm64:"
echo "  📦 $DOCKER_HUB_USERNAME/portainer-updater-backend:$BACKEND_TAG"
echo "  📦 $DOCKER_HUB_USERNAME/portainer-updater:$FRONTEND_TAG"
echo ""
echo "These images will work on both x86_64 and ARM64 NAS devices!"
echo ""
