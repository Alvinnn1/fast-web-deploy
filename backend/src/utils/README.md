# Backend Utilities Documentation

This directory contains utility classes and functions for error handling and response formatting in the Cloudflare Static Deployer backend.

## Error Handling System

### ErrorHandler Class

The `ErrorHandler` class provides centralized error handling functionality:

#### Key Features:
- Converts various error types to user-friendly messages in Chinese
- Provides factory methods for creating specific error types
- Handles Fastify route errors consistently

#### Usage Examples:

```typescript
import { ErrorHandler, ErrorType } from '../types.js';

// Create specific error types
const validationError = ErrorHandler.createValidationError('Invalid domain name');
const notFoundError = ErrorHandler.createNotFoundError('Domain');
const cloudflareError = ErrorHandler.createCloudflareError('API rate limit exceeded');

// Handle errors in routes
try {
  // Some operation that might fail
} catch (error) {
  ErrorHandler.handleRouteError(reply, error);
}
```

### ResponseFormatter Class

The `ResponseFormatter` class provides consistent API response formatting:

#### Methods:
- `success(data?, message?)` - Create successful responses
- `error(message, errorCode?, details?)` - Create error responses
- `created(data, message?)` - Create responses for created resources
- `updated(data?, message?)` - Create responses for updated resources
- `deleted(message?)` - Create responses for deleted resources
- `paginated(data, total, page, limit, message?)` - Create paginated responses

#### Usage Examples:

```typescript
import { ResponseFormatter } from '../utils/response-formatter.js';

// Success response
return ResponseFormatter.success(
  { domains: [...] },
  'Domains retrieved successfully'
);

// Created response
return ResponseFormatter.created(
  newDomain,
  'Domain added successfully'
);

// Error response
return ResponseFormatter.error(
  'Domain not found',
  'NOT_FOUND_ERROR'
);
```

## Error Middleware

### errorMiddleware

Global error handling middleware that:
- Catches all unhandled errors in routes
- Logs errors with request context
- Converts errors to user-friendly responses
- Handles Fastify validation errors
- Provides 404 handling for unknown routes

### asyncHandler

Wrapper function for async route handlers that automatically catches and handles errors:

```typescript
import { asyncHandler } from '../middleware/error-middleware.js';

fastify.get('/api/domains', asyncHandler(async (request, reply) => {
  // Your async route logic here
  // Errors will be automatically caught and handled
}));
```

### RequestValidator

Utility class for common validation tasks:

```typescript
import { RequestValidator } from '../middleware/error-middleware.js';

// Validate required fields
RequestValidator.validateRequiredFields(request.body, ['name', 'email']);

// Validate domain name format
RequestValidator.validateDomainName('example.com');

// Validate project name
RequestValidator.validateProjectName('my-project');

// Validate file upload
RequestValidator.validateFileUpload(uploadedFile);
```

## Error Types

The system defines the following error types:

- `NETWORK_ERROR` - Network connectivity issues
- `VALIDATION_ERROR` - Input validation failures
- `CLOUDFLARE_API_ERROR` - Cloudflare API related errors
- `FILE_UPLOAD_ERROR` - File upload related errors
- `AUTHENTICATION_ERROR` - API authentication failures
- `SERVER_ERROR` - Internal server errors
- `DATABASE_ERROR` - Database operation errors
- `NOT_FOUND_ERROR` - Resource not found errors

## API Response Format

All API responses follow this consistent format:

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

### Success Response Example:
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "example.com"
  },
  "message": "Domain retrieved successfully"
}
```

### Error Response Example:
```json
{
  "success": false,
  "message": "域名格式无效",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "name"
    }
  }
}
```

## Integration

To use these utilities in your routes:

1. Import the required utilities
2. Use `ResponseFormatter` for consistent responses
3. Use `ErrorHandler` factory methods to create errors
4. Wrap async handlers with `asyncHandler` or rely on global error middleware
5. Use `RequestValidator` for input validation

The error middleware is automatically registered in the main server file and will handle all unhandled errors consistently.