#!/bin/bash

# Build and Push Both Docker Images to Docker Hub
# This is a convenience script that runs both backend and frontend builds

set -e

./build-and-push-backend.sh
./build-and-push-frontend.sh

echo ""
echo "================================================"
echo "✅ Both images built and pushed successfully!"
echo "================================================"
echo ""
