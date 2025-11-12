#!/bin/bash

# Build and Push Backend Docker Image to Docker Hub

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Portainer Updater Backend - Build and Push${NC}"
echo "================================================"
echo ""

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓${NC} Loaded configuration from .env"
else
    echo -e "${RED}✗${NC} .env file not found"
    exit 1
fi

# Check if DOCKER_HUB_USERNAME is set
if [ -z "$DOCKER_HUB_USERNAME" ]; then
    echo -e "${RED}✗${NC} DOCKER_HUB_USERNAME not set in .env file"
    exit 1
fi

BACKEND_TAG=${BACKEND_TAG:-latest}

echo ""
echo "Configuration:"
echo "  Docker Hub User: $DOCKER_HUB_USERNAME"
echo "  Backend Tag:     $BACKEND_TAG"
echo ""

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
echo -e "${GREEN}🎉 Backend Build and Push Complete!${NC}"
echo ""
echo "Image published:"
echo "  📦 $DOCKER_HUB_USERNAME/portainer-updater-backend:$BACKEND_TAG"
echo ""
