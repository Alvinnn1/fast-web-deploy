#!/bin/bash

# Frontend Deployment Script for Cloudflare Pages
# This script automates the deployment of the Vue.js frontend to Cloudflare Pages

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
BUILD_DIR="dist"
PROJECT_NAME="cloudflare-static-deployer"

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
    
    if ! command_exists wrangler; then
        print_error "Wrangler CLI is not installed. Installing..."
        npm install -g wrangler
    fi
    
    print_success "Prerequisites check completed"
}

# Function to build frontend
build_frontend() {
    print_status "Building frontend application..."
    
    cd "$FRONTEND_DIR"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Run tests
    print_status "Running tests..."
    npm run test:run || {
        print_warning "Tests failed, but continuing with deployment..."
    }
    
    # Build the application
    print_status "Building application..."
    npm run build
    
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build failed - $BUILD_DIR directory not found"
        exit 1
    fi
    
    cd ..
    print_success "Frontend build completed"
}

# Function to deploy to Cloudflare Pages
deploy_to_pages() {
    print_status "Deploying to Cloudflare Pages..."
    
    cd "$FRONTEND_DIR"
    
    # Check if wrangler.toml exists
    if [ ! -f "wrangler.toml" ]; then
        print_error "wrangler.toml not found in frontend directory"
        exit 1
    fi
    
    # Deploy using wrangler
    print_status "Uploading to Cloudflare Pages..."
    wrangler pages deploy "$BUILD_DIR" --project-name="$PROJECT_NAME" --compatibility-date="$(date +%Y-%m-%d)"
    
    cd ..
    print_success "Deployment to Cloudflare Pages completed"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Get the deployment URL from wrangler
    cd "$FRONTEND_DIR"
    DEPLOYMENT_URL=$(wrangler pages deployment list --project-name="$PROJECT_NAME" --format=json | head -1 | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    cd ..
    
    if [ -n "$DEPLOYMENT_URL" ]; then
        print_success "Deployment successful!"
        print_status "Frontend URL: $DEPLOYMENT_URL"
        
        # Optional: Open in browser (uncomment if desired)
        # open "$DEPLOYMENT_URL" 2>/dev/null || xdg-open "$DEPLOYMENT_URL" 2>/dev/null || true
    else
        print_warning "Could not retrieve deployment URL"
    fi
}

# Main deployment function
main() {
    print_status "Starting frontend deployment process..."
    
    # Check if we're in the project root
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found. Please run this script from the project root."
        exit 1
    fi
    
    check_prerequisites
    build_frontend
    deploy_to_pages
    verify_deployment
    
    print_success "Frontend deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Frontend Deployment Script for Cloudflare Pages"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --build-only   Only build the frontend, don't deploy"
        echo "  --deploy-only  Only deploy (assumes build is already done)"
        echo ""
        echo "Environment Variables:"
        echo "  CLOUDFLARE_API_TOKEN  Your Cloudflare API token"
        echo "  CLOUDFLARE_ACCOUNT_ID Your Cloudflare account ID"
        exit 0
        ;;
    --build-only)
        print_status "Build-only mode"
        check_prerequisites
        build_frontend
        print_success "Build completed!"
        exit 0
        ;;
    --deploy-only)
        print_status "Deploy-only mode"
        check_prerequisites
        deploy_to_pages
        verify_deployment
        print_success "Deploy completed!"
        exit 0
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