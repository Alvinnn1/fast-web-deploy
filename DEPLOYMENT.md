# Deployment Guide

This guide covers different deployment options for the Cloudflare Static Deployer application.

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose (for containerized deployment)
- Cloudflare API Token with appropriate permissions

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
# For production
cp .env.production.example .env.production

# For staging
cp .env.production.example .env.staging
```

### 2. Required Environment Variables

Configure the following variables in your environment file:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Cloudflare API Configuration
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here

# Security Configuration
SESSION_SECRET=your_secure_session_secret_here
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional Configuration
LOG_LEVEL=info
MAX_FILE_SIZE=10485760
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Quick Start

```bash
# 1. Build and run with Docker Compose
docker-compose up -d

# 2. Check logs
docker-compose logs -f

# 3. Stop the application
docker-compose down
```

#### Manual Docker Build

```bash
# 1. Build the Docker image
docker build -t cloudflare-static-deployer .

# 2. Run the container
docker run -d \
  --name cloudflare-deployer \
  -p 3000:3000 \
  --env-file .env.production \
  cloudflare-static-deployer

# 3. Check logs
docker logs -f cloudflare-deployer
```

#### With Nginx Reverse Proxy

```bash
# Run with nginx reverse proxy
docker-compose --profile with-nginx up -d
```

### Option 2: Manual Deployment

#### 1. Prepare the Application

```bash
# Install dependencies and build
npm ci
npm run build

# Or use the deployment script
./scripts/deploy.sh production  # Linux/macOS
scripts\deploy.bat production   # Windows
```

#### 2. Deploy to Server

```bash
# Copy files to server
scp -r deploy-production-* user@server:/path/to/app/

# On the server
cd /path/to/app/deploy-production-*
npm ci --only=production
NODE_ENV=production node dist/index.js
```

#### 3. Process Management with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'cloudflare-deployer',
    script: 'dist/index.js',
    cwd: '/path/to/app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Cloud Platform Deployment

#### Heroku

```bash
# 1. Create Heroku app
heroku create your-app-name

# 2. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CLOUDFLARE_API_TOKEN=your_token_here
# ... set other variables

# 3. Deploy
git push heroku main
```

#### Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway init
railway up
```

#### DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure environment variables in the dashboard
3. Set build command: `npm run build`
4. Set run command: `npm start`

## Production Checklist

### Security

- [ ] Configure strong `SESSION_SECRET`
- [ ] Set appropriate `CORS_ORIGINS`
- [ ] Use HTTPS in production
- [ ] Configure rate limiting
- [ ] Review file upload limits
- [ ] Enable security headers (via nginx)

### Performance

- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
- [ ] Set up monitoring and logging
- [ ] Configure health checks
- [ ] Set up backup strategy

### Monitoring

- [ ] Set up application monitoring (e.g., New Relic, DataDog)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Configure alerting

## Health Checks

The application provides a health check endpoint:

```bash
curl http://localhost:3000/health
```

Response:
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

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   # Kill the process
   kill -9 <PID>
   ```

2. **Permission denied errors**
   ```bash
   # Fix file permissions
   chmod +x scripts/deploy.sh
   ```

3. **Docker build fails**
   ```bash
   # Clean Docker cache
   docker system prune -a
   ```

4. **Environment variables not loaded**
   - Ensure `.env.production` file exists
   - Check file permissions
   - Verify variable names match exactly

### Logs

- **Docker**: `docker-compose logs -f`
- **PM2**: `pm2 logs cloudflare-deployer`
- **Manual**: Check stdout/stderr output

### Performance Issues

1. **High memory usage**
   - Monitor with `docker stats` or `pm2 monit`
   - Consider increasing memory limits
   - Check for memory leaks

2. **Slow API responses**
   - Check Cloudflare API rate limits
   - Monitor network latency
   - Review application logs

## Scaling

### Horizontal Scaling

```bash
# Scale with Docker Compose
docker-compose up -d --scale app=3

# Scale with PM2
pm2 scale cloudflare-deployer 4
```

### Load Balancing

Configure nginx or a cloud load balancer to distribute traffic across multiple instances.

### Database Considerations

This application uses Cloudflare API as the data source, so no database scaling is required. However, consider:

- API rate limiting
- Caching strategies
- Request optimization

## Backup and Recovery

### Configuration Backup

- Back up environment files
- Version control deployment scripts
- Document configuration changes

### Application State

Since the application is stateless and uses Cloudflare API:
- No database backup required
- Ensure Cloudflare account access
- Maintain API token security

## Updates and Maintenance

### Rolling Updates

```bash
# 1. Build new version
npm run build

# 2. Test in staging
NODE_ENV=staging npm start

# 3. Deploy with zero downtime (PM2)
pm2 reload cloudflare-deployer

# 4. Deploy with Docker
docker-compose up -d --no-deps app
```

### Maintenance Mode

```bash
# Put application in maintenance mode
docker-compose stop app
# Deploy maintenance page via nginx
```

## Support

For deployment issues:

1. Check application logs
2. Verify environment configuration
3. Test Cloudflare API connectivity
4. Review this deployment guide
5. Check project documentation