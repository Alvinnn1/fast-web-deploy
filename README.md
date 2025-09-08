# Cloudflare Static Deployer

A user-friendly web application that simplifies deploying static websites to Cloudflare platform with comprehensive domain management capabilities. Designed for non-technical users who want to leverage Cloudflare's powerful infrastructure without dealing with complex configurations.

[中文](README_SIMPLIFIED.md)

## ✨ Features

### 🌐 Domain Management
- **Paginated Domain List**: View all your Cloudflare domains with pagination support (10 items per page)
- **Add New Domains**: Easily add domains to your Cloudflare account
- **Domain Details**: Comprehensive domain information and management
- **DNS Management**: View and edit DNS records with a simple interface
- **SSL Certificate Management**: View multiple SSL certificates with detailed information
- **Keep-Alive State**: Maintain data when switching between tabs for better UX

### 📄 Static Site Deployment
- **Paginated Pages List**: Create and manage Cloudflare Pages projects with pagination
- **Upload Deployment**: Deploy static sites by uploading files
- **Real-time Deployment Status**: Monitor deployment progress with live updates
- **Automatic URL Generation**: Get instant access URLs for deployed sites
- **State Persistence**: Page data persists when navigating between sections

### 🎨 User Experience
- **Purple Theme Design**: Clean, modern interface with purple accent colors
- **Responsive Layout**: Optimized for desktop usage with hover effects
- **Real-time Feedback**: Loading states and error handling throughout
- **Intuitive Navigation**: Tab-based interface with keep-alive functionality
- **Pagination Component**: Reusable pagination with smooth hover transitions
- **Global State Management**: Efficient data caching and state persistence

### 📊 Monitoring & Health Checks
- **Enhanced Health Checks**: Comprehensive system status monitoring
- **Real-time Dashboard**: CLI monitoring dashboard with live updates
- **Deployment Testing**: Automated post-deployment verification
- **Analytics Integration**: Cloudflare analytics and performance metrics
- **CI/CD Integration**: Automated testing in GitHub Actions workflows

## 🛠 Tech Stack

### Frontend
- **Vue 3** - Modern reactive framework with Composition API
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework for rapid styling
- **Radix Vue** - Accessible UI components
- **Lucide Vue** - Beautiful icon library
- **Vite** - Fast build tool and development server
- **Vue Keep-Alive** - Component state persistence across tab switches
- **Reactive State Management** - Global state with reactive composables

### Backend
- **Cloudflare Workers** - Serverless runtime for backend services
- **Wrangler** - Development and deployment tool for Workers
- **TypeScript** - Full type safety across the stack
- **Cloudflare API** - Direct integration with Cloudflare services
- **File Upload Handling** - Secure folder file processing
- **Pagination Support** - Server-side pagination for large datasets
- **Response Formatting** - Standardized API response structure

### Infrastructure
- **Node.js 18+** - Runtime environment
- **Cloudflare Workers** - Serverless backend deployment
- **Cloudflare Pages** - Static site hosting

## 📁 Project Structure

```
cloudflare-static-deployer/
├── frontend/                 # Vue 3 frontend application
│   ├── src/
│   │   ├── components/      # Reusable Vue components
│   │   │   └── ui/         # UI component library (Pagination, etc.)
│   │   ├── views/          # Page-level components
│   │   ├── composables/    # Vue composables for state management
│   │   ├── services/       # API client and utilities
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # Cloudflare Workers backend API
│   ├── src/
│   │   ├── adapters/       # API route handlers and external integrations
│   │   │   └── handlers/   # Domain and Pages API handlers
│   │   ├── utils/          # Utility functions (pagination, etc.)
│   │   └── types.ts        # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
├── scripts/                # Deployment and utility scripts
├── .kiro/                  # Kiro IDE specifications
└── package.json            # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Cloudflare Account** with API token
- **Wrangler CLI** (for Cloudflare Workers deployment)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cloudflare-static-deployer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file in backend directory with your Cloudflare API token
   # Required variables: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_EMAIL
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Frontend dev server: http://localhost:5173
   - Backend API server: http://localhost:3000 (Wrangler dev server)

### Production Deployment

See [DEPLOYMENT](DEPLOYMENT_SIMPLIFIED.md) for comprehensive deployment instructions.

#### Quick Cloudflare Deployment

```bash
# 1. Configure production environment
cp .env.production.example .env.production
# Edit .env.production with your settings

# 2. Deploy to Cloudflare Workers
npm run deploy:workers

# 3. Deploy frontend to Cloudflare Pages
npm run deploy:pages
```

## 🔧 Configuration

### Environment Variables

#### Development (.env)
```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Cloudflare API Configuration
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
```

#### Production (.env.production)
```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Cloudflare API Configuration
CLOUDFLARE_API_TOKEN=your_production_cloudflare_api_token_here

# Security Configuration
SESSION_SECRET=your_secure_session_secret_here
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional Configuration
LOG_LEVEL=info
MAX_FILE_SIZE=10485760  # 10MB
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000  # 15 minutes
```

### Cloudflare API Token Setup

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Custom token" with these permissions:
   - **Zone:Zone:Read** - For listing domains
   - **Zone:Zone Settings:Edit** - For domain configuration
   - **Zone:DNS:Edit** - For DNS management
   - **Cloudflare Pages:Edit** - For page deployment
4. Set appropriate zone resources (all zones or specific zones)
5. Copy the generated token to your environment file

## 📚 Available Scripts

### Root Level Scripts
```bash
# Development
npm run dev                    # Start both frontend and backend
npm run dev:frontend          # Start only frontend
npm run dev:backend           # Start only backend

