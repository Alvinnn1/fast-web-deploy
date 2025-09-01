# Security Configuration Guide

This document outlines the security configurations implemented for the Cloudflare Static Deployer backend API.

## Overview

The security implementation includes:
- **CORS Policy Configuration** for production environments
- **Content Security Policy (CSP)** headers and security middleware
- **API Rate Limiting** with multiple tiers
- **Request Validation** and suspicious request detection
- **Security Headers** for enhanced protection

## Security Features

### 1. CORS (Cross-Origin Resource Sharing)

#### Production Configuration
```typescript
corsOrigins: [
  'https://luckyjingwen.top',
  'https://www.luckyjingwen.top',
  'https://cloudflare-static-deployer.pages.dev'
]
```

#### Development Configuration
```typescript
corsOrigins: [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
]
```

#### Features
- Origin validation against whitelist
- Credentials support for authenticated requests
- Preflight request handling
- Exposed headers for rate limiting information

### 2. Rate Limiting

#### Global Rate Limiting
- **Limit**: 100 requests per 15 minutes
- **Window**: 900,000ms (15 minutes)
- **Scope**: Per IP address

#### Strict Rate Limiting (Sensitive Endpoints)
- **Limit**: 10 requests per minute
- **Window**: 60,000ms (1 minute)
- **Endpoints**: `/api/domains`, `/api/pages`, authentication endpoints

#### Endpoint-Specific Limits
```typescript
'/api/domains': { max: 30, window: 300000 }, // 5 minutes
'/api/pages/deploy': { max: 10, window: 600000 }, // 10 minutes
'/api/pages/upload': { max: 5, window: 300000 }, // 5 minutes
```

#### Rate Limit Headers
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### 3. Security Headers

#### Standard Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

#### Production-Only Headers
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

#### Permissions Policy
```http
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

### 4. Content Security Policy (CSP)

#### API Endpoints CSP
```http
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'
```

#### Frontend Application CSP
```http
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
  connect-src 'self' https://api.cloudflare.com https://luckyjingwen.top;
```

### 5. Request Validation

#### Content Length Validation
- Maximum request size: 10MB (configurable)
- Automatic rejection of oversized requests

#### Content Type Validation
- Allowed types: `application/json`, `multipart/form-data`
- Automatic rejection of unsupported content types

#### Required Headers (Production)
- `User-Agent`: Required to identify client applications

### 6. Suspicious Request Detection

#### Blocked User Agents
```typescript
suspiciousUserAgents: [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'zap', 'burp', 'wget'
]
```

#### Blocked Paths
```typescript
suspiciousPaths: [
  '/.env', '/.git', '/wp-admin', '/admin', '/phpmyadmin', 
  '/config', '/backup', '/database'
]
```

#### Blocked Query Parameters
```typescript
suspiciousParams: [
  'union', 'select', 'drop', 'delete', 'insert', 'update',
  'script', 'javascript', 'onload', 'onerror'
]
```

## Environment Configuration

### Environment Variables

#### Required Security Variables
```bash
# CORS Configuration
CORS_ORIGINS="https://luckyjingwen.top,https://www.luckyjingwen.top"

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES="application/zip,application/x-zip-compressed"

# Security Features
ENABLE_SECURITY_HEADERS=true
ENABLE_CSP=true
ENABLE_RATE_LIMITING=true
```

#### Optional Security Variables
```bash
# IP Filtering
TRUSTED_PROXIES="127.0.0.1,::1,10.0.0.0/8"
BLOCKED_IPS=""
ALLOWED_IPS=""
```

### Cloudflare Workers Configuration

#### wrangler.toml Security Settings
```toml
[vars]
ENABLE_SECURITY_HEADERS = "true"
ENABLE_CSP = "true"
ENABLE_RATE_LIMITING = "true"
RATE_LIMIT_MAX = "100"
RATE_LIMIT_WINDOW = "900000"
MAX_FILE_SIZE = "10485760"
```

## Implementation Details

### Fastify Security Middleware

The security middleware is automatically registered with Fastify:

```typescript
import { securityMiddleware } from './middleware/security-middleware.js'

// Register security middleware
await securityMiddleware.register(fastify)
```

### Workers Security Implementation

For Cloudflare Workers, security is handled in the router:

```typescript
// Rate limiting check
const rateLimitResult = await this.middleware.rateLimit(request)
if (!rateLimitResult.allowed) {
  return rateLimitExceededResponse
}

// Request validation
const validation = this.middleware.validateRequest(request)
if (!validation.valid) {
  return validation.error
}

// Add security headers to response
response = this.middleware.addSecurityHeaders(response, request)
```

## Security Best Practices

### 1. Regular Security Updates
- Keep dependencies updated
- Monitor security advisories
- Regular security audits

### 2. Environment Separation
- Different security policies for dev/staging/production
- Stricter policies in production
- Relaxed policies for development

### 3. Monitoring and Logging
- Log security events
- Monitor rate limit violations
- Track suspicious requests

### 4. Error Handling
- Don't expose internal errors in production
- Generic error messages for security violations
- Detailed logging for debugging

## Testing Security Configuration

### Rate Limiting Test
```bash
# Test global rate limiting
for i in {1..105}; do
  curl -H "User-Agent: test-client" https://api.yourdomain.com/api/test
done
```

### CORS Test
```bash
# Test CORS with allowed origin
curl -H "Origin: https://luckyjingwen.top" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS https://api.yourdomain.com/api/test

# Test CORS with blocked origin
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS https://api.yourdomain.com/api/test
```

### Security Headers Test
```bash
# Check security headers
curl -I https://api.yourdomain.com/api/test
```

## Troubleshooting

### Common Issues

#### CORS Errors
- Verify origin is in allowed list
- Check preflight request handling
- Ensure credentials are properly configured

#### Rate Limiting Issues
- Check rate limit headers in response
- Verify IP address detection
- Consider trusted proxy configuration

#### CSP Violations
- Check browser console for CSP errors
- Verify allowed sources in CSP directives
- Test with CSP report-only mode first

### Debug Mode

Enable debug logging to troubleshoot security issues:

```bash
LOG_LEVEL=debug
```

This will log:
- Request details
- Rate limiting decisions
- Security header application
- CORS validation results

## Security Monitoring

### Metrics to Monitor
- Rate limit violations per IP
- Blocked suspicious requests
- CORS violations
- CSP violations
- Error rates by endpoint

### Alerting
Set up alerts for:
- High rate of security violations
- Unusual traffic patterns
- Failed authentication attempts
- Suspicious request patterns

## Compliance

This security configuration helps meet:
- **OWASP Top 10** security recommendations
- **GDPR** privacy requirements (with proper data handling)
- **SOC 2** security controls
- **ISO 27001** information security standards

## Updates and Maintenance

### Regular Tasks
- Review and update CORS origins
- Adjust rate limits based on usage patterns
- Update CSP directives for new features
- Review and update blocked patterns

### Security Audits
- Quarterly security configuration review
- Annual penetration testing
- Regular dependency vulnerability scans
- Security header compliance checks