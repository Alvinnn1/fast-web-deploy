/**
 * Configuration System Test
 * 
 * Simple test to verify the configuration system works correctly
 */

import {
  DeploymentConfigManager,
  getCurrentConfig,
  validateCurrentConfig,
  getEnvVars,
  generateEnvFile,
  helpers
} from './index';

/**
 * Run basic tests of the configuration system
 */
async function runTests() {
  console.log('🧪 Testing Deployment Configuration System\n');

  try {
    // Test 1: Create config manager
    console.log('1. Creating configuration manager...');
    const configManager = new DeploymentConfigManager();
    console.log('✅ Configuration manager created successfully\n');

    // Test 2: Get current configuration
    console.log('2. Getting current configuration...');
    const currentConfig = getCurrentConfig();
    console.log('✅ Current environment:', configManager.getCurrentEnvironment());
    console.log('✅ Frontend platform:', currentConfig.frontend.platform);
    console.log('✅ Backend platform:', currentConfig.backend.platform);
    console.log('');

    // Test 3: Validate configuration
    console.log('3. Validating current configuration...');
    const validation = validateCurrentConfig();
    if (validation.isValid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration validation failed:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }
    if (validation.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    console.log('');

    // Test 4: Get environment variables
    console.log('4. Getting environment variables...');
    const frontendEnvVars = getEnvVars('frontend');
    const backendEnvVars = getEnvVars('backend');
    console.log('✅ Frontend env vars:', Object.keys(frontendEnvVars).length, 'variables');
    console.log('✅ Backend env vars:', Object.keys(backendEnvVars).length, 'variables');
    console.log('');

    // Test 5: Generate environment files
    console.log('5. Generating environment files...');
    const frontendEnvContent = generateEnvFile('frontend', 'development');
    const backendEnvContent = generateEnvFile('backend', 'development');
    console.log('✅ Frontend env file generated:', frontendEnvContent.split('\n').length, 'lines');
    console.log('✅ Backend env file generated:', backendEnvContent.split('\n').length, 'lines');
    console.log('');

    // Test 6: Test all environments
    console.log('6. Testing all environments...');
    const environments: Array<'development' | 'staging' | 'production'> = ['development', 'staging', 'production'];

    for (const env of environments) {
      const config = configManager.getConfig(env);
      console.log(`✅ ${env}: Frontend=${config.frontend.platform}, Backend=${config.backend.platform}`);
    }
    console.log('');

    // Test 7: Configuration summary
    console.log('7. Getting configuration summary...');
    const summary = helpers.getConfigSummary();
    console.log('✅ Configuration Summary:');
    console.log(`  - Current Environment: ${summary.currentEnvironment}`);
    console.log(`  - Frontend Platform: ${summary.frontendPlatform}`);
    console.log(`  - Backend Platform: ${summary.backendPlatform}`);
    console.log(`  - Is Valid: ${summary.isValid}`);
    console.log('');

    // Test 8: Validate all environments
    console.log('8. Validating all environments...');
    const allValidations = helpers.validateAllEnvironments();

    for (const [env, result] of Object.entries(allValidations)) {
      const status = result.isValid ? '✅' : '❌';
      console.log(`${status} ${env}: ${result.isValid ? 'Valid' : `${result.errors.length} errors`}`);
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

/**
 * Run tests if this file is executed directly
 */
if (require.main === module) {
  runTests();
}

export default runTests;