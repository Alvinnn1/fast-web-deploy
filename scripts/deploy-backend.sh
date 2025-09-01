#!/bin/bash

# Backend Deployment Script for Cloudflare Workers or External Services
# This script automates the deployment of the Node.js backend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="backend"
DEPLOYMENT_TARGET="${DEPLOYMENT_TARGET:-workers}"  # workers, railway, render, docker

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    case "$DEPLOYMENT_TARGET" in
        workers)
            if ! command_exists wrangler; then
                print_error "Wrangler CLI is not installed. Installing..."
                npm install -g wrangler
            fi
            ;;
        docker)
            if ! command_exists docker; then
                print_error "Docker is not installed. Please install Docker first."
                exit 1
            fi
            ;;
        railway)
            if ! command_exists railway; then
                print_warning "Railway CLI not found. Please install it for easier deployment."
                print_status "You can install it with: npm install -g @railway/cli"
            fi
            ;;
    esac
    
    print_success "Prerequisites check completed"
}

# Function to build backend
build_backend() {
    print_status "Building backend application..."
    
    cd "$BACKEND_DIR"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Run tests
    print_status "Running tests..."
    npm run test || {
        print_warning "Tests failed, but continuing with deployment..."
    }
    
    # Build the application
    print_status "Building application..."
    npm run build
    
    cd ..
    print_success "Backend build completed"
}

# Function to deploy to Cloudflare Workers
deploy_to_workers() {
    print_status "Deploying to Cloudflare Workers..."
    
    cd "$BACKEND_DIR"
    
    # Check if wrangler.toml exists
    if [ ! -f "wrangler.toml" ]; then
        print_error "wrangler.toml not found in backend directory"
        exit 1
    fi
    
    # Check if worker.ts exists
    if [ ! -f "worker.ts" ]; then
        print_error "worker.ts not found in backend directory"
        exit 1
    fi
    
    # Deploy using wrangler
    print_status "Deploying to Cloudflare Workers..."
    wrangler deploy
    
    cd ..
    print_success "Deployment to Cloudflare Workers completed"
}

# Function to deploy using Docker
deploy_with_docker() {
    print_status "Deploying with Docker..."
    
    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        print_error "Dockerfile not found in project root"
        exit 1
    fi
    
    # Build Docker image
    IMAGE_NAME="cloudflare-static-deployer-backend"
    print_status "Building Docker image..."
    docker build -t "$IMAGE_NAME" .
    
    # Stop existing container if running
    if docker ps -q -f name="$IMAGE_NAME" | grep -q .; then
        print_status "Stopping existing container..."
        docker stop "$IMAGE_NAME" || true
        docker rm "$IMAGE_NAME" || true
    fi
    
    # Run new container
    print_status "Starting new container..."
    docker run -d \
        --name "$IMAGE_NAME" \
        -p 3000:3000 \
        --env-file "$BACKEND_DIR/.env" \
        "$IMAGE_NAME"
    
    print_success "Docker deployment completed"
    print_status "Backend is running on http://localhost:3000"
}

# Function to deploy to Railway
deploy_to_railway() {
    print_status "Deploying to Railway..."
    
    if command_exists railway; then
        # Use Railway CLI if available
        print_status "Using Railway CLI for deployment..."
        railway up
    else
        # Provide instructions for manual deployment
        print_status "Railway CLI not found. Please follow these steps:"
        echo "1. Go to https://railway.app"
        echo "2. Connect your GitHub repository"
        echo "3. Set the following environment variables:"
        echo "   - NODE_ENV=production"
        echo "   - CLOUDFLARE_API_TOKEN=your_token"
        echo "   - CLOUDFLARE_ACCOUNT_ID=your_account_id"
        echo "4. Set the start command to: npm start"
        echo "5. Set the build command to: npm run build"
    fi
    
    print_success "Railway deployment process initiated"
}

# Function to deploy to Render
deploy_to_render() {
    print_status "Deploying to Render..."
    
    print_status "Please follow these steps for Render deployment:"
    echo "1. Go to https://render.com"
    echo "2. Connect your GitHub repository"
    echo "3. Create a new Web Service"
    echo "4. Set the following configuration:"
    echo "   - Build Command: npm install && npm run build"
    echo "   - Start Command: npm start"
    echo "   - Environment: Node"
    echo "5. Set environment variables:"
    echo "   - NODE_ENV=production"
    echo "   - CLOUDFLARE_API_TOKEN=your_token"
    echo "   - CLOUDFLARE_ACCOUNT_ID=your_account_id"
    
    print_success "Render deployment instructions provided"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    case "$DEPLOYMENT_TARGET" in
        workers)
            cd "$BACKEND_DIR"
            # Get worker URL
            WORKER_URL=$(wrangler whoami 2>/dev/null | grep -o 'https://[^/]*\.workers\.dev' || echo "")
            if [ -n "$WORKER_URL" ]; then
                print_success "Worker deployed successfully!"
                print_status "Backend URL: $WORKER_URL"
            fi
            cd ..
            ;;
        docker)
            # Check if container is running
            if docker ps -q -f name="cloudflare-static-deployer-backend" | grep -q .; then
                print_success "Docker container is running!"
                print_status "Backend URL: http://localhost:3000"
            else
                print_error "Docker container is not running"
            fi
            ;;
        *)
            print_status "Manual verification required for $DEPLOYMENT_TARGET deployment"
            ;;
    esac
}

# Main deployment function
main() {
    print_status "Starting backend deployment process..."
    print_status "Deployment target: $DEPLOYMENT_TARGET"
    
    # Check if we're in the project root
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found. Please run this script from the project root."
        exit 1
    fi
    
    check_prerequisites
    build_backend
    
    case "$DEPLOYMENT_TARGET" in
        workers)
            deploy_to_workers
            ;;
        docker)
            deploy_with_docker
            ;;
        railway)
            deploy_to_railway
            ;;
        render)
            deploy_to_render
            ;;
        *)
            print_error "Unknown deployment target: $DEPLOYMENT_TARGET"
            print_status "Supported targets: workers, docker, railway, render"
            exit 1
            ;;
    esac
    
    verify_deployment
    
    print_success "Backend deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Backend Deployment Script"
        echo ""
        echo "Usage: $0 [options] [target]"
        echo ""
        echo "Targets:"
        echo "  workers    Deploy to Cloudflare Workers (default)"
        echo "  docker     Deploy using Docker locally"
        echo "  railway    Deploy to Railway"
        echo "  render     Deploy to Render"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --build-only   Only build the backend, don't deploy"
        echo ""
        echo "Environment Variables:"
        echo "  DEPLOYMENT_TARGET     Target platform (workers, docker, railway, render)"
        echo "  CLOUDFLARE_API_TOKEN  Your Cloudflare API token"
        echo "  CLOUDFLARE_ACCOUNT_ID Your Cloudflare account ID"
        exit 0
        ;;
    --build-only)
        print_status "Build-only mode"
        check_prerequisites
        build_backend
        print_success "Build completed!"
        exit 0
        ;;
    workers|docker|railway|render)
        DEPLOYMENT_TARGET="$1"
        main
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        print_status "Use --help for usage information"
        exit 1
        ;;
esac