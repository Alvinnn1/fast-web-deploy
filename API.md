# API Documentation

This document provides comprehensive documentation for the Cloudflare Static Deployer API.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.luckyjingwen.top`

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
    "code": "NOT_FOUND",
    "details": {
      "domainId": "invalid-id"
    }
  }
}
```

## Rate Limiting

The API implements rate limiting with the following limits:

- **General endpoints**: 1000 requests per 15 minutes
- **Sensitive endpoints** (`/api/domains`, `/api/pages`): 100 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

## Endpoints

### Health Check

#### GET /health
Check API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "environment": "production",
    "version": "1.0.0"
  },
  "message": "Service is healthy"
}
```

### API Test

#### GET /api/test
Test API connectivity.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Backend API is working!"
  },
  "message": "API test successful"
}
```

### Domain Management

#### GET /api/domains
Get all domains with pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
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
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 25,
      "total_pages": 3,
      "has_next_page": true,
      "has_prev_page": false
    }
  },
  "message": "Domains retrieved successfully"
}
```

**Example Requests:**
```bash
# Get first page with default page size
GET /api/domains

# Get second page with 20 items per page
GET /api/domains?page=2&per_page=20

# Get first page with 5 items per page
GET /api/domains?page=1&per_page=5
```

#### POST /api/domains
Create a new domain.

**Request Body:**
```json
{
  "name": "example.com",
  "nameservers": ["ns1.example.com", "ns2.example.com"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "zone123",
    "name": "example.com",
    "status": "pending",
    "nameservers": ["ns1.example.com", "ns2.example.com"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "modifiedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Domain created successfully"
}
```

#### GET /api/domains/{domainId}
Get domain details including DNS records and SSL certificate.

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
      "issuer": "Cloudflare",
      "expiresAt": "2025-01-01T00:00:00.000Z"
    }
  },
  "message": "Domain details retrieved successfully"
}
```

#### GET /api/domains/{domainId}/dns-records
Get DNS records for a domain.

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
    }
  ],
  "message": "DNS records retrieved successfully"
}
```

#### POST /api/domains/{domainId}/dns-records
Create a new DNS record.

**Request Body:**
```json
{
  "type": "A",
  "name": "www.example.com",
  "content": "192.0.2.1",
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
    "name": "www.example.com",
    "content": "192.0.2.1",
    "ttl": 300,
    "proxied": true
  },
  "message": "DNS record created successfully"
}
```

#### PUT /api/domains/{domainId}/dns-records/{recordId}
Update a DNS record.

**Request Body:**
```json
{
  "type": "A",
  "name": "www.example.com",
  "content": "192.0.2.2",
  "ttl": 600,
  "proxied": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "record123",
    "type": "A",
    "name": "www.example.com",
    "content": "192.0.2.2",
    "ttl": 600,
    "proxied": false
  },
  "message": "DNS record updated successfully"
}
```

#### DELETE /api/domains/{domainId}/dns-records/{recordId}
Delete a DNS record.

**Response:**
```json
{
  "success": true,
  "message": "DNS record deleted successfully"
}
```

#### GET /api/domains/{domainId}/ssl-certificates
Get all SSL certificates for a domain.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cert123",
      "status": "active",
      "issuer": "ssl_com",
      "expiresAt": "2025-01-01T00:00:00.000Z",
      "hosts": ["example.com", "*.example.com"],
      "type": "universal",
      "validationMethod": "txt",
      "validityDays": 90
    },
    {
      "id": "cert456",
      "status": "backup_issued",
      "issuer": "lets_encrypt",
      "expiresAt": "2025-01-01T00:00:00.000Z",
      "hosts": ["example.com", "*.example.com"],
      "type": "universal",
      "validationMethod": "txt",
      "validityDays": 90
    }
  ],
  "message": "SSL certificates retrieved successfully"
}
```

**Status Values:**
- `active`: Certificate is active and in use
- `pending`: Certificate is being issued
- `expired`: Certificate has expired
- `backup_issued`: Certificate is issued as backup

