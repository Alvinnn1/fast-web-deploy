# Security Deployment Checklist

Use this checklist to ensure all security configurations are properly set up before deploying to production.

## Pre-Deployment Security Checklist

### ✅ Environment Configuration

- [ ] **CORS Origins**: Verify production domains are correctly configured
  ```bash
  CORS_ORIGINS="https://luckyjingwen.top,https://www.luckyjingwen.top,https://cloudflare-static-deployer.pages.dev"
  ```

- [ ] **Rate Limiting**: Confirm rate limits are appropriate for production traffic
  ```bash
  RATE_LIMIT_MAX=100
  RATE_LIMIT_WINDOW=900000  # 15 minutes
  ```

- [ ] **File Upload Limits**: Verify file size and type restrictions
  ```bash
  MAX_FILE_SIZE=10485760  # 10MB
  ALLOWED_FILE_TYPES="application/zip,application/x-zip-compressed"
  ```

- [ ] **Security Features**: Enable all security features for production
  ```bash
  ENABLE_SECURITY_HEADERS=true
  ENABLE_CSP=true
  ENABLE_RATE_LIMITING=true
  ```

### ✅ Cloudflare Workers Configuration

- [ ] **wrangler.toml**: Security variables are set for all environments
- [ ] **Secrets**: Sensitive values are stored as Wrangler secrets, not environment variables
  ```bash
  wrangler secret put CLOUDFLARE_API_TOKEN
  wrangler secret put CLOUDFLARE_ACCOUNT_ID
  wrangler secret put CLOUDFLARE_EMAIL
  ```

- [ ] **Routes**: Production routes are correctly configured
- [ ] **KV Namespaces**: Rate limiting storage is configured (if using KV)

### ✅ Frontend Security Headers

- [ ] **_headers file**: Security headers are configured for Cloudflare Pages
- [ ] **CSP**: Content Security Policy allows necessary resources
- [ ] **HSTS**: HTTP Strict Transport Security is enabled
- [ ] **Cache Control**: Appropriate caching policies are set

### ✅ API Security

- [ ] **Authentication**: API endpoints require proper authentication (if applicable)
- [ ] **Input Validation**: All user inputs are validated and sanitized
- [ ] **Error Handling**: Error messages don't expose sensitive information
- [ ] **Logging**: Security events are logged appropriately

### ✅ Network Security

- [ ] **HTTPS Only**: All traffic is forced to HTTPS
- [ ] **Domain Validation**: Only authorized domains can access the API
- [ ] **IP Filtering**: Trusted proxies are correctly configured
- [ ] **DDoS Protection**: Cloudflare DDoS protection is enabled

## Deployment Commands

### 1. Test Security Configuration
```bash
cd backend
npm run test:security
```

### 2. Build and Deploy Backend
```bash
cd backend
npm run build:workers
wrangler deploy --env production
```

### 3. Deploy Frontend
```bash
cd frontend
npm run build
# Deploy to Cloudflare Pages
```

### 4. Verify Deployment
```bash
# Test CORS
curl -H "Origin: https://luckyjingwen.top" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS https://api.yourdomain.com/health

# Test Rate Limiting
for i in {1..105}; do
  curl https://api.yourdomain.com/health
done

# Test Security Headers
curl -I https://api.yourdomain.com/health
```

## Post-Deployment Verification

### ✅ Security Headers Check

Use online tools to verify security headers:
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

Expected grades:
- Security Headers: A+ or A
- Mozilla Observatory: A+ or A

### ✅ SSL/TLS Configuration

- [ ] **SSL Labs Test**: Grade A or higher
- [ ] **Certificate Transparency**: Certificate is logged
- [ ] **HSTS Preload**: Domain is eligible for HSTS preload list

### ✅ Performance Impact

- [ ] **Response Times**: Security middleware doesn't significantly impact performance
- [ ] **Memory Usage**: Rate limiting doesn't cause memory leaks
- [ ] **Error Rates**: Security validations don't cause false positives

### ✅ Monitoring Setup

- [ ] **Rate Limit Alerts**: Alerts for unusual rate limiting patterns
- [ ] **Security Violations**: Monitoring for blocked requests
- [ ] **Error Tracking**: Security-related errors are tracked
- [ ] **Performance Monitoring**: API response times are monitored

## Security Testing

### Manual Testing

1. **CORS Testing**
   ```bash
   # Valid origin
   curl -H "Origin: https://luckyjingwen.top" -X OPTIONS https://api.yourdomain.com/health
   
   # Invalid origin
   curl -H "Origin: https://malicious.com" -X OPTIONS https://api.yourdomain.com/health
   ```

2. **Rate Limiting Testing**
   ```bash
   # Exceed rate limit
   for i in {1..105}; do curl https://api.yourdomain.com/health; done
   ```

3. **Security Headers Testing**
   ```bash
   # Check all security headers
   curl -I https://api.yourdomain.com/health
   ```

4. **Suspicious Request Testing**
   ```bash
   # Test blocked user agent
   curl -H "User-Agent: sqlmap/1.0" https://api.yourdomain.com/health
   
   # Test blocked path
   curl https://api.yourdomain.com/.env
   ```

### Automated Testing

Run the security test suite:
```bash
npm run test:security
```

## Rollback Plan

If security issues are discovered post-deployment:

1. **Immediate Actions**
   - [ ] Disable problematic security features via environment variables
   - [ ] Revert to previous working configuration
   - [ ] Monitor for continued issues

2. **Investigation**
   - [ ] Review logs for security violations
   - [ ] Identify root cause of issues
   - [ ] Test fixes in staging environment

3. **Resolution**
   - [ ] Apply fixes to security configuration
   - [ ] Test thoroughly in staging
   - [ ] Redeploy with corrected configuration

## Security Maintenance

### Regular Tasks (Weekly)
- [ ] Review rate limiting metrics
- [ ] Check for new security vulnerabilities
- [ ] Monitor error rates and security violations

### Regular Tasks (Monthly)
- [ ] Update security headers configuration
- [ ] Review and update CORS origins
- [ ] Audit suspicious request patterns
- [ ] Update blocked user agents and paths

### Regular Tasks (Quarterly)
- [ ] Security configuration audit
- [ ] Penetration testing
- [ ] Dependency security updates
- [ ] Security policy review

## Emergency Contacts

- **Security Team**: [security@company.com]
- **DevOps Team**: [devops@company.com]
- **On-Call Engineer**: [oncall@company.com]

## Documentation Links

- [Security Configuration Guide](./SECURITY.md)
- [API Documentation](../API.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Monitoring Setup](../docs/monitoring.md)

---

**Note**: This checklist should be completed and signed off by both development and security teams before any production deployment.