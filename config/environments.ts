/**
 * Environment-specific configurations
 * 
 * This file contains detailed configurations for each environment
 */

import { EnvironmentConfig, DeploymentConfig } from './deployment';

/**
 * Development environment configuration
 */
export const developmentConfig: DeploymentConfig = {
  frontend: {
    platform: 'cloudflare-pages',
    buildCommand: 'npm run build',
    publishDir: 'frontend/dist',
    environmentVariables: {
      VITE_API_BASE_URL: 'http://localhost:3000',
      VITE_NODE_ENV: 'development',
      VITE_DEBUG: 'true'
    }
  },
  backend: {
    platform: 'docker',
    environmentVariables: {
      NODE_ENV: 'development',
      PORT: '3000',
      CORS_ORIGINS: 'http://localhost:5173,http://localhost:4173',
      LOG_LEVEL: 'debug'
    }
  }
};

/**
 * Staging environment configuration
 */
export const stagingConfig: DeploymentConfig = {
  frontend: {
    platform: 'cloudflare-pages',
    domain: 'staging.yourdomain.com',
    buildCommand: 'npm run build',
    publishDir: 'frontend/dist',
    environmentVariables: {
      VITE_API_BASE_URL: 'https://api-staging.yourdomain.com',
      VITE_NODE_ENV: 'staging',
      VITE_DEBUG: 'false'
    }
  },
  backend: {
    platform: 'cloudflare-workers',
    domain: 'api-staging.yourdomain.com',
    environmentVariables: {
      NODE_ENV: 'staging',
      CORS_ORIGINS: 'https://staging.yourdomain.com',
      LOG_LEVEL: 'info'
    },
    scaling: {
      minInstances: 1,
      maxInstances: 10
    }
  }
};

/**
 * Production environment configuration
 */
export const productionConfig: DeploymentConfig = {
  frontend: {
    platform: 'cloudflare-pages',
    domain: 'yourdomain.com',
    buildCommand: 'npm run build',
    publishDir: 'frontend/dist',
    environmentVariables: {
      VITE_API_BASE_URL: 'https://api.yourdomain.com',
      VITE_NODE_ENV: 'production',
      VITE_DEBUG: 'false'
    }
  },
  backend: {
    platform: 'cloudflare-workers',
    domain: 'api.yourdomain.com',
    environmentVariables: {
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://yourdomain.com',
      LOG_LEVEL: 'warn'
    },
    scaling: {
      minInstances: 2,
      maxInstances: 50
    }
  }
};

/**
 * Complete environment configuration
 */
export const environmentConfigs: EnvironmentConfig = {
  development: developmentConfig,
  staging: stagingConfig,
  production: productionConfig
};

/**
 * Environment-specific feature flags
 */
export const featureFlags = {
  development: {
    enableDebugMode: true,
    enableMockData: true,
    enableHotReload: true,
    enableSourceMaps: true
  },
  staging: {
    enableDebugMode: false,
    enableMockData: false,
    enableHotReload: false,
    enableSourceMaps: true
  },
  production: {
    enableDebugMode: false,
    enableMockData: false,
    enableHotReload: false,
    enableSourceMaps: false
  }
};

/**
 * Environment-specific resource limits
 */
export const resourceLimits = {
  development: {
    maxFileSize: '10MB',
    maxRequestsPerMinute: 1000,
    timeoutMs: 30000
  },
  staging: {
    maxFileSize: '50MB',
    maxRequestsPerMinute: 5000,
    timeoutMs: 15000
  },
  production: {
    maxFileSize: '100MB',
    maxRequestsPerMinute: 10000,
    timeoutMs: 10000
  }
};