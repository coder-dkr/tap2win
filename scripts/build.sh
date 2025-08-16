#!/bin/bash

# Tap2Win Build Script
# This script builds and tests the Docker image locally

set -e

echo "🚀 Building Tap2Win Docker Image..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build the Docker image
print_status "Building Docker image..."
docker build -t tap2win:latest .

if [ $? -eq 0 ]; then
    print_status "✅ Docker image built successfully!"
else
    print_error "❌ Docker build failed!"
    exit 1
fi

# Show image info
print_status "Image details:"
docker images tap2win:latest

# Optional: Run tests
if [ "$1" = "--test" ]; then
    print_status "Running container tests..."
    
    # Start container in background
    CONTAINER_ID=$(docker run -d -p 5000:5000 \
        -e NODE_ENV=production \
        -e PORT=5000 \
        -e JWT_SECRET=test_secret \
        -e JWT_EXPIRES_IN=7d \
        -e FRONTEND_URL=http://localhost:5000 \
        -e FROM_EMAIL=test@example.com \
        -e ADMIN_EMAIL=admin@example.com \
        -e ADMIN_PASSWORD=admin123 \
        tap2win:latest)
    
    print_status "Container started with ID: $CONTAINER_ID"
    
    # Wait for container to start
    print_status "Waiting for container to start..."
    sleep 10
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        print_status "✅ Health check passed!"
    else
        print_error "❌ Health check failed!"
        docker logs $CONTAINER_ID
        docker stop $CONTAINER_ID
        docker rm $CONTAINER_ID
        exit 1
    fi
    
    # Stop and remove container
    print_status "Cleaning up test container..."
    docker stop $CONTAINER_ID
    docker rm $CONTAINER_ID
    
    print_status "✅ All tests passed!"
fi

print_status "🎉 Build completed successfully!"
print_status "To run the container:"
echo "  docker run -p 5000:5000 tap2win:latest"
print_status "To test the build:"
echo "  ./scripts/build.sh --test"
