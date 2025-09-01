#!/usr/bin/env node

/**
 * Configuration CLI Utility
 * 
 * Command-line interface for managing deployment configurations
 */

import { DeploymentConfigManager, Environment } from './deployment';
import { ConfigValidator } from './validator';
import { environmentConfigs } from './environments';

interface CLIOptions {
  environment?: Environment;
  component?: 'frontend' | 'backend';
  output?: string;
  validate?: boolean;
  generate?: boolean;
}

/**
 * Configuration CLI class
 */
export class ConfigCLI {
  private configManager: DeploymentConfigManager;

  constructor() {
    this.configManager = new DeploymentConfigManager(environmentConfigs);
  }

  /**
   * Main CLI entry point
   */
  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);
    const command = args[0];

    try {
      switch (command) {
        case 'validate':
          await this.validateCommand(options);
          break;
        case 'generate':
          await this.generateCommand(options);
          break;
        case 'show':
          await this.showCommand(options);
          break;
        case 'env':
          await this.envCommand(options);
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Validate configuration command
   */
  private async validateCommand(options: CLIOptions): Promise<void> {
    const environment = options.environment || this.configManager.getCurrentEnvironment();
    const config = this.configManager.getConfig(environment);

    console.log(`Validating configuration for ${environment} environment...`);

    const result = ConfigValidator.validateDeploymentConfig(config, environment, {
      strict: true,
      validateSecrets: environment === 'production'
    });

    if (result.isValid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration validation failed');
      result.errors.forEach(error => console.log(`  Error: ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`  Warning: ${warning}`));
    }

    if (!result.isValid) {
      process.exit(1);
    }
  }

  /**
   * Generate environment files command
   */
  private async generateCommand(options: CLIOptions): Promise<void> {
    const environment = options.environment || this.configManager.getCurrentEnvironment();
    const component = options.component;

    if (!component) {
      // Generate for both components
      await this.generateEnvFile('frontend', environment, options.output);
      await this.generateEnvFile('backend', environment, options.output);
    } else {
      await this.generateEnvFile(component, environment, options.output);
    }
  }

  /**
   * Show configuration command
   */
  private async showCommand(options: CLIOptions): Promise<void> {
    const environment = options.environment || this.configManager.getCurrentEnvironment();
    const config = this.configManager.getConfig(environment);

    console.log(`Configuration for ${environment} environment:`);
    console.log(JSON.stringify(config, null, 2));
  }

  /**
   * Environment variables command
   */
  private async envCommand(options: CLIOptions): Promise<void> {
    const environment = options.environment || this.configManager.getCurrentEnvironment();
    const component = options.component;

    if (!component) {
      console.error('Component (--component frontend|backend) is required for env command');
      process.exit(1);
    }

    const envVars = this.configManager.getEnvironmentVariables(component, environment);

    console.log(`Environment variables for ${component} (${environment}):`);
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`${key}=${value}`);
    });
  }

  /**
   * Generate environment file for a component
   */
  private async generateEnvFile(
    component: 'frontend' | 'backend',
    environment: Environment,
    outputDir?: string
  ): Promise<void> {
    const content = this.configManager.generateEnvFile(component, environment);
    const filename = component === 'frontend' ? '.env.production' : '.env';
    const filepath = outputDir ? `${outputDir}/${filename}` : `${component}/${filename}`;

    // In a real implementation, you would write to file system
    console.log(`Generated ${filepath}:`);
    console.log(content);
  }

  /**
   * Parse command line arguments
   */
  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {};

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--environment':
        case '-e':
          options.environment = args[++i] as Environment;
          break;
        case '--component':
        case '-c':
          options.component = args[++i] as 'frontend' | 'backend';
          break;
        case '--output':
        case '-o':
          options.output = args[++i];
          break;
        case '--validate':
          options.validate = true;
          break;
        case '--generate':
          options.generate = true;
          break;
      }
    }

    return options;
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
Deployment Configuration CLI

Usage: node config/cli.js <command> [options]

Commands:
  validate    Validate deployment configuration
  generate    Generate environment files
  show        Show configuration for environment
  env         Show environment variables
  help        Show this help message

Options:
  -e, --environment <env>    Environment (development|staging|production)
  -c, --component <comp>     Component (frontend|backend)
  -o, --output <dir>         Output directory for generated files
  --validate                 Validate configuration
  --generate                 Generate environment files

Examples:
  node config/cli.js validate --environment production
  node config/cli.js generate --component frontend --environment staging
  node config/cli.js show --environment development
  node config/cli.js env --component backend --environment production
`);
  }
}

/**
 * Run CLI if this file is executed directly
 */
if (require.main === module) {
  const cli = new ConfigCLI();
  cli.run(process.argv.slice(2));
}

export default ConfigCLI;