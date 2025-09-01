# Cloudflare API Client

This directory contains the Cloudflare API client implementation for the static deployer application.

## Usage

```typescript
import { cloudflareClient } from './cloudflare-client.js'

// Get all zones
const zones = await cloudflareClient.getZones()

// Create a new zone
const newZone = await cloudflareClient.createZone('example.com')

// Get DNS records for a zone
const dnsRecords = await cloudflareClient.getDNSRecords(zoneId)

// Create a DNS record
const newRecord = await cloudflareClient.createDNSRecord(zoneId, {
  type: 'A',
  name: 'www',
  content: '192.168.1.1',
  ttl: 300
})

// Get account ID (needed for Pages API)
const accountId = await cloudflareClient.getAccountId()

// Create a Pages project
const project = await cloudflareClient.createPagesProject(accountId, 'my-site')

// Deploy to Pages
const deployment = await cloudflareClient.createPagesDeployment(
  accountId, 
  'my-site', 
  formData
)
```

## Error Handling

The client automatically handles Cloudflare API errors and converts them to `AppError` instances with appropriate error types:

- `AUTHENTICATION_ERROR` - Invalid API token
- `CLOUDFLARE_API_ERROR` - API request failed
- `NETWORK_ERROR` - Connection issues

## Features

- ✅ Zone management (list, create, get details)
- ✅ DNS record management (CRUD operations)
- ✅ SSL certificate management
- ✅ Pages project management
- ✅ Pages deployment management
- ✅ Account information retrieval
- ✅ Token verification
- ✅ Comprehensive error handling
- ✅ TypeScript support with full type definitions
- ✅ Axios-based HTTP client with interceptors
- ✅ 30-second timeout for all requests
- ✅ Automatic retry logic through error handling