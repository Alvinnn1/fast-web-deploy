# Design Document

## Overview

This design addresses the CORS issue by creating backend proxy endpoints for Cloudflare Pages asset operations. The solution involves adding two new API endpoints to the existing backend that will forward requests to Cloudflare's asset APIs, eliminating the need for direct frontend-to-Cloudflare communication.

The design leverages the existing backend architecture, including the CloudflareClient service, error handling utilities, and response formatting patterns already established in the codebase.

## Architecture

### Current Architecture
- Frontend makes direct API calls to `https://api.cloudflare.com` for asset operations
- This causes CORS errors due to cross-origin restrictions
- JWT tokens are passed from frontend to Cloudflare directly

### New Architecture
- Frontend calls backend proxy endpoints instead of Cloudflare directly
- Backend forwards requests to Cloudflare APIs using the existing CloudflareClient
- JWT tokens are still passed through but handled by the backend
- Response format remains identical to maintain frontend compatibility

## Components and Interfaces

### Backend Components

#### 1. New Route Endpoints
Two new endpoints will be added to the existing pages routes (`backend/src/routes/pages.ts`):

- `POST /api/pages/assets/check-missing` - Proxy for checking missing assets
- `POST /api/pages/assets/upload` - Proxy for uploading assets

#### 2. CloudflareClient Extensions
The existing `CloudflareClient` class will be extended with two new methods:

- `checkMissingAssets(jwt: string, hashes: string[]): Promise<{ result: string[], success: boolean }>`
- `uploadAssets(jwt: string, payload: UploadPayload[]): Promise<{ result: { successful_key_count: number, unsuccessful_keys: string[] }, success: boolean }>`

#### 3. Request/Response Types
New TypeScript interfaces will be added to `backend/src/types.ts`:

```typescript
interface UploadPayload {
  base64: boolean
  key: string
  metadata: { contentType: string }
  value: string
}

interface CheckMissingAssetsRequest {
  jwt: string
  hashes: string[]
}

interface AssetsUploadRequest {
  jwt: string
  payload: UploadPayload[]
}

interface CheckMissingAssetsResponse {
  result: string[]
  success: boolean
}

interface AssetsUploadResponse {
  result: {
    successful_key_count: number
    unsuccessful_keys: string[]
  }
  success: boolean
}
```

### Frontend Components

#### Modified API Service
The frontend API service (`frontend/src/services/api.ts`) will be updated to call the new backend endpoints instead of Cloudflare directly:

- `checkMissingAssets` will call `POST /api/pages/assets/check-missing`
- `assetsUpload` will call `POST /api/pages/assets/upload`

## Data Models

### Request Flow for Check Missing Assets
1. Frontend calls `api.cloudflare.checkMissingAssets(jwt, payload)`
2. Frontend API service calls `POST /api/pages/assets/check-missing` with `{ jwt, hashes }`
3. Backend extracts JWT and hashes from request body
4. Backend calls Cloudflare API `/client/v4/pages/assets/check-missing` with JWT auth
5. Backend returns Cloudflare response to frontend

### Request Flow for Assets Upload
1. Frontend calls `api.cloudflare.assetsUpload(jwt, payload)`
2. Frontend API service calls `POST /api/pages/assets/upload` with `{ jwt, payload }`
3. Backend extracts JWT and payload from request body
4. Backend calls Cloudflare API `/client/v4/pages/assets/upload` with JWT auth
5. Backend returns Cloudflare response to frontend

### Authentication Handling
- JWT tokens will be passed in the request body instead of headers to avoid CORS preflight issues
- Backend will extract JWT from request body and use it in the Authorization header when calling Cloudflare
- No changes to JWT generation or validation logic

## Error Handling

### Backend Error Handling
- Leverage existing `ErrorHandler` utility for consistent error responses
- Handle Cloudflare API errors using existing error transformation patterns
- Validate JWT token format before forwarding requests
- Return appropriate HTTP status codes for different error scenarios

### Error Scenarios
1. **Missing JWT Token**: Return 400 Bad Request with validation error
2. **Invalid JWT Token**: Forward Cloudflare's 401/403 response
3. **Malformed Request Body**: Return 400 Bad Request with validation error
4. **Cloudflare API Errors**: Forward Cloudflare's error response with appropriate status code
5. **Network Errors**: Return 502 Bad Gateway for connectivity issues

### Error Response Format
All errors will follow the existing backend error response format:
```typescript
{
  success: false,
  message: string,
  error?: any
}
```

## Testing Strategy

### Unit Tests
1. **Backend Route Tests**: Test new proxy endpoints with various request scenarios
2. **CloudflareClient Tests**: Test new methods with mocked Cloudflare API responses
3. **Error Handling Tests**: Verify proper error transformation and status codes
4. **Request Validation Tests**: Test input validation for JWT and payload data

### Integration Tests
1. **End-to-End Flow Tests**: Test complete flow from frontend API call to Cloudflare response
2. **CORS Resolution Tests**: Verify that CORS errors are eliminated
3. **Authentication Flow Tests**: Test JWT token handling through the proxy

### Test Data
- Mock JWT tokens for testing authentication flows
- Sample UploadPayload arrays for testing asset upload scenarios
- Various error responses from Cloudflare API for error handling tests

## Implementation Considerations

### Backward Compatibility
- Frontend API interface remains unchanged to avoid breaking existing code
- Response formats are identical to current Cloudflare API responses
- No changes required to components that use the asset upload functionality

### Performance Impact
- Minimal additional latency from proxy layer (single additional network hop)
- No caching implemented initially to maintain consistency with direct API calls
- Request/response sizes remain unchanged

### Security Considerations
- JWT tokens are still handled securely and not logged or stored
- Backend validates request structure before forwarding to Cloudflare
- No additional authentication layers introduced that could create security gaps

### Configuration
- No new configuration variables required
- Leverages existing Cloudflare API configuration and error handling
- Uses existing CloudflareClient instance and configuration