**Empty Response (No Certificates):**
```json
{
  "success": true,
  "data": [],
  "message": "No SSL certificates found"
}
```

#### POST /api/domains/{domainId}/ssl-certificate
Request SSL certificate for a domain.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cert123",
    "status": "pending",
    "issuer": "Cloudflare",
    "expiresAt": "2025-01-01T00:00:00.000Z",
    "hosts": ["example.com", "*.example.com"],
    "type": "universal",
    "validationMethod": "txt",
    "validityDays": 90
  },
  "message": "SSL certificate requested successfully"
}
```

### Pages Management

#### GET /api/pages
Get all Pages projects with pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "project123",
        "name": "my-website",
        "status": "deployed",
        "url": "https://my-website.pages.dev",
        "domains": ["my-website.com"],
        "deploymentId": "deploy123",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastDeployedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 15,
      "total_pages": 2,
      "has_next_page": true,
      "has_prev_page": false
    }
  },
  "message": "Pages projects retrieved successfully"
}
```

**Example Requests:**
```bash
# Get first page with default page size
GET /api/pages

# Get second page with 20 items per page
GET /api/pages?page=2&per_page=20
```

#### POST /api/pages
Create a new Pages project.

**Request Body:**
```json
{
  "name": "my-website",
  "productionBranch": "main"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "project123",
    "name": "my-website",
    "status": "created",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Pages project created successfully"
}
```

#### POST /api/pages/{projectName}/deploy
Deploy a Pages project.

**Request Body:**
```json
{
  "files": [
    {
      "name": "index.html",
      "content": "<html>...</html>"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "deploy123",
    "status": "queued",
    "url": "https://my-website.pages.dev"
  },
  "message": "Deployment started successfully"
}
```

#### GET /api/pages/{projectName}/upload-url
Get upload URL for direct file uploads.

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://api.cloudflare.com/client/v4/accounts/.../pages/projects/my-website/upload-tokens/...",
    "expiresAt": "2024-01-01T01:00:00.000Z"
  },
  "message": "Upload URL generated successfully"
}
```

#### GET /api/pages/{projectName}/deployment-status
Get deployment status.

**Query Parameters:**
- `deploymentId` (required): Deployment ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "deploy123",
    "status": "success",
    "url": "https://my-website.pages.dev",
    "errorMessage": null
  },
  "message": "Deployment status retrieved successfully"
}
```

#### POST /api/pages/assets/check-missing
Check for missing assets in a deployment.

**Request Body:**
```json
{
  "deploymentId": "deploy123",
  "assets": [
    {
      "name": "style.css",
      "hash": "abc123"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "missingAssets": [
      {
        "name": "style.css",
        "hash": "abc123"
      }
    ]
  },
  "message": "Missing assets checked successfully"
}
```

#### POST /api/pages/assets/upload
Upload assets for a deployment.

**Request Body:**
```json
{
  "deploymentId": "deploy123",
  "assets": [
    {
      "name": "style.css",
      "content": "body { color: red; }"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadedAssets": [
      {
        "name": "style.css",
        "hash": "abc123"
      }
    ]
  },
  "message": "Assets uploaded successfully"
}
```

