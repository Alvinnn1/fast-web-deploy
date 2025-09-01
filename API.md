# API Documentation

This document provides comprehensive documentation for the Cloudflare Static Deployer API.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

The API uses Cloudflare API tokens for authentication. The token is configured server-side and not exposed to clients.

## Response Format

All API responses follow a consistent format:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    details?: any;
  };
}
```

### Success Response Example
```json
{
  "success": true,
  "data": {
    "id": "domain123",
    "name": "example.com",
    "status": "active"
  },
  "message": "Domain retrieved successfully"
}
```

### Error Response Example
```json
{
  "success": false,
  "message": "Domain not found",
  "error": {
    "code": "DOMAIN_NOT_FOUND",
    "details": {
      "domainId": "invalid123"
    }
  }
}
```

## Health Check

### GET /health

Check if the API server is running and healthy.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "message": "Server is healthy"
}
```

## Domain Management

### GET /api/domains

Retrieve all domains from your Cloudflare account.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "zone123",
      "name": "example.com",
      "status": "active",
      "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "modifiedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Domains retrieved successfully"
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error or Cloudflare API error

### POST /api/domains

Add a new domain to your Cloudflare account.

**Request Body:**
```json
{
  "name": "example.com",
  "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"]
}
```

**Parameters:**
- `name` (string, required) - The domain name to add
- `nameservers` (string[], optional) - Custom nameservers for the domain

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "zone123",
    "name": "example.com",
    "status": "pending",
    "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "modifiedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Domain added successfully"
}
```

**Status Codes:**
- `201` - Domain created successfully
- `400` - Invalid request data
- `409` - Domain already exists
- `500` - Server error

**Error Examples:**
```json
{
  "success": false,
  "message": "Invalid domain name format",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "name",
      "value": "invalid-domain"
    }
  }
}
```

### GET /api/domains/:id

Get detailed information about a specific domain.

**Parameters:**
- `id` (string) - The Cloudflare zone ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "zone123",
    "name": "example.com",
    "status": "active",
    "nameservers": ["ns1.cloudflare.com", "ns2.cloudflare.com"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "modifiedAt": "2024-01-01T00:00:00.000Z",
    "dnsRecords": [
      {
        "id": "record123",
        "type": "A",
        "name": "example.com",
        "content": "192.0.2.1",
        "ttl": 300,
        "proxied": true
      }
    ],
    "sslCertificate": {
      "id": "cert123",
      "status": "active",
      "issuer": "Let's Encrypt",
      "expiresAt": "2024-12-31T23:59:59.000Z"
    }
  },
  "message": "Domain details retrieved successfully"
}
```

**Status Codes:**
- `200` - Success
- `404` - Domain not found
- `500` - Server error

### GET /api/domains/:id/dns-records

Get all DNS records for a specific domain.

**Parameters:**
- `id` (string) - The Cloudflare zone ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "record123",
      "type": "A",
      "name": "example.com",
      "content": "192.0.2.1",
      "ttl": 300,
      "proxied": true
    },
    {
      "id": "record124",
      "type": "CNAME",
      "name": "www.example.com",
      "content": "example.com",
      "ttl": 300,
      "proxied": true
    }
  ],
  "message": "DNS records retrieved successfully"
}
```

### POST /api/domains/:id/dns-records

Create a new DNS record for a specific domain.

**Parameters:**
- `id` (string) - The Cloudflare zone ID

**Request Body:**
```json
{
  "type": "A",
  "name": "subdomain.example.com",
  "content": "192.0.2.1",
  "ttl": 300,
  "proxied": true
}
```

**Parameters:**
- `type` (string, required) - DNS record type (A, AAAA, CNAME, MX, TXT, NS)
- `name` (string, required) - DNS record name/subdomain
- `content` (string, required) - DNS record content/value
- `ttl` (number, optional) - Time to live in seconds (default: 1)
- `proxied` (boolean, optional) - Whether to proxy through Cloudflare (only for A/AAAA records)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "record125",
    "type": "A",
    "name": "subdomain.example.com",
    "content": "192.0.2.1",
    "ttl": 300,
    "proxied": true
  },
  "message": "DNS record created successfully"
}
```

**Status Codes:**
- `201` - Record created successfully
- `400` - Invalid request data
- `404` - Domain not found
- `409` - Record already exists
- `500` - Server error

