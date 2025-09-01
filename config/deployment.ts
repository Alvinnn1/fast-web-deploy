/**
 * Deployment Configuration Manager
 * 
 * Manages deployment configurations for different environments (dev/staging/prod)
 * Provides environment variable validation and default values
 */

export type Environment = 'development' | 'staging' | 'production';

export type Platform = 'cloudflare-pages' | 'cloudflare-workers' | 'railway' | 'render' | 'docker';

export interface FrontendConfig {
  platform: 'cloudflare-pages';
  domain?: string;
  buildCommand: string;
  publishDir: string;
  environmentVariables: Record<string, string>;
}

export interface BackendConfig {
  platform: Platform;
  domain?: string;
  environmentVariables: Record<string, string>;
  scaling?: {
    minInstances: number;
    maxInstances: number;
  };
}

export interface DeploymentConfig {
  frontend: FrontendConfig;
  backend: BackendConfig;
}

export interface EnvironmentConfig {
  development: DeploymentConfig;
  staging: DeploymentConfig;
  production: DeploymentConfig;
}

/**
 * Environment variable validation schema
 */
export interface EnvVarSchema {
  name: string;
  required: boolean;
  defaultValue?: string;
  description: string;
  validator?: (value: string) => boolean;
}

/**
 * Default environment configurations
 */
const DEFAULT_CONFIGS: EnvironmentConfig = {
  development: {
    frontend: {
      platform: 'cloudflare-pages',
      buildCommand: 'npm run build',
      publishDir: 'frontend/dist',
      environmentVariables: {
        VITE_API_BASE_URL: 'http://localhost:3000',
        VITE_NODE_ENV: 'development'
      }
    },
    backend: {
      platform: 'docker',
      environmentVariables: {
        NODE_ENV: 'development',
        PORT: '3000',
        CORS_ORIGINS: 'http://localhost:5173'
      }
    }
  },
  staging: {
    frontend: {
      platform: 'cloudflare-pages',
      buildCommand: 'npm run build',
      publishDir: 'frontend/dist',
      environmentVariables: {
        VITE_API_BASE_URL: 'https://api-staging.yourdomain.com',
        VITE_NODE_ENV: 'staging'
      }
    },
    backend: {
      platform: 'cloudflare-workers',
      environmentVariables: {
        NODE_ENV: 'staging',
        CORS_ORIGINS: 'https://staging.yourdomain.com'
      },
      scaling: {
        minInstances: 1,
        maxInstances: 10
      }
    }
  },
  production: {
    frontend: {
      platform: 'cloudflare-pages',
      domain: 'yourdomain.com',
      buildCommand: 'npm run build',
      publishDir: 'frontend/dist',
      environmentVariables: {
        VITE_API_BASE_URL: 'https://api.yourdomain.com',
        VITE_NODE_ENV: 'production'
      }
    },
    backend: {
      platform: 'cloudflare-workers',
      domain: 'api.yourdomain.com',
      environmentVariables: {
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://yourdomain.com'
      },
      scaling: {
        minInstances: 2,
        maxInstances: 50
      }
    }
  }
};

/**
 * Environment variable schemas for validation
 */
const ENV_VAR_SCHEMAS: Record<string, EnvVarSchema[]> = {
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
      defaultValue: 'development',
      description: 'Node environment (development, staging, production)'
    },
    {
      name: 'VITE_CLOUDFLARE_ACCOUNT_ID',
      required: false,
      description: 'Cloudflare account ID for API calls'
    }
  ],
  backend: [
    {
      name: 'NODE_ENV',
      required: true,
      defaultValue: 'development',
      description: 'Node environment'
    },
    {
      name: 'PORT',
      required: false,
      defaultValue: '3000',
      description: 'Server port number',
      validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0
    },
    {
      name: 'CLOUDFLARE_API_TOKEN',
      required: true,
      description: 'Cloudflare API token for authentication'
    },
    {
      name: 'CORS_ORIGINS',
      required: true,
      description: 'Allowed CORS origins (comma-separated)'
    }
  ]
};

/**
 * Deployment Configuration Manager Class
 */
export class DeploymentConfigManager {
  private configs: EnvironmentConfig;
  private currentEnvironment: Environment;

  constructor(customConfigs?: Partial<EnvironmentConfig>) {
    this.configs = this.mergeConfigs(DEFAULT_CONFIGS, customConfigs || {});
    this.currentEnvironment = this.detectEnvironment();
  }

