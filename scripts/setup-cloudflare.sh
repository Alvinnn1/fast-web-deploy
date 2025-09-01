#!/bin/bash

# Cloudflare Setup Script
# This script automates the initial setup and configuration for Cloudflare services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="cloudflare-static-deployer"
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"

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

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to prompt for user input
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default_value="$3"
    
    if [ -n "$default_value" ]; then
        read -p "$prompt [$default_value]: " input
        eval "$var_name=\"\${input:-$default_value}\""
    else
        read -p "$prompt: " input
        eval "$var_name=\"$input\""
    fi
}

# Function to prompt for sensitive input (hidden)
prompt_secret() {
    local prompt="$1"
    local var_name="$2"
    
    read -s -p "$prompt: " input
    echo  # New line after hidden input
    eval "$var_name=\"$input\""
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command_exists wrangler; then
        print_status "Installing Wrangler CLI..."
        npm install -g wrangler
    fi
    
    print_success "Prerequisites check completed"
}

# Function to authenticate with Cloudflare
authenticate_cloudflare() {
    print_header "Cloudflare Authentication"
    
    print_status "Checking Cloudflare authentication..."
    
    if wrangler whoami >/dev/null 2>&1; then
        print_success "Already authenticated with Cloudflare"
        CURRENT_USER=$(wrangler whoami | head -1)
        print_status "Current user: $CURRENT_USER"
        
        prompt_input "Continue with current authentication? (y/n)" CONTINUE_AUTH "y"
        if [ "$CONTINUE_AUTH" != "y" ] && [ "$CONTINUE_AUTH" != "Y" ]; then
            print_status "Logging out current user..."
            wrangler logout
        else
            return 0
        fi
    fi
    
    print_status "Please choose authentication method:"
    echo "1. Browser login (recommended)"
    echo "2. API token"
    
    prompt_input "Choose method (1 or 2)" AUTH_METHOD "1"
    
    case "$AUTH_METHOD" in
        1)
            print_status "Opening browser for authentication..."
            wrangler login
            ;;
        2)
            prompt_secret "Enter your Cloudflare API token" API_TOKEN
            export CLOUDFLARE_API_TOKEN="$API_TOKEN"
            
            # Verify token
            if wrangler whoami >/dev/null 2>&1; then
                print_success "API token authentication successful"
            else
                print_error "API token authentication failed"
                exit 1
            fi
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    print_success "Cloudflare authentication completed"
}

# Function to get account information
get_account_info() {
    print_header "Account Information"
    
    print_status "Retrieving account information..."
    
    # Get account ID
    ACCOUNT_ID=$(wrangler whoami | grep -o 'Account ID: [^,]*' | cut -d' ' -f3 || echo "")
    
    if [ -n "$ACCOUNT_ID" ]; then
        print_success "Account ID: $ACCOUNT_ID"
    else
        prompt_input "Enter your Cloudflare Account ID" ACCOUNT_ID
    fi
    
    # Export for use in other functions
    export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
}

