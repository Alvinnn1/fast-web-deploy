# Deployment Configuration Management

This directory contains the deployment configuration management system for the Cloudflare Static Deployer project. It provides a comprehensive solution for managing environment-specific configurations, validating settings, and generating deployment artifacts.

## Overview

The configuration system supports multiple environments (development, staging, production) and provides:

- **Environment-specific configurations** for frontend and backend components
- **Environment variable validation** with schemas and default values
- **Configuration validation** with comprehensive error checking
- **CLI utilities** for configuration management
- **Automatic environment file generation**

## Files Structure

```
config/
├── deployment.ts      # Core configuration manager and types
├── environments.ts    # Environment-specific configurations
├── validator.ts       # Configuration validation utilities
├── cli.ts            # Command-line interface
├── index.ts          # Main exports and helper functions
└── README.md         # This documentation
```

## Quick Start

### Basic Usage

```typescript
import { getCurrentConfig, getEnvVars, validateCurrentConfig } from './config';

// Get current environment configuration
const config = getCurrentConfig();

// Get environment variables for frontend
const frontendEnvVars = getEnvVars('frontend');

// Validate current configuration
const validation = validateCurrentConfig();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

### Using the Configuration Manager

```typescript
import { DeploymentConfigManager } from './config/deployment';

const configManager = new DeploymentConfigManager();

// Get configuration for specific environment
const prodConfig = configManager.getConfig('production');

// Generate environment file
const envContent = configManager.generateEnvFile('frontend', 'production');

// Validate environment variables
const validation = configManager.validateEnvironmentVariables('backend', {
  NODE_ENV: 'production',
  CLOUDFLARE_API_TOKEN: 'your-token'
});
```

## Environment Configuration

### Supported Environments

- **development**: Local development environment
- **staging**: Staging/testing environment  
- **production**: Production environment

### Configuration Structure

Each environment defines:

```typescript
interface DeploymentConfig {
  frontend: {
    platform: 'cloudflare-pages';
    domain?: string;
    buildCommand: string;
    publishDir: string;
    environmentVariables: Record<string, string>;
  };
  backend: {
    platform: 'cloudflare-workers' | 'railway' | 'render' | 'docker';
    domain?: string;
    environmentVariables: Record<string, string>;
    scaling?: {
      minInstances: number;
      maxInstances: number;
    };
  };
}
```

### Environment Variables

#### Frontend Variables

- `VITE_API_BASE_URL` (required): Backend API base URL
- `VITE_NODE_ENV` (required): Environment name
- `VITE_DEBUG` (optional): Enable debug mode
- `VITE_CLOUDFLARE_ACCOUNT_ID` (optional): Cloudflare account ID

#### Backend Variables

- `NODE_ENV` (required): Node environment
- `PORT` (optional): Server port (default: 3000)
- `CLOUDFLARE_API_TOKEN` (required): Cloudflare API token
- `CORS_ORIGINS` (required): Allowed CORS origins
- `LOG_LEVEL` (optional): Logging level

## CLI Usage

The configuration system includes a CLI utility for common tasks:

### Validate Configuration

```bash
# Validate current environment
node config/cli.js validate

# Validate specific environment
node config/cli.js validate --environment production
```

### Generate Environment Files

```bash
# Generate environment files for all components
node config/cli.js generate --environment production

# Generate for specific component
node config/cli.js generate --component frontend --environment staging
```

### Show Configuration

```bash
# Show current environment configuration
node config/cli.js show

# Show specific environment
node config/cli.js show --environment production
```

### Show Environment Variables

```bash
# Show backend environment variables for production
node config/cli.js env --component backend --environment production
```

## Validation

The system provides comprehensive validation:

### Configuration Validation

```typescript
import { ConfigValidator } from './config/validator';

const result = ConfigValidator.validateDeploymentConfig(config, 'production', {
  strict: true,
  validateSecrets: true
});

if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}
```

### Environment Variable Validation

- **Required variables**: Ensures all required variables are present
- **Format validation**: Validates URLs, ports, and other formats
- **Cross-component consistency**: Checks API URLs match between frontend/backend
- **Security validation**: Warns about weak secrets in production

## Customization

### Custom Configurations

```typescript
import { DeploymentConfigManager } from './config/deployment';

const customConfigs = {
  production: {
    backend: {
      platform: 'railway' as const,
      domain: 'api.mycustomdomain.com'
    }
  }
};

const configManager = new DeploymentConfigManager(customConfigs);
```

### Custom Validation

```typescript
import { ConfigValidator } from './config/validator';

// Validate URL format
const isValidUrl = ConfigValidator.validateUrl('https://api.example.com');

// Validate domain format
const isValidDomain = ConfigValidator.validateDomain('example.com');
```

## Integration with Deployment Scripts

The configuration system integrates with deployment scripts:

```bash
#!/bin/bash
# deploy-frontend.sh

# Validate configuration before deployment
node config/cli.js validate --environment production --component frontend

if [ $? -eq 0 ]; then
  echo "Configuration valid, proceeding with deployment..."
  # Deployment commands here
else
  echo "Configuration validation failed, aborting deployment"
  exit 1
fi
```

## Best Practices

### Environment Variables

1. **Never commit secrets**: Use placeholder values in configuration files
2. **Use environment-specific values**: Different API URLs for each environment
3. **Validate before deployment**: Always run validation before deploying
4. **Document variables**: Include descriptions for all environment variables

### Configuration Management

1. **Use the CLI**: Leverage CLI tools for configuration tasks
2. **Validate regularly**: Run validation as part of CI/CD pipeline
3. **Keep configurations in sync**: Ensure frontend and backend configurations match
4. **Review before production**: Always review production configurations carefully

### Security

1. **Rotate secrets regularly**: Update API tokens and secrets periodically
2. **Use strong secrets**: Avoid placeholder or weak values in production
3. **Limit CORS origins**: Only allow necessary origins in CORS configuration
4. **Enable security headers**: Configure appropriate security headers for production

## Troubleshooting

### Common Issues

1. **Missing environment variables**: Check validation output for required variables
2. **Invalid URLs**: Ensure API URLs are properly formatted with protocol
3. **CORS issues**: Verify CORS origins include frontend domain
4. **Platform compatibility**: Ensure selected platforms support required features

### Debug Mode

Enable debug mode in development:

```typescript
const config = configManager.getConfig('development');
// VITE_DEBUG=true enables additional logging
```

### Validation Errors

Common validation errors and solutions:

- `Missing required environment variable`: Add the variable to environment configuration
- `Invalid value for VITE_API_BASE_URL`: Ensure URL includes protocol (http/https)
- `CORS origins don't include frontend domain`: Add frontend domain to CORS_ORIGINS
- `Environment variables should match deployment environment`: Ensure NODE_ENV matches target environment

## Contributing

When adding new configuration options:

1. Update the TypeScript interfaces in `deployment.ts`
2. Add validation rules in `validator.ts`
3. Update environment configurations in `environments.ts`
4. Add CLI support if needed in `cli.ts`
5. Update this documentation