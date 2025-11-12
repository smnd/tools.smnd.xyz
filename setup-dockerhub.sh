#!/bin/bash

# Setup Script for Docker Hub Deployment
# This script helps configure your Docker Hub username in all necessary files

set -e

echo "🔧 Docker Hub Setup"
echo "==================="
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "✓ .env file exists"
    source .env
    if [ -n "$DOCKER_HUB_USERNAME" ]; then
        echo "✓ DOCKER_HUB_USERNAME is set to: $DOCKER_HUB_USERNAME"
        echo ""
        read -p "Do you want to use this username? (Y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            DOCKER_HUB_USERNAME=""
        fi
    fi
fi

# Ask for Docker Hub username if not set
if [ -z "$DOCKER_HUB_USERNAME" ]; then
    echo ""
    read -p "Enter your Docker Hub username: " DOCKER_HUB_USERNAME
    echo ""
fi

# Validate username
if [ -z "$DOCKER_HUB_USERNAME" ]; then
    echo "❌ Username cannot be empty"
    exit 1
fi

echo "Docker Hub username: $DOCKER_HUB_USERNAME"
echo ""

# Create or update .env file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# Update .env with username
if grep -q "^DOCKER_HUB_USERNAME=" .env; then
    sed -i.bak "s/^DOCKER_HUB_USERNAME=.*/DOCKER_HUB_USERNAME=$DOCKER_HUB_USERNAME/" .env
else
    echo "DOCKER_HUB_USERNAME=$DOCKER_HUB_USERNAME" >> .env
fi

echo "✓ Updated .env file"

# Update portainer-stack.yml
if [ -f apps/portainer/portainer-stack.yml ]; then
    if grep -q "YOUR_DOCKERHUB_USERNAME" apps/portainer/portainer-stack.yml; then
        sed -i.bak "s/YOUR_DOCKERHUB_USERNAME/$DOCKER_HUB_USERNAME/g" apps/portainer/portainer-stack.yml
        echo "✓ Updated apps/portainer/portainer-stack.yml"
    else
        echo "⚠  portainer-stack.yml already configured"
    fi
fi

# Clean up backup files
rm -f .env.bak apps/portainer/portainer-stack.yml.bak

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Login to Docker Hub:"
echo "     docker login"
echo ""
echo "  2. Build and push images:"
echo "     ./build-and-push.sh"
echo ""
echo "  3. Commit changes:"
echo "     git add apps/portainer/portainer-stack.yml"
echo "     git commit -m 'chore: configure Docker Hub username'"
echo "     git push"
echo ""
echo "  4. Deploy in Portainer (see DOCKER_HUB_WORKFLOW.md)"
echo ""