# Building
npm run build                 # Build both projects
npm run build:frontend        # Build only frontend
npm run build:backend         # Build only backend

# Quality Assurance
npm run lint                  # Lint both projects
npm run test                  # Test both projects

# Production
npm run start                 # Start production server
npm run start:production      # Start with production environment

# Deployment
npm run deploy:workers        # Deploy backend to Cloudflare Workers
npm run deploy:pages          # Deploy frontend to Cloudflare Pages
npm run deploy:prepare        # Prepare deployment package
```

### Frontend Scripts
```bash
cd frontend

npm run dev                   # Start development server
npm run build                 # Build for production
npm run preview               # Preview production build
npm run lint                  # Run ESLint
npm run test                  # Run unit tests
npm run type-check            # TypeScript type checking
```

### Backend Scripts
```bash
cd backend

npm run dev                   # Start Wrangler development server
npm run build                 # Compile TypeScript to JavaScript
npm run wrangler:dev          # Start Wrangler development server
npm run wrangler:deploy       # Deploy to Cloudflare Workers
npm run wrangler:tail         # View Workers logs
npm run lint                  # Run ESLint
npm run type-check            # TypeScript type checking
```

## 🔌 API Documentation

### Domain Management Endpoints

#### Get Domains (with Pagination)
```http
GET /api/domains?page=1&per_page=10
```
Returns paginated list of domains in your Cloudflare account.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 25,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

#### Add Domain
```http
POST /api/domains
Content-Type: application/json

{
  "name": "example.com",
  "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"]
}
```

#### Get Domain Details
```http
GET /api/domains/:id
```

#### Manage DNS Records
```http
GET /api/domains/:id/dns-records
PUT /api/domains/:id/dns-records/:recordId
```

#### SSL Certificate Management
```http
GET /api/domains/:id/ssl-certificates
```
Get all SSL certificates for a domain.

```http
POST /api/domains/:id/ssl-certificate
```
Request a new SSL certificate for a domain.

### Page Management Endpoints

#### Get Pages (with Pagination)
```http
GET /api/pages?page=1&per_page=10
```
Returns paginated list of Cloudflare Pages projects.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 10, max: 50)

**Response:** Same pagination structure as domains endpoint.

#### Create Page Project
```http
POST /api/pages
Content-Type: application/json

{
  "name": "my-website"
}
```

#### Deploy Page
```http
POST /api/pages/:id/deploy
Content-Type: multipart/form-data

file: [ file containing static website]
```

#### Get Deployment Status
```http
GET /api/pages/:id/deployment-status
```

### Health Check
```http
GET /health
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run frontend tests only
cd frontend && npm run test

# Run backend tests only
cd backend && npm run test

# Watch mode for development
npm run test:watch
```

### Test Coverage
- Frontend: Unit tests for components and utilities
- Backend: API endpoint tests and integration tests
- End-to-end: Critical user flows

## 🐛 Troubleshooting

### Common Issues

1. **"Port 3000 already in use"**
   ```bash
   # Find and kill process using port 3000
   lsof -i :3000
   kill -9 <PID>
   ```

2. **"Cloudflare API authentication failed"**
   - Verify your API token is correct
   - Check token permissions include required scopes
   - Ensure token hasn't expired

3. **"File upload fails"**
   - Check file size (must be < 10MB)
   - Verify folder contains valid static website files

4. **"Frontend can't connect to backend"**
   - Ensure backend is running on port 3000
   - Check CORS configuration
   - Verify API proxy settings in vite.config.ts

### Getting Help

1. Check the [Deployment Guide](DEPLOYMENT_SIMPLIFIED.md)
2. Review application logs
3. Verify environment configuration
4. Test Cloudflare API connectivity manually

## 🔒 Security Considerations

- **API Token Security**: Never expose Cloudflare API tokens in frontend code
- **File Upload Validation**: All uploaded files are validated for type and size
- **CORS Configuration**: Properly configured for production domains
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **Input Validation**: All user inputs are validated and sanitized

## 🚀 Deployment Options

1. **Cloudflare Workers (Recommended)**: Serverless backend deployment
2. **Cloudflare Pages**: Static frontend hosting
3. **Manual Deployment**: Traditional server deployment
4. **Cloud Platforms**: Heroku, Railway, DigitalOcean App Platform

See [DEPLOYMENT](DEPLOYMENT_SIMPLIFIED.md) for detailed instructions.

## 📈 Performance

- **Frontend**: Optimized Vue 3 build with code splitting and keep-alive caching
- **Backend**: Cloudflare Workers serverless runtime with pagination support
- **State Management**: Reactive global state for efficient data persistence
- **Caching**: Appropriate HTTP caching headers and component state caching
- **Compression**: Gzip compression for all text assets
- **CDN**: Cloudflare CDN for global performance
- **UI Components**: Reusable components with smooth hover transitions

## 🤝 Contributing

This is a private project. For internal development:

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## 📄 License

Private project - All rights reserved

## 🙏 Acknowledgments

- **Cloudflare** - For providing excellent APIs and infrastructure
- **Vue.js Team** - For the amazing Vue 3 framework
- **Cloudflare Workers Team** - For the serverless runtime platform
- **Tailwind CSS** - For the utility-first CSS framework