#### GET /api/pages/{projectName}/domains
Get custom domains for a Pages project.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "my-website.com",
      "status": "active"
    }
  ],
  "message": "Project domains retrieved successfully"
}
```

#### POST /api/pages/{projectName}/domains
Add a custom domain to a Pages project.

**Request Body:**
```json
{
  "domain": "my-website.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "my-website.com",
    "status": "pending"
  },
  "message": "Domain added successfully"
}
```

#### DELETE /api/pages/{projectName}/domains/{domainName}
Remove a custom domain from a Pages project.

**Response:**
```json
{
  "success": true,
  "message": "Domain removed successfully"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `STRICT_RATE_LIMIT_EXCEEDED` | Strict rate limit exceeded for sensitive endpoints |
| `CLOUDFLARE_API_ERROR` | Cloudflare API error |
| `FILE_UPLOAD_ERROR` | File upload failed |
| `AUTHENTICATION_ERROR` | Authentication failed |
| `SERVER_ERROR` | Internal server error |
| `CONFIGURATION_ERROR` | Configuration error |
| `CONFLICT_ERROR` | Resource conflict |

## CORS

The API supports CORS for the following origins:
- `https://luckyjingwen.top`
- `https://www.luckyjingwen.top`
- `https://cloudflare-static-deployer.pages.dev`

## Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`

## Rate Limiting

The API implements two levels of rate limiting:

1. **General Rate Limiting**: 1000 requests per 15 minutes for all endpoints
2. **Strict Rate Limiting**: 100 requests per minute for sensitive endpoints (`/api/domains`, `/api/pages`)

Rate limit information is provided in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## File Upload Limits

- **Maximum file size**: 10MB
- **Allowed file types**: `application/zip`, `application/x-zip-compressed`
- **Upload timeout**: 30 seconds

## Examples

### JavaScript/TypeScript

```typescript
// Get all domains
const response = await fetch('https://api.luckyjingwen.top/api/domains');
const data = await response.json();

if (data.success) {
  console.log('Domains:', data.data);
} else {
  console.error('Error:', data.message);
}

// Create a new domain
const createResponse = await fetch('https://api.luckyjingwen.top/api/domains', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'example.com',
    nameservers: ['ns1.example.com', 'ns2.example.com']
  })
});

const createData = await createResponse.json();

// Get SSL certificates for a domain
const sslResponse = await fetch('https://api.luckyjingwen.top/api/domains/zone123/ssl-certificates');
const sslData = await sslResponse.json();

if (sslData.success) {
  console.log('SSL Certificates:', sslData.data);
  sslData.data.forEach(cert => {
    console.log(`Certificate ${cert.id}: ${cert.status} (${cert.issuer})`);
  });
} else {
  console.error('Error:', sslData.message);
}

// Request a new SSL certificate
const requestSslResponse = await fetch('https://api.luckyjingwen.top/api/domains/zone123/ssl-certificate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
});

const requestSslData = await requestSslResponse.json();
```

### cURL

```bash
# Get all domains
curl -X GET https://api.luckyjingwen.top/api/domains

# Create a new domain
curl -X POST https://api.luckyjingwen.top/api/domains \
  -H "Content-Type: application/json" \
  -d '{"name": "example.com", "nameservers": ["ns1.example.com", "ns2.example.com"]}'

# Get SSL certificates for a domain
curl -X GET https://api.luckyjingwen.top/api/domains/zone123/ssl-certificates

# Request a new SSL certificate
curl -X POST https://api.luckyjingwen.top/api/domains/zone123/ssl-certificate \
  -H "Content-Type: application/json"

# Deploy a Pages project
curl -X POST https://api.luckyjingwen.top/api/pages/my-website/deploy \
  -H "Content-Type: application/json" \
  -d '{"files": [{"name": "index.html", "content": "<html>Hello World</html>"}]}'
```

## Changelog

### v1.2.0
- **NEW**: Added pagination support to `GET /api/domains` endpoint
- **NEW**: Added pagination support to `GET /api/pages` endpoint
- **NEW**: Added pagination query parameters (`page`, `per_page`) with validation
- **ENHANCED**: Updated response format to include pagination metadata
- **IMPROVED**: Enhanced API performance with configurable page sizes (max 100 items per page)

### v1.1.0
- **NEW**: Added `GET /api/domains/{domainId}/ssl-certificates` endpoint to retrieve all SSL certificates for a domain
- **ENHANCED**: Updated SSL certificate data structure to include more detailed information (hosts, type, validationMethod, validityDays)
- **IMPROVED**: Enhanced SSL certificate status handling with support for `backup_issued` status

### v1.0.0
- Initial API release
- Domain management endpoints
- Pages management endpoints
- Rate limiting implementation
- Security headers
- CORS support