# Function to setup Cloudflare Pages
setup_pages() {
    print_header "Setting up Cloudflare Pages"
    
    cd "$FRONTEND_DIR"
    
    # Check if wrangler.toml already exists
    if [ -f "wrangler.toml" ]; then
        print_warning "wrangler.toml already exists"
        prompt_input "Overwrite existing configuration? (y/n)" OVERWRITE "n"
        if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
            print_status "Skipping Pages configuration"
            cd ..
            return 0
        fi
    fi
    
    # Get project configuration
    prompt_input "Enter project name" PAGES_PROJECT_NAME "$PROJECT_NAME"
    prompt_input "Enter custom domain (optional)" CUSTOM_DOMAIN ""
    
    # Create wrangler.toml for Pages
    cat > wrangler.toml << EOF
name = "$PAGES_PROJECT_NAME"
compatibility_date = "$(date +%Y-%m-%d)"

[env.production]
account_id = "$CLOUDFLARE_ACCOUNT_ID"

[env.production.vars]
NODE_ENV = "production"
EOF
    
    if [ -n "$CUSTOM_DOMAIN" ]; then
        echo "VITE_API_BASE_URL = \"https://api.$CUSTOM_DOMAIN\"" >> wrangler.toml
    fi
    
    # Create or update _routes.json
    if [ ! -f "_routes.json" ]; then
        cat > _routes.json << EOF
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/api/*"]
}
EOF
    fi
    
    # Create Pages project
    print_status "Creating Cloudflare Pages project..."
    wrangler pages project create "$PAGES_PROJECT_NAME" || {
        print_warning "Project might already exist, continuing..."
    }
    
    cd ..
    print_success "Cloudflare Pages setup completed"
}

# Function to setup Cloudflare Workers
setup_workers() {
    print_header "Setting up Cloudflare Workers"
    
    cd "$BACKEND_DIR"
    
    # Check if wrangler.toml already exists
    if [ -f "wrangler.toml" ]; then
        print_warning "wrangler.toml already exists"
        prompt_input "Overwrite existing configuration? (y/n)" OVERWRITE "n"
        if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
            print_status "Skipping Workers configuration"
            cd ..
            return 0
        fi
    fi
    
    # Get worker configuration
    prompt_input "Enter worker name" WORKER_NAME "$PROJECT_NAME-api"
    prompt_input "Enter custom domain for API (optional)" API_DOMAIN ""
    
    # Create wrangler.toml for Workers
    cat > wrangler.toml << EOF
name = "$WORKER_NAME"
main = "worker.ts"
compatibility_date = "$(date +%Y-%m-%d)"
account_id = "$CLOUDFLARE_ACCOUNT_ID"

[env.production]
name = "$WORKER_NAME"

[env.production.vars]
NODE_ENV = "production"
CORS_ORIGINS = "https://$PAGES_PROJECT_NAME.pages.dev"

# Uncomment and configure if using KV storage
# [[env.production.kv_namespaces]]
# binding = "KV_STORE"
# id = "your-kv-namespace-id"

# Uncomment and configure if using D1 database
# [[env.production.d1_databases]]
# binding = "DB"
# database_name = "your-database-name"
# database_id = "your-database-id"
EOF
    
    if [ -n "$API_DOMAIN" ]; then
        cat >> wrangler.toml << EOF

[[env.production.routes]]
pattern = "$API_DOMAIN/*"
zone_name = "$(echo "$API_DOMAIN" | cut -d'.' -f2-)"
EOF
    fi
    
    cd ..
    print_success "Cloudflare Workers setup completed"
}

# Function to create environment files
create_env_files() {
    print_header "Creating Environment Files"
    
    # Frontend environment file
    if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
        print_status "Creating frontend production environment file..."
        
        API_URL="https://$WORKER_NAME.$CLOUDFLARE_ACCOUNT_ID.workers.dev"
        if [ -n "$API_DOMAIN" ]; then
            API_URL="https://$API_DOMAIN"
        fi
        
        cat > "$FRONTEND_DIR/.env.production" << EOF
# Frontend Production Environment Variables
VITE_API_BASE_URL=$API_URL
VITE_CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID
NODE_ENV=production
EOF
        print_success "Frontend environment file created"
    else
        print_warning "Frontend .env.production already exists"
    fi
    
    # Backend environment file
    if [ ! -f "$BACKEND_DIR/.env.workers" ]; then
        print_status "Creating backend workers environment file..."
        
        cat > "$BACKEND_DIR/.env.workers" << EOF
# Backend Workers Environment Variables
NODE_ENV=production
CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID
CORS_ORIGINS=https://$PAGES_PROJECT_NAME.pages.dev
EOF
        print_success "Backend environment file created"
    else
        print_warning "Backend .env.workers already exists"
    fi
}

# Function to setup custom domains
setup_custom_domains() {
    print_header "Custom Domain Setup"
    
    if [ -z "$CUSTOM_DOMAIN" ] && [ -z "$API_DOMAIN" ]; then
        print_status "No custom domains specified, skipping domain setup"
        return 0
    fi
    
    print_status "Custom domain setup requires manual configuration:"
    echo ""
    
    if [ -n "$CUSTOM_DOMAIN" ]; then
        echo "Frontend Domain: $CUSTOM_DOMAIN"
        echo "1. Go to Cloudflare Pages dashboard"
        echo "2. Select your project: $PAGES_PROJECT_NAME"
        echo "3. Go to Custom domains tab"
        echo "4. Add custom domain: $CUSTOM_DOMAIN"
        echo ""
    fi
    
    if [ -n "$API_DOMAIN" ]; then
        echo "API Domain: $API_DOMAIN"
        echo "1. Ensure the domain is added to your Cloudflare account"
        echo "2. The worker route is already configured in wrangler.toml"
        echo "3. Deploy the worker to activate the route"
        echo ""
    fi
    
    print_warning "Remember to update DNS records to point to Cloudflare"
}

# Function to run initial tests
run_tests() {
    print_header "Running Initial Tests"
    
    # Test frontend build
    print_status "Testing frontend build..."
    cd "$FRONTEND_DIR"
    npm install >/dev/null 2>&1 || {
        print_error "Frontend npm install failed"
        exit 1
    }
    npm run build >/dev/null 2>&1 || {
        print_error "Frontend build failed"
        exit 1
    }
    cd ..
    print_success "Frontend build test passed"
    
    # Test backend build
    print_status "Testing backend build..."
    cd "$BACKEND_DIR"
    npm install >/dev/null 2>&1 || {
        print_error "Backend npm install failed"
        exit 1
    }
    npm run build >/dev/null 2>&1 || {
        print_error "Backend build failed"
        exit 1
    }
    cd ..
    print_success "Backend build test passed"
}

# Function to display summary
display_summary() {
    print_header "Setup Summary"
    
    echo "✅ Cloudflare authentication completed"
    echo "✅ Account ID configured: $CLOUDFLARE_ACCOUNT_ID"
    echo "✅ Pages project configured: $PAGES_PROJECT_NAME"
    echo "✅ Workers configured: $WORKER_NAME"
    echo "✅ Environment files created"
    echo "✅ Build tests passed"
    echo ""
    
    print_status "Next steps:"
    echo "1. Review and customize the generated configuration files"
    echo "2. Set up any required secrets (API tokens, database credentials)"
    echo "3. Run deployment scripts:"
    echo "   - ./scripts/deploy-frontend.sh"
    echo "   - ./scripts/deploy-backend.sh"
    echo ""
    
    if [ -n "$CUSTOM_DOMAIN" ] || [ -n "$API_DOMAIN" ]; then
        print_warning "Don't forget to configure custom domains in Cloudflare dashboard"
    fi
    
    print_success "Cloudflare setup completed successfully!"
}

# Main setup function
main() {
    print_header "Cloudflare Setup Script"
    print_status "This script will help you set up Cloudflare Pages and Workers for your project"
    echo ""
    
    # Check if we're in the project root
    if [ ! -d "$FRONTEND_DIR" ] || [ ! -d "$BACKEND_DIR" ]; then
        print_error "Frontend or backend directory not found. Please run this script from the project root."
        exit 1
    fi
    
    check_prerequisites
    authenticate_cloudflare
    get_account_info
    setup_pages
    setup_workers
    create_env_files
    setup_custom_domains
    run_tests
    display_summary
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Cloudflare Setup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h        Show this help message"
        echo "  --auth-only       Only handle authentication"
        echo "  --pages-only      Only setup Cloudflare Pages"
        echo "  --workers-only    Only setup Cloudflare Workers"
        echo ""
        echo "This script will guide you through:"
        echo "  - Cloudflare authentication"
        echo "  - Pages project setup"
        echo "  - Workers configuration"
        echo "  - Environment file creation"
        echo "  - Custom domain setup guidance"
        exit 0
        ;;
    --auth-only)
        print_status "Authentication-only mode"
        check_prerequisites
        authenticate_cloudflare
        get_account_info
        print_success "Authentication completed!"
        exit 0
        ;;
    --pages-only)
        print_status "Pages-only setup mode"
        check_prerequisites
        authenticate_cloudflare
        get_account_info
        setup_pages
        print_success "Pages setup completed!"
        exit 0
        ;;
    --workers-only)
        print_status "Workers-only setup mode"
        check_prerequisites
        authenticate_cloudflare
        get_account_info
        setup_workers
        print_success "Workers setup completed!"
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