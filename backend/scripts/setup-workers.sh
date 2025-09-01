#!/bin/bash

# Cloudflare Workers Setup Script
# This script helps set up the required Cloudflare resources for Workers deployment

set -e

echo "🚀 Setting up Cloudflare Workers resources..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    print_warning "You are not logged in to Cloudflare. Please login first:"
    echo "wrangler login"
    exit 1
fi

print_status "Creating KV namespaces..."

# Create KV namespaces for cache
echo "Creating CACHE KV namespace..."
CACHE_KV_OUTPUT=$(wrangler kv:namespace create "CACHE" 2>/dev/null || echo "")
if [[ $CACHE_KV_OUTPUT == *"id"* ]]; then
    CACHE_KV_ID=$(echo "$CACHE_KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
    print_success "CACHE KV namespace created with ID: $CACHE_KV_ID"
else
    print_warning "CACHE KV namespace might already exist or creation failed"
fi

# Create KV namespace for cache preview
echo "Creating CACHE preview KV namespace..."
CACHE_KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "CACHE" --preview 2>/dev/null || echo "")
if [[ $CACHE_KV_PREVIEW_OUTPUT == *"preview_id"* ]]; then
    CACHE_KV_PREVIEW_ID=$(echo "$CACHE_KV_PREVIEW_OUTPUT" | grep -o 'preview_id = "[^"]*"' | cut -d'"' -f2)
    print_success "CACHE preview KV namespace created with ID: $CACHE_KV_PREVIEW_ID"
else
    print_warning "CACHE preview KV namespace might already exist or creation failed"
fi

# Create KV namespaces for sessions
echo "Creating SESSIONS KV namespace..."
SESSIONS_KV_OUTPUT=$(wrangler kv:namespace create "SESSIONS" 2>/dev/null || echo "")
if [[ $SESSIONS_KV_OUTPUT == *"id"* ]]; then
    SESSIONS_KV_ID=$(echo "$SESSIONS_KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
    print_success "SESSIONS KV namespace created with ID: $SESSIONS_KV_ID"
else
    print_warning "SESSIONS KV namespace might already exist or creation failed"
fi

# Create KV namespace for sessions preview
echo "Creating SESSIONS preview KV namespace..."
SESSIONS_KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "SESSIONS" --preview 2>/dev/null || echo "")
if [[ $SESSIONS_KV_PREVIEW_OUTPUT == *"preview_id"* ]]; then
    SESSIONS_KV_PREVIEW_ID=$(echo "$SESSIONS_KV_PREVIEW_OUTPUT" | grep -o 'preview_id = "[^"]*"' | cut -d'"' -f2)
    print_success "SESSIONS preview KV namespace created with ID: $SESSIONS_KV_PREVIEW_ID"
else
    print_warning "SESSIONS preview KV namespace might already exist or creation failed"
fi

print_status "Creating D1 database..."

# Create D1 database
D1_OUTPUT=$(wrangler d1 create cloudflare-deployer-db 2>/dev/null || echo "")
if [[ $D1_OUTPUT == *"database_id"* ]]; then
    D1_DATABASE_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)
    print_success "D1 database created with ID: $D1_DATABASE_ID"
else
    print_warning "D1 database might already exist or creation failed"
fi

print_status "Creating R2 buckets..."

# Create R2 bucket for uploads
wrangler r2 bucket create cloudflare-deployer-uploads 2>/dev/null && \
    print_success "R2 bucket 'cloudflare-deployer-uploads' created" || \
    print_warning "R2 bucket might already exist or creation failed"

# Create R2 bucket for uploads preview
wrangler r2 bucket create cloudflare-deployer-uploads-preview 2>/dev/null && \
    print_success "R2 preview bucket 'cloudflare-deployer-uploads-preview' created" || \
    print_warning "R2 preview bucket might already exist or creation failed"

print_status "Setting up secrets..."

# Prompt for secrets
echo ""
print_warning "Please set the following secrets using wrangler secret put:"
echo "wrangler secret put CLOUDFLARE_API_TOKEN"
echo "wrangler secret put CLOUDFLARE_ACCOUNT_ID"
echo "wrangler secret put CLOUDFLARE_EMAIL"
echo ""

print_status "Updating wrangler.toml with resource IDs..."

# Update wrangler.toml with the created resource IDs
if [[ -n "$CACHE_KV_ID" ]]; then
    sed -i.bak "s/your_cache_kv_namespace_id/$CACHE_KV_ID/g" wrangler.toml
fi

if [[ -n "$CACHE_KV_PREVIEW_ID" ]]; then
    sed -i.bak "s/your_cache_kv_preview_id/$CACHE_KV_PREVIEW_ID/g" wrangler.toml
fi

if [[ -n "$SESSIONS_KV_ID" ]]; then
    sed -i.bak "s/your_sessions_kv_namespace_id/$SESSIONS_KV_ID/g" wrangler.toml
fi

if [[ -n "$SESSIONS_KV_PREVIEW_ID" ]]; then
    sed -i.bak "s/your_sessions_kv_preview_id/$SESSIONS_KV_PREVIEW_ID/g" wrangler.toml
fi

if [[ -n "$D1_DATABASE_ID" ]]; then
    sed -i.bak "s/your_d1_database_id/$D1_DATABASE_ID/g" wrangler.toml
fi

# Clean up backup files
rm -f wrangler.toml.bak

print_success "Cloudflare Workers setup completed!"
echo ""
print_status "Next steps:"
echo "1. Set the required secrets using the commands shown above"
echo "2. Update the domain names in wrangler.toml to match your actual domains"
echo "3. Run 'npm run wrangler:dev' to test locally"
echo "4. Run 'npm run wrangler:deploy' to deploy to production"
echo ""
print_warning "Don't forget to update the resource IDs for development and staging environments in wrangler.toml"