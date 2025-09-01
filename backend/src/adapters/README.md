# Cloudflare Workers Adapters

This directory contains the adapters that enable the Fastify backend to run on Cloudflare Workers.

## Architecture

The Workers adaptation follows a modular approach:

```
worker.ts (Entry Point)
├── WorkersRouter (Request Routing)
├── WorkersCloudflareClient (API Client)
├── WorkersResponseFormatter (Response Formatting)
├── WorkersErrorHandler (Error Handling)
└── Handlers/
    ├── DomainsHandler (Domain Management)
    └── PagesHandler (Pages Management)
```

## Key Components

### worker.ts
- Main Workers entry point
- Implements the required `fetch` handler
- Handles CORS preflight requests
- Routes requests to appropriate handlers

### WorkersRouter
- Adapts Fastify routing to Workers Request/Response
- Handles CORS headers
- Routes requests to domain and pages handlers
- Provides health check and test endpoints

### WorkersCloudflareClient
- Adapts the original CloudflareClient for Workers environment
- Uses native `fetch` instead of axios
- Maintains the same API interface as the original client
- Handles authentication and error responses

### WorkersResponseFormatter
- Converts response data to Workers Response objects
- Maintains the same API response format
- Handles different response types (success, error, paginated, etc.)

### WorkersErrorHandler
- Adapts error handling for Workers environment
- Converts errors to appropriate HTTP responses
- Maintains user-friendly error messages

### WorkersRequestHandler
- Utilities for parsing and handling Workers Request objects
- Extracts JSON, form data, query parameters, and headers
- Provides helper methods for common request operations

### WorkersConfigManager
- Manages environment variable configuration
- Validates required configuration values
- Provides typed access to configuration settings

### WorkersMiddleware
- Common middleware functions for Workers environment
- Request validation, logging, and security headers
- Rate limiting and error handling middleware

### Handlers
- **DomainsHandler**: Handles all domain-related API endpoints
- **PagesHandler**: Handles all pages-related API endpoints
- Both handlers maintain the same functionality as the original Fastify routes

## Environment Variables

The Workers adaptation requires these environment variables:

```typescript
interface Env {
  CLOUDFLARE_API_TOKEN: string
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_EMAIL: string
  CORS_ORIGINS: string
  NODE_ENV: string
}
```

## Key Differences from Fastify Version

1. **Request/Response Objects**: Uses Workers Request/Response instead of Fastify's
2. **HTTP Client**: Uses native `fetch` instead of axios
3. **Error Handling**: Returns Response objects instead of using Fastify's reply
4. **Routing**: Manual path parsing instead of Fastify's route definitions
5. **CORS**: Manual CORS handling instead of @fastify/cors plugin
6. **File Uploads**: Uses FormData API instead of @fastify/multipart

## Compatibility

The Workers adaptation maintains 100% API compatibility with the original Fastify backend:

- Same endpoints and HTTP methods
- Same request/response formats
- Same validation rules
- Same error messages
- Same business logic

## Limitations

1. **File Size**: Workers have memory and execution time limits
2. **Dependencies**: Cannot use Node.js-specific modules
3. **File System**: No file system access (uses in-memory processing)
4. **Long-running Tasks**: Limited execution time per request

## Testing

The adapters include basic tests to verify:
- Correct module structure
- Request handling functionality
- CORS handling
- Error responses

## Usage

To use the Workers adaptation:

1. Deploy `worker.ts` as a Cloudflare Worker
2. Set the required environment variables
3. Configure routing in `wrangler.toml`
4. The API will be available at your Worker's URL

The Workers version provides the same functionality as the Fastify version but optimized for the Cloudflare Workers runtime environment.