/**
 * Configuration Validator
 * 
 * Validates deployment configurations and environment variables
 */

import { DeploymentConfig, Environment, EnvVarSchema } from './deployment';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationOptions {
  strict?: boolean;
  checkConnectivity?: boolean;
  validateSecrets?: boolean;
}

/**
 * Comprehensive configuration validator
 */
export class ConfigValidator {
  /**
   * Validate a complete deployment configuration
   */
  static validateDeploymentConfig(
    config: DeploymentConfig,
    environment: Environment,
    options: ValidationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate frontend configuration
    const frontendResult = this.validateFrontendConfig(config.frontend, environment, options);
    errors.push(...frontendResult.errors);
    warnings.push(...frontendResult.warnings);

    // Validate backend configuration
    const backendResult = this.validateBackendConfig(config.backend, environment, options);
    errors.push(...backendResult.errors);
    warnings.push(...backendResult.warnings);

    // Cross-component validation
    const crossResult = this.validateCrossComponentConfig(config, environment, options);
    errors.push(...crossResult.errors);
    warnings.push(...crossResult.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate frontend configuration
   */
  private static validateFrontendConfig(
    config: DeploymentConfig['frontend'],
    environment: Environment,
    options: ValidationOptions
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate platform
    if (config.platform !== 'cloudflare-pages') {
      errors.push(`Unsupported frontend platform: ${config.platform}`);
    }

    // Validate build configuration
    if (!config.buildCommand) {
      errors.push('Frontend build command is required');
    }

    if (!config.publishDir) {
      errors.push('Frontend publish directory is required');
    }

    // Validate environment variables
    const envResult = this.validateEnvironmentVariables(
      config.environmentVariables,
      'frontend',
      environment,
      options
    );
    errors.push(...envResult.errors);
    warnings.push(...envResult.warnings);

    // Environment-specific validations
    if (environment === 'production') {
      if (!config.domain) {
        warnings.push('Production frontend should have a custom domain configured');
      }

      if (config.environmentVariables.VITE_DEBUG === 'true') {
        warnings.push('Debug mode should be disabled in production');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate backend configuration
   */
  private static validateBackendConfig(
    config: DeploymentConfig['backend'],
    environment: Environment,
    options: ValidationOptions
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate platform
    const supportedPlatforms = ['cloudflare-workers', 'railway', 'render', 'docker'];
    if (!supportedPlatforms.includes(config.platform)) {
      errors.push(`Unsupported backend platform: ${config.platform}`);
    }

    // Validate scaling configuration
    if (config.scaling) {
      if (config.scaling.minInstances < 0) {
        errors.push('Minimum instances cannot be negative');
      }

      if (config.scaling.maxInstances < config.scaling.minInstances) {
        errors.push('Maximum instances cannot be less than minimum instances');
      }

      // Platform-specific scaling validation
      if (config.platform === 'cloudflare-workers') {
        if (config.scaling.maxInstances > 100) {
          warnings.push('Cloudflare Workers may have performance issues with more than 100 instances');
        }
      }
    }

    // Validate environment variables
    const envResult = this.validateEnvironmentVariables(
      config.environmentVariables,
      'backend',
      environment,
      options
    );
    errors.push(...envResult.errors);
    warnings.push(...envResult.warnings);

    // Environment-specific validations
    if (environment === 'production') {
      if (!config.domain) {
        warnings.push('Production backend should have a custom domain configured');
      }

      if (config.environmentVariables.LOG_LEVEL === 'debug') {
        warnings.push('Debug logging should be disabled in production');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate cross-component configuration
   */
  private static validateCrossComponentConfig(
    config: DeploymentConfig,
    environment: Environment,
    options: ValidationOptions
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate API URL consistency
    const frontendApiUrl = config.frontend.environmentVariables.VITE_API_BASE_URL;
    const backendDomain = config.backend.domain;

    if (frontendApiUrl && backendDomain) {
      const expectedUrl = `https://${backendDomain}`;
      if (frontendApiUrl !== expectedUrl) {
        warnings.push(`Frontend API URL (${frontendApiUrl}) doesn't match backend domain (${expectedUrl})`);
      }
    }

    // Validate CORS configuration
    const corsOrigins = config.backend.environmentVariables.CORS_ORIGINS;
    const frontendDomain = config.frontend.domain;

    if (corsOrigins && frontendDomain) {
      const origins = corsOrigins.split(',').map(o => o.trim());
      const expectedOrigin = `https://${frontendDomain}`;

      if (!origins.includes(expectedOrigin)) {
        warnings.push(`CORS origins don't include frontend domain: ${expectedOrigin}`);
      }
    }

    // Environment consistency checks
    const frontendEnv = config.frontend.environmentVariables.VITE_NODE_ENV;
    const backendEnv = config.backend.environmentVariables.NODE_ENV;

    if (frontendEnv !== environment || backendEnv !== environment) {
      warnings.push('Environment variables should match the deployment environment');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate environment variables against schema
   */
  private static validateEnvironmentVariables(
    envVars: Record<string, string>,
    component: 'frontend' | 'backend',
    environment: Environment,
    options: ValidationOptions
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Define schemas (this would typically come from the deployment config)
    const schemas = this.getEnvVarSchemas(component);

    for (const schema of schemas) {
      const value = envVars[schema.name];

      // Check required variables
      if (schema.required && (!value || value.trim() === '')) {
        if (schema.defaultValue) {
          warnings.push(`Missing required variable ${schema.name}, will use default: ${schema.defaultValue}`);
        } else {
          errors.push(`Missing required environment variable: ${schema.name}`);
        }
        continue;
      }

      // Skip validation if value is empty and not required
      if (!value && !schema.required) {
        continue;
      }

      // Validate value format
      if (value && schema.validator && !schema.validator(value)) {
        errors.push(`Invalid value for ${schema.name}: ${value}`);
      }

      // Environment-specific validations
      if (environment === 'production' && options.validateSecrets) {
        if (schema.name.includes('TOKEN') || schema.name.includes('SECRET')) {
          if (value && (value.length < 10 || value === 'your-token-here')) {
            warnings.push(`${schema.name} appears to be a placeholder or weak secret`);
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Get environment variable schemas for a component
   */
  private static getEnvVarSchemas(component: 'frontend' | 'backend'): EnvVarSchema[] {
    const schemas: Record<string, EnvVarSchema[]> = {
      frontend: [
        {
          name: 'VITE_API_BASE_URL',
          required: true,
          description: 'Base URL for the backend API',
          validator: (value) => /^https?:\/\/.+/.test(value)
        },
        {
          name: 'VITE_NODE_ENV',
          required: true,
          description: 'Node environment',
          validator: (value) => ['development', 'staging', 'production'].includes(value)
        },
        {
          name: 'VITE_DEBUG',
          required: false,
          description: 'Enable debug mode',
          validator: (value) => ['true', 'false'].includes(value)
        }
      ],
      backend: [
        {
          name: 'NODE_ENV',
          required: true,
          description: 'Node environment',
          validator: (value) => ['development', 'staging', 'production'].includes(value)
        },
        {
          name: 'PORT',
          required: false,
          description: 'Server port',
          validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0
        },
        {
          name: 'CLOUDFLARE_API_TOKEN',
          required: true,
          description: 'Cloudflare API token'
        },
        {
          name: 'CORS_ORIGINS',
          required: true,
          description: 'Allowed CORS origins'
        },
        {
          name: 'LOG_LEVEL',
          required: false,
          description: 'Logging level',
          validator: (value) => ['debug', 'info', 'warn', 'error'].includes(value)
        }
      ]
    };

    return schemas[component] || [];
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate domain format
   */
  static validateDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  /**
   * Validate port number
   */
  static validatePort(port: string | number): boolean {
    const portNum = typeof port === 'string' ? parseInt(port) : port;
    return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
  }
}