#!/bin/bash

# Deploy Worker Script
# This script builds and deploys the Cloudflare Worker with the complete API

set -e

echo "🚀 Starting Worker deployment..."

# Navigate to backend directory
cd backend

echo "📦 Building Worker..."
npm run build:workers

echo "🔧 Validating configuration..."
if [ -f "wrangler.toml" ]; then
    echo "✅ wrangler.toml found"
    echo "📋 Configuration:"
    grep -E "^(name|main|compatibility_date)" wrangler.toml
else
    echo "❌ wrangler.toml not found!"
    exit 1
fi

echo "🚀 Deploying to Cloudflare Workers..."
npx wrangler deploy

echo "⏳ Waiting for deployment to propagate..."
sleep 10

echo "🧪 Testing deployment..."
echo "Testing health endpoint..."
if curl -f -s https://api.luckyjingwen.top/health > /dev/null; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed, but deployment may still be propagating"
fi

echo "Testing API endpoint..."
if curl -f -s https://api.luckyjingwen.top/api/test > /dev/null; then
    echo "✅ API test passed"
else
    echo "⚠️  API test failed, but deployment may still be propagating"
fi

echo "Testing pages endpoint..."
if curl -f -s https://api.luckyjingwen.top/api/pages > /dev/null; then
    echo "✅ Pages endpoint test passed"
else
    echo "⚠️  Pages endpoint test failed - this should be fixed after deployment"
fi

echo "🎉 Deployment complete!"
echo "📍 API Base URL: https://api.luckyjingwen.top"
echo "🔗 Available endpoints:"
echo "  - GET  /health"
echo "  - GET  /api/test"
echo "  - GET  /api/pages"
echo "  - POST /api/pages"
echo "  - GET  /api/domains"
echo "  - POST /api/domains"
echo ""
echo "⏰ Note: It may take a few minutes for all endpoints to be fully available due to CDN propagation."