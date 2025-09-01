#!/bin/bash

# Cloudflare Static Deployer - Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environments: development, staging, production

set -e

ENVIRONMENT=${1:-production}
PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Change to project root
cd "$PROJECT_ROOT"

# Validate environment
case $ENVIRONMENT in
  development|staging|production)
    echo "✅ Valid environment: $ENVIRONMENT"
    ;;
  *)
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Valid environments: development, staging, production"
    exit 1
    ;;
esac

# Check if required files exist
if [ ! -f ".env.$ENVIRONMENT.example" ] && [ "$ENVIRONMENT" != "development" ]; then
  echo "❌ Environment file .env.$ENVIRONMENT.example not found"
  exit 1
fi

if [ ! -f ".env.$ENVIRONMENT" ] && [ "$ENVIRONMENT" != "development" ]; then
  echo "⚠️  Environment file .env.$ENVIRONMENT not found"
  echo "Please copy .env.$ENVIRONMENT.example to .env.$ENVIRONMENT and configure it"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linting..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test

# Build the application
echo "🏗️  Building application..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
DEPLOY_DIR="deploy-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy built files
cp -r backend/dist "$DEPLOY_DIR/"
cp -r frontend/dist "$DEPLOY_DIR/public"
cp backend/package.json "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/package-root.json"

# Copy environment files
if [ -f ".env.$ENVIRONMENT" ]; then
  cp ".env.$ENVIRONMENT" "$DEPLOY_DIR/.env"
fi

# Copy deployment files
cp Dockerfile "$DEPLOY_DIR/"
cp docker-compose.yml "$DEPLOY_DIR/"
cp nginx.conf "$DEPLOY_DIR/"
cp .dockerignore "$DEPLOY_DIR/"

# Create deployment instructions
cat > "$DEPLOY_DIR/DEPLOY.md" << EOF
# Deployment Instructions for $ENVIRONMENT

## Quick Start with Docker

1. Ensure Docker and Docker Compose are installed
2. Configure environment variables in .env file
3. Run the application:

\`\`\`bash
# Using Docker Compose
docker-compose up -d

# Or using Docker directly
docker build -t cloudflare-static-deployer .
docker run -p 3000:3000 --env-file .env cloudflare-static-deployer
\`\`\`

## Manual Deployment

1. Install Node.js 18+ and npm
2. Install dependencies:
   \`\`\`bash
   npm ci --only=production
   \`\`\`
3. Start the application:
   \`\`\`bash
   NODE_ENV=$ENVIRONMENT node dist/index.js
   \`\`\`

## Environment Variables

Make sure to configure the following environment variables in your .env file:

- CLOUDFLARE_API_TOKEN: Your Cloudflare API token
- NODE_ENV: Set to '$ENVIRONMENT'
- PORT: Server port (default: 3000)
- HOST: Server host (default: 0.0.0.0)

## Health Check

The application provides a health check endpoint at:
http://localhost:3000/health

## Logs

Application logs are written to stdout/stderr and can be viewed with:
\`\`\`bash
docker-compose logs -f
\`\`\`

Generated on: $(date)
EOF

echo "✅ Deployment package created: $DEPLOY_DIR"
echo ""
echo "📋 Next steps:"
echo "1. Review the deployment package in $DEPLOY_DIR"
echo "2. Configure environment variables in $DEPLOY_DIR/.env"
echo "3. Deploy using Docker or manual deployment (see $DEPLOY_DIR/DEPLOY.md)"
echo ""
echo "🎉 Deployment preparation complete!"