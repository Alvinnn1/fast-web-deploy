#!/bin/bash

# Static frontend deployment script for Cloudflare Pages (no Workers)
set -e

echo "🚀 Starting static frontend deployment..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Set environment (default to production)
ENVIRONMENT=${1:-production}
echo "📦 Deploying static site to environment: $ENVIRONMENT"

# Run pre-deployment checks
echo "🔍 Running pre-deployment checks..."
npm run deploy:prepare

# Build static assets for the specified environment
echo "🏗️  Building static assets for $ENVIRONMENT..."
if [ "$ENVIRONMENT" = "staging" ]; then
    npm run build:staging
else
    npm run build:prod
fi

# Verify build output
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "📊 Build statistics:"
du -sh dist/
find dist -name "*.js" -o -name "*.css" | wc -l | xargs echo "Asset files:"

# Deploy static site to Cloudflare Pages
echo "☁️  Deploying static site to Cloudflare Pages..."
if [ "$ENVIRONMENT" = "staging" ]; then
    wrangler pages deploy dist --project-name=cloudflare-static-deployer --env=staging
else
    wrangler pages deploy dist --project-name=cloudflare-static-deployer
fi

echo "✅ Static deployment completed successfully!"
echo "🌐 Your static website should be available at your Cloudflare Pages URL"
echo "📝 Note: This is a pure static deployment - no server-side functions or Workers"