**Error Examples:**
```json
{
  "success": false,
  "message": "Invalid DNS record type",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "type",
      "value": "INVALID"
    }
  }
}
```

### PUT /api/domains/:id/dns-records/:recordId

Update a specific DNS record.

**Parameters:**
- `id` (string) - The Cloudflare zone ID
- `recordId` (string) - The DNS record ID

**Request Body:**
```json
{
  "type": "A",
  "name": "example.com",
  "content": "192.0.2.2",
  "ttl": 300,
  "proxied": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "record123",
    "type": "A",
    "name": "example.com",
    "content": "192.0.2.2",
    "ttl": 300,
    "proxied": true
  },
  "message": "DNS record updated successfully"
}
```

**Status Codes:**
- `200` - Record updated successfully
- `400` - Invalid request data
- `404` - Record not found
- `500` - Server error

### DELETE /api/domains/:id/dns-records/:recordId

Delete a specific DNS record.

**Parameters:**
- `id` (string) - The Cloudflare zone ID
- `recordId` (string) - The DNS record ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "record123"
  },
  "message": "DNS record deleted successfully"
}
```

**Status Codes:**
- `200` - Record deleted successfully
- `404` - Record or domain not found
- `500` - Server error

**Error Examples:**
```json
{
  "success": false,
  "message": "DNS record not found",
  "error": {
    "code": "NOT_FOUND_ERROR",
    "details": {
      "recordId": "invalid123"
    }
  }
}
```

### POST /api/domains/:id/ssl-certificate

Request an SSL certificate for a domain.

**Parameters:**
- `id` (string) - The Cloudflare zone ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cert123",
    "status": "pending",
    "issuer": "Let's Encrypt",
    "requestedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "SSL certificate requested successfully"
}
```

## Page Management

### GET /api/pages

Get all Cloudflare Pages projects.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "page123",
      "name": "my-website",
      "status": "deployed",
      "url": "https://my-website.pages.dev",
      "deploymentId": "deploy123",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastDeployedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "message": "Pages retrieved successfully"
}
```

### POST /api/pages

Create a new Cloudflare Pages project.

**Request Body:**
```json
{
  "name": "my-new-website"
}
```

**Parameters:**
- `name` (string, required) - The project name (must be unique and URL-safe)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "page124",
    "name": "my-new-website",
    "status": "created",
    "url": "https://my-new-website.pages.dev",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Page project created successfully"
}
```

**Status Codes:**
- `201` - Project created successfully
- `400` - Invalid project name
- `409` - Project name already exists
- `500` - Server error

### POST /api/pages/:id/deploy

Deploy a ZIP file to a Cloudflare Pages project.

**Parameters:**
- `id` (string) - The Cloudflare Pages project ID

**Request:**
- Content-Type: `multipart/form-data`
- Body: ZIP file containing static website files

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "deploy124",
    "status": "queued",
    "url": "https://my-website.pages.dev",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Deployment started successfully"
}
```

**Status Codes:**
- `202` - Deployment accepted and queued
- `400` - Invalid file or file too large
- `404` - Project not found
- `500` - Server error

**File Requirements:**
- Format: ZIP archive
- Maximum size: 10MB
- Must contain valid static website files (HTML, CSS, JS, images, etc.)

### GET /api/pages/:id/deployment-status

Get the current deployment status for a project.

**Parameters:**
- `id` (string) - The Cloudflare Pages project ID

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "progress": 100,
    "url": "https://my-website.pages.dev",
    "logs": [
      "Building project...",
      "Deploying to Cloudflare Pages...",
      "Deployment successful!"
    ],
    "completedAt": "2024-01-01T00:05:00.000Z"
  },
  "message": "Deployment status retrieved successfully"
}
```

**Deployment Status Values:**
- `queued` - Deployment is queued
- `building` - Project is being built
- `deploying` - Files are being deployed
- `success` - Deployment completed successfully
- `failure` - Deployment failed

**Error Response for Failed Deployment:**
```json
{
  "success": true,
  "data": {
    "status": "failure",
    "progress": 50,
    "errorMessage": "Build failed: Missing index.html file",
    "logs": [
      "Building project...",
      "Error: No index.html found in root directory"
    ],
    "failedAt": "2024-01-01T00:03:00.000Z"
  },
  "message": "Deployment failed"
}
```

