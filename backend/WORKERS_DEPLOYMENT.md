# Cloudflare Workers Deployment Guide

This guide covers the deployment of the backend API to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**: You need a Cloudflare account with Workers enabled
2. **Wrangler CLI**: Install the Wrangler CLI globally
   ```bash
   npm install -g wrangler
   ```
3. **Authentication**: Login to your Cloudflare account
   ```bash
   wrangler login
   ```

## Initial Setup

### 1. Create Required Resources

Run the setup script to create all necessary Cloudflare resources:

```bash
cd backend
chmod +x scripts/setup-workers.sh
./scripts/setup-workers.sh
```

This script will create:
- KV namespaces for caching and sessions
- D1 database for data storage
- R2 buckets for file uploads
- Update `wrangler.toml` with the resource IDs

### 2. Set Environment Secrets

Set the required secrets using Wrangler:

```bash
# Cloudflare API credentials
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_EMAIL

# Optional: Database connection string if using external DB
wrangler secret put DATABASE_URL
```

### 3. Configure Domain Routing

Update the `wrangler.toml` file with your actual domain names:

```toml
[[routes]]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"
```

## Deployment Commands

### Development

```bash
# Start local development server
npm run wrangler:dev

# Deploy to development environment
npm run wrangler:deploy:development
```

### Staging

```bash
# Deploy to staging environment
npm run wrangler:deploy:staging
```

### Production

```bash
# Deploy to production environment
npm run wrangler:deploy:production

# Or deploy to default environment
npm run wrangler:deploy
```

## Environment Configuration

### Environment Variables

The following environment variables are configured in `wrangler.toml`:

- `NODE_ENV`: Environment mode (development/staging/production)
- `CORS_ORIGINS`: Allowed CORS origins
- `API_VERSION`: API version identifier
- `LOG_LEVEL`: Logging level

### Resource Bindings

#### KV Namespaces
- `CACHE`: For API response caching
- `SESSIONS`: For session storage

#### D1 Database
- `DB`: Main database for application data

#### R2 Buckets
- `UPLOADS`: File upload storage

## Monitoring and Debugging

### View Logs

```bash
# Tail worker logs in real-time
npm run wrangler:tail

# View logs for specific environment
wrangler tail --env production
```

### Analytics

Monitor your worker performance in the Cloudflare dashboard:
- Request volume and errors
- CPU time usage
- Memory usage
- Geographic distribution

## Troubleshooting

### Common Issues

1. **Build Errors**
   - Ensure TypeScript compilation succeeds: `npm run build`
   - Check for Workers runtime compatibility issues

2. **Environment Variable Issues**
   - Verify secrets are set: `wrangler secret list`
   - Check environment-specific configuration in `wrangler.toml`

3. **Route Configuration**
   - Ensure DNS records point to Cloudflare
   - Verify zone name matches your Cloudflare zone

4. **Resource Binding Errors**
   - Confirm KV namespaces, D1 databases, and R2 buckets exist
   - Check resource IDs in `wrangler.toml`

### Performance Optimization

1. **CPU Time Limits**
   - Workers have a 50ms CPU time limit
   - Optimize database queries and API calls
   - Use caching for frequently accessed data

2. **Memory Usage**
   - Monitor memory consumption
   - Implement efficient data structures
   - Clean up unused variables

3. **Cold Start Optimization**
   - Minimize initialization code
   - Use lazy loading for heavy dependencies
   - Implement connection pooling

## Security Considerations

### API Security
- All secrets are encrypted and managed by Cloudflare
- CORS is configured per environment
- Rate limiting can be implemented using Durable Objects

### Data Security
- D1 databases are encrypted at rest
- R2 buckets support encryption
- KV data is automatically encrypted

## Cost Management

### Free Tier Limits
- 100,000 requests per day
- 10ms CPU time per request
- 128MB memory per request

### Paid Plan Benefits
- Unlimited requests ($0.50 per million)
- 50ms CPU time per request
- 128MB memory per request
- Additional KV operations included

## Migration from Traditional Hosting

If migrating from a traditional Node.js hosting solution:

1. **Database Migration**
   - Export data from existing database
   - Import to D1 or configure external database connection

2. **File Storage Migration**
   - Transfer existing files to R2 buckets
   - Update file URLs in application

3. **Environment Variables**
   - Convert `.env` files to Wrangler secrets and variables
   - Update application configuration

4. **Testing**
   - Test all API endpoints thoroughly
   - Verify file upload/download functionality
   - Check database operations

## Support and Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [R2 Storage Documentation](https://developers.cloudflare.com/r2/)
- [KV Storage Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)