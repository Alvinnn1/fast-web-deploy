/**
 * Configuration Module Index
 * 
 * Main entry point for the deployment configuration system
 */

// Core configuration classes and types
export {
  DeploymentConfigManager,
  deploymentConfig,
  utils as configUtils,
  type Environment,
  type Platform,
  type DeploymentConfig,
  type EnvironmentConfig,
  type FrontendConfig,
  type BackendConfig,
  type EnvVarSchema
} from './deployment';

// Environment-specific configurations
export {
  environmentConfigs,
  developmentConfig,
  stagingConfig,
  productionConfig,
  featureFlags,
  resourceLimits
} from './environments';

// Configuration validator
export {
  ConfigValidator,
  type ValidationResult,
  type ValidationOptions
} from './validator';

// CLI utility
export { default as ConfigCLI } from './cli';

/**
 * Quick access functions for common operations
 */

import { DeploymentConfigManager } from './deployment';
import { environmentConfigs } from './environments';
import { ConfigValidator } from './validator';

// Create default config manager instance
const defaultConfigManager = new DeploymentConfigManager(environmentConfigs);

/**
 * Get configuration for current environment
 */
export const getCurrentConfig = () => {
  return defaultConfigManager.getConfig();
};

/**
 * Get configuration for specific environment
 */
export const getConfig = (environment: 'development' | 'staging' | 'production') => {
  return defaultConfigManager.getConfig(environment);
};

/**
 * Validate current configuration
 */
export const validateCurrentConfig = () => {
  const environment = defaultConfigManager.getCurrentEnvironment();
  const config = defaultConfigManager.getConfig(environment);
  return ConfigValidator.validateDeploymentConfig(config, environment);
};

/**
 * Get environment variables for a component
 */
export const getEnvVars = (
  component: 'frontend' | 'backend',
  environment?: 'development' | 'staging' | 'production'
) => {
  return defaultConfigManager.getEnvironmentVariables(component, environment);
};

/**
 * Generate environment file content
 */
export const generateEnvFile = (
  component: 'frontend' | 'backend',
  environment?: 'development' | 'staging' | 'production'
) => {
  return defaultConfigManager.generateEnvFile(component, environment);
};

/**
 * Check if configuration is ready for deployment
 */
export const isReadyForDeployment = (
  environment?: 'development' | 'staging' | 'production'
) => {
  const result = defaultConfigManager.validateDeploymentConfig(environment);
  return result.isValid;
};

/**
 * Get deployment platform for a component
 */
export const getPlatform = (
  component: 'frontend' | 'backend',
  environment?: 'development' | 'staging' | 'production'
) => {
  return defaultConfigManager.getPlatform(component, environment);
};

/**
 * Configuration presets for quick setup
 */
export const presets = {
  /**
   * Development preset - optimized for local development
   */
  development: {
    frontend: {
      enableHotReload: true,
      enableSourceMaps: true,
      enableDebugMode: true
    },
    backend: {
      enableCors: true,
      logLevel: 'debug',
      enableMockData: true
    }
  },

  /**
   * Production preset - optimized for production deployment
   */
  production: {
    frontend: {
      enableHotReload: false,
      enableSourceMaps: false,
      enableDebugMode: false,
      enableCompression: true
    },
    backend: {
      enableCors: true,
      logLevel: 'warn',
      enableMockData: false,
      enableRateLimit: true
    }
  }
};

/**
 * Helper functions for common configuration tasks
 */
export const helpers = {
  /**
   * Create environment file for frontend
   */
  createFrontendEnv: (environment: 'development' | 'staging' | 'production' = 'development') => {
    return generateEnvFile('frontend', environment);
  },

  /**
   * Create environment file for backend
   */
  createBackendEnv: (environment: 'development' | 'staging' | 'production' = 'development') => {
    return generateEnvFile('backend', environment);
  },

  /**
   * Validate all environments
   */
  validateAllEnvironments: () => {
    const results = {
      development: validateCurrentConfig(),
      staging: ConfigValidator.validateDeploymentConfig(
        getConfig('staging'),
        'staging'
      ),
      production: ConfigValidator.validateDeploymentConfig(
        getConfig('production'),
        'production'
      )
    };

    return results;
  },

  /**
   * Get configuration summary
   */
  getConfigSummary: () => {
    const currentEnv = defaultConfigManager.getCurrentEnvironment();
    const config = defaultConfigManager.getConfig();

    return {
      currentEnvironment: currentEnv,
      frontendPlatform: config.frontend.platform,
      backendPlatform: config.backend.platform,
      frontendDomain: config.frontend.domain,
      backendDomain: config.backend.domain,
      isValid: isReadyForDeployment()
    };
  }
};