## Error Codes

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request data validation failed |
| `NETWORK_ERROR` | Network connectivity issues |
| `CLOUDFLARE_API_ERROR` | Cloudflare API returned an error |
| `FILE_UPLOAD_ERROR` | File upload validation failed |
| `AUTHENTICATION_ERROR` | Cloudflare API authentication failed |
| `SERVER_ERROR` | Internal server error |
| `DOMAIN_NOT_FOUND` | Requested domain does not exist |
| `PAGE_NOT_FOUND` | Requested page project does not exist |
| `DEPLOYMENT_FAILED` | Page deployment failed |

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| `200` | OK - Request successful |
| `201` | Created - Resource created successfully |
| `202` | Accepted - Request accepted for processing |
| `400` | Bad Request - Invalid request data |
| `404` | Not Found - Resource not found |
| `409` | Conflict - Resource already exists |
| `413` | Payload Too Large - File too large |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Server error |
| `502` | Bad Gateway - Cloudflare API error |
| `503` | Service Unavailable - Service temporarily unavailable |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default Limit**: 100 requests per 15 minutes per IP address
- **Headers**: Rate limit information is included in response headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

**Rate Limit Exceeded Response:**
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "limit": 100,
      "window": 900,
      "resetTime": "2024-01-01T00:15:00.000Z"
    }
  }
}
```

## File Upload Specifications

### Supported File Types
- ZIP archives (`.zip`)
- Content-Type: `application/zip`

### File Size Limits
- Maximum file size: 10MB (10,485,760 bytes)
- Configurable via `MAX_FILE_SIZE` environment variable

### ZIP File Requirements
- Must contain valid static website files
- Should include an `index.html` file in the root directory
- Supported file types within ZIP:
  - HTML files (`.html`, `.htm`)
  - CSS files (`.css`)
  - JavaScript files (`.js`)
  - Images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`)
  - Fonts (`.woff`, `.woff2`, `.ttf`, `.otf`)
  - Other static assets

### File Validation
The API validates uploaded files for:
- File type and extension
- File size limits
- ZIP archive integrity
- Presence of required files (index.html)

## WebSocket Support

Currently, the API does not support WebSocket connections. Real-time updates for deployment status are achieved through polling the deployment status endpoint.

## CORS Configuration

The API supports Cross-Origin Resource Sharing (CORS) with the following configuration:

- **Development**: `http://localhost:5173` (Vite dev server)
- **Production**: Configurable via `CORS_ORIGINS` environment variable
- **Credentials**: Supported for authenticated requests
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, X-Requested-With

## API Versioning

Currently, the API is version 1 and does not include version numbers in the URL. Future versions will be introduced as needed with appropriate versioning strategy.

## SDK and Client Libraries

### JavaScript/TypeScript Client

The frontend includes a TypeScript API client that can be used as a reference for implementing other clients:

```typescript
// Example usage
import { ApiClient } from './services/api';

const client = new ApiClient('http://localhost:3000');

// Get domains
const domains = await client.getDomains();

// Add domain
const newDomain = await client.addDomain({
  name: 'example.com',
  nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com']
});

// Deploy page
const deployment = await client.deployPage('pageId', zipFile);
```

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Get domains
curl http://localhost:3000/api/domains

# Add domain
curl -X POST http://localhost:3000/api/domains \
  -H "Content-Type: application/json" \
  -d '{"name": "example.com"}'

# Upload ZIP file
curl -X POST http://localhost:3000/api/pages/page123/deploy \
  -F "file=@website.zip"
```

### Using Postman

Import the following collection for testing:

1. Create a new Postman collection
2. Add requests for each endpoint
3. Set up environment variables for base URL
4. Test all endpoints with various scenarios

## Support and Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS_ORIGINS is properly configured
2. **File Upload Failures**: Check file size and format
3. **Cloudflare API Errors**: Verify API token permissions
4. **Rate Limiting**: Implement proper retry logic with exponential backoff

### Getting Help

1. Check server logs for detailed error information
2. Verify Cloudflare API token permissions
3. Test API endpoints individually
4. Review this documentation for proper usage

### Monitoring

The API provides health check endpoints for monitoring:
- `/health` - Basic health check
- Application logs include request/response information
- Error tracking and monitoring can be integrated as needed