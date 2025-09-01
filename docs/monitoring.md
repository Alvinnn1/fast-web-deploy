# Monitoring and Health Checks

This document describes the monitoring and health check features implemented for the Cloudflare Static Deployer.

## Health Check Endpoints

### Enhanced Health Check (`/health`)

The enhanced health check endpoint provides comprehensive system status information:

```bash
curl http://localhost:3000/health
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "status": "healthy|degraded|unhealthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0",
    "uptime": 3600,
    "checks": {
      "database": {
        "status": "pass|warn|fail",
        "message": "Status message",
        "response_time_ms": 50
      },
      "cloudflare_api": {
        "status": "pass|warn|fail",
        "message": "Cloudflare API is accessible",
        "response_time_ms": 150
      },
      "memory": {
        "status": "pass|warn|fail",
        "message": "Memory usage: 128MB RSS, 64MB/128MB heap",
        "details": {
          "rss_mb": 128,
          "heap_used_mb": 64,
          "heap_total_mb": 128,
          "heap_usage_percent": 50
        }
      },
      "disk": {
        "status": "pass|warn|fail",
        "message": "Disk access is working"
      }
    },
    "environment": "production",
    "build_info": {
      "commit": "abc123",
      "build_time": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Simple Health Check (`/health/simple`)

A lightweight health check for load balancers:

```bash
curl http://localhost:3000/health/simple
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Monitoring Endpoints

### System Information (`/api/monitoring/system`)

Get detailed system information:

```bash
curl http://localhost:3000/api/monitoring/system
```

### Deployment Information (`/api/monitoring/deployment`)

Get deployment-specific information:

```bash
curl http://localhost:3000/api/monitoring/deployment
```

### Analytics Data (`/api/analytics/zone`)

Get Cloudflare zone analytics (requires zone_id):

```bash
curl "http://localhost:3000/api/analytics/zone?zone_id=your-zone-id"
```

### Pages Analytics (`/api/analytics/pages`)

Get Cloudflare Pages analytics:

```bash
curl "http://localhost:3000/api/analytics/pages?project_name=your-project"
```

## Deployment Testing

### Automated Testing Script

Test your deployment after it's live:

```bash
# Test local development
npm run test:deployment

# Test production deployment
FRONTEND_URL=https://myapp.pages.dev BACKEND_URL=https://api.myapp.com npm run test:deployment
```

The script tests:
- Frontend accessibility
- Backend health checks
- API endpoints
- CORS configuration
- Performance metrics

### Test Results

The script generates a detailed report in `deployment-test-report.json`:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "config": {
    "frontend": { "url": "https://myapp.pages.dev" },
    "backend": { "url": "https://api.myapp.com" }
  },
  "results": {
    "frontend": [...],
    "backend": [...]
  },
  "summary": {
    "total_tests": 15,
    "passed": 13,
    "failed": 0,
    "warnings": 2,
    "success_rate": 100
  }
}
```

## Monitoring Dashboard

### CLI Dashboard

Monitor your deployment in real-time:

```bash
# Start monitoring dashboard
npm run monitor

# Run once and exit
npm run monitor:once

# Custom backend URL
BACKEND_URL=https://api.myapp.com npm run monitor
```

The dashboard shows:
- Health status
- System information
- Deployment details
- Performance metrics
- Real-time updates

### Environment Variables

Configure monitoring behavior:

- `BACKEND_URL`: Backend URL to monitor (default: http://localhost:3000)
- `REFRESH_INTERVAL`: Refresh interval in milliseconds (default: 30000)
- `SHOW_ANALYTICS`: Show analytics data (default: true)

## CI/CD Integration

### GitHub Actions

The deployment testing workflow automatically runs after successful deployments:

```yaml
# .github/workflows/deployment-test.yml
name: Deployment Testing
on:
  workflow_run:
    workflows: ["Deploy to Cloudflare"]
    types: [completed]
```

### Manual Trigger

You can also trigger deployment tests manually:

1. Go to Actions tab in GitHub
2. Select "Deployment Testing" workflow
3. Click "Run workflow"
4. Provide frontend and backend URLs

## Health Check Status Codes

- **200 OK**: System is healthy
- **200 OK**: System is degraded (warnings present)
- **503 Service Unavailable**: System is unhealthy

## Alerting

### Slack Integration

Configure Slack notifications for deployment test results:

1. Create a Slack webhook URL
2. Add `SLACK_WEBHOOK_URL` to your repository secrets
3. The workflow will automatically notify on success/failure

### Custom Alerting

You can integrate with other monitoring systems by:

1. Polling the `/health` endpoint
2. Parsing the JSON response
3. Setting up alerts based on status and individual check results

## Troubleshooting

### Common Issues

1. **Health check returns 503**
   - Check individual component status in the response
   - Verify Cloudflare API token is valid
   - Check system resources (memory, disk)

2. **Deployment tests fail**
   - Verify URLs are accessible
   - Check CORS configuration
   - Ensure services are fully started

3. **Monitoring dashboard shows errors**
   - Verify backend URL is correct
   - Check network connectivity
   - Ensure monitoring endpoints are enabled

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

This will provide detailed information about health checks and monitoring operations.