  /**
   * Get configuration for a specific environment
   */
  getConfig(environment?: Environment): DeploymentConfig {
    const env = environment || this.currentEnvironment;
    return this.configs[env];
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * Set current environment
   */
  setEnvironment(environment: Environment): void {
    this.currentEnvironment = environment;
  }

  /**
   * Validate environment variables for a specific component
   */
  validateEnvironmentVariables(
    component: 'frontend' | 'backend',
    envVars: Record<string, string>
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const schemas = ENV_VAR_SCHEMAS[component];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const schema of schemas) {
      const value = envVars[schema.name];

      // Check required variables
      if (schema.required && (!value || value.trim() === '')) {
        if (schema.defaultValue) {
          warnings.push(`Missing required variable ${schema.name}, using default: ${schema.defaultValue}`);
        } else {
          errors.push(`Missing required environment variable: ${schema.name}`);
        }
        continue;
      }

      // Validate value if validator is provided
      if (value && schema.validator && !schema.validator(value)) {
        errors.push(`Invalid value for ${schema.name}: ${value}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get environment variables with defaults applied
   */
  getEnvironmentVariables(
    component: 'frontend' | 'backend',
    environment?: Environment
  ): Record<string, string> {
    const env = environment || this.currentEnvironment;
    const config = this.configs[env];
    const envVars = component === 'frontend' ? config.frontend.environmentVariables : config.backend.environmentVariables;
    const schemas = ENV_VAR_SCHEMAS[component];

    const result = { ...envVars };

    // Apply default values for missing variables
    for (const schema of schemas) {
      if (!result[schema.name] && schema.defaultValue) {
        result[schema.name] = schema.defaultValue;
      }
    }

    return result;
  }

  /**
   * Generate environment file content
   */
  generateEnvFile(
    component: 'frontend' | 'backend',
    environment?: Environment
  ): string {
    const envVars = this.getEnvironmentVariables(component, environment);
    const schemas = ENV_VAR_SCHEMAS[component];

    let content = `# Environment variables for ${component} (${environment || this.currentEnvironment})\n`;
    content += `# Generated by DeploymentConfigManager\n\n`;

    for (const schema of schemas) {
      content += `# ${schema.description}\n`;
      if (!schema.required) {
        content += `# Optional - `;
      }
      content += `${schema.name}=${envVars[schema.name] || ''}\n\n`;
    }

    return content;
  }

  /**
   * Get deployment platform for a component
   */
  getPlatform(component: 'frontend' | 'backend', environment?: Environment): Platform {
    const env = environment || this.currentEnvironment;
    const config = this.configs[env];
    return component === 'frontend' ? config.frontend.platform : config.backend.platform;
  }

  /**
   * Check if configuration is valid for deployment
   */
  validateDeploymentConfig(environment?: Environment): { isValid: boolean; errors: string[] } {
    const env = environment || this.currentEnvironment;
    const config = this.configs[env];
    const errors: string[] = [];

    // Validate frontend config
    const frontendValidation = this.validateEnvironmentVariables('frontend', config.frontend.environmentVariables);
    errors.push(...frontendValidation.errors);

    // Validate backend config
    const backendValidation = this.validateEnvironmentVariables('backend', config.backend.environmentVariables);
    errors.push(...backendValidation.errors);

    // Check platform compatibility
    if (config.backend.platform === 'cloudflare-workers' && config.backend.scaling) {
      if (config.backend.scaling.maxInstances > 100) {
        errors.push('Cloudflare Workers scaling maxInstances should not exceed 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect current environment from NODE_ENV or other indicators
   */
  private detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV;

    if (nodeEnv === 'production') return 'production';
    if (nodeEnv === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Merge default configs with custom configs
   */
  private mergeConfigs(
    defaultConfigs: EnvironmentConfig,
    customConfigs: Partial<EnvironmentConfig>
  ): EnvironmentConfig {
    const result = { ...defaultConfigs };

    for (const env of Object.keys(customConfigs) as Environment[]) {
      if (customConfigs[env]) {
        result[env] = {
          frontend: { ...result[env].frontend, ...customConfigs[env]?.frontend },
          backend: { ...result[env].backend, ...customConfigs[env]?.backend }
        };
      }
    }

    return result;
  }
}

/**
 * Default instance of the deployment config manager
 */
export const deploymentConfig = new DeploymentConfigManager();

/**
 * Utility functions
 */
export const utils = {
  /**
   * Create a new config manager with custom configurations
   */
  createConfigManager: (customConfigs?: Partial<EnvironmentConfig>) =>
    new DeploymentConfigManager(customConfigs),

  /**
   * Get environment variable schemas
   */
  getEnvVarSchemas: () => ENV_VAR_SCHEMAS,

  /**
   * Validate a single environment variable
   */
  validateEnvVar: (name: string, value: string, component: 'frontend' | 'backend'): boolean => {
    const schemas = ENV_VAR_SCHEMAS[component];
    const schema = schemas.find(s => s.name === name);

    if (!schema) return true;
    if (schema.validator) return schema.validator(value);
    return true;
  }
};