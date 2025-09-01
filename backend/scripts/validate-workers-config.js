#!/usr/bin/env node

/**
 * Cloudflare Workers Configuration Validator
 * 
 * This script validates the Workers configuration and checks for common issues.
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const backendDir = join(__dirname, '..')

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(level, message) {
  const color = colors[level] || colors.reset
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`)
}

function validateFile(filePath, description) {
  if (existsSync(filePath)) {
    log('green', `✓ ${description} exists: ${filePath}`)
    return true
  } else {
    log('red', `✗ ${description} missing: ${filePath}`)
    return false
  }
}

function validateWranglerToml() {
  const wranglerPath = join(backendDir, 'wrangler.toml')
  
  if (!validateFile(wranglerPath, 'Wrangler configuration')) {
    return false
  }

  try {
    const content = readFileSync(wranglerPath, 'utf8')
    
    // Check for required fields
    const requiredFields = [
      'name',
      'main',
      'compatibility_date'
    ]

    const missingFields = requiredFields.filter(field => !content.includes(field))
    
    if (missingFields.length > 0) {
      log('red', `Missing required fields in wrangler.toml: ${missingFields.join(', ')}`)
      return false
    }

    // Check for placeholder values
    const placeholders = [
      'your_cache_kv_namespace_id',
      'your_sessions_kv_namespace_id',
      'your_d1_database_id'
    ]

    const foundPlaceholders = placeholders.filter(placeholder => content.includes(placeholder))
    
    if (foundPlaceholders.length > 0) {
      log('yellow', `Found placeholder values in wrangler.toml: ${foundPlaceholders.join(', ')}`)
      log('yellow', 'Run the setup script to replace these with actual resource IDs')
    }

    log('green', '✓ Wrangler configuration is valid')
    return true
  } catch (error) {
    log('red', `Error reading wrangler.toml: ${error.message}`)
    return false
  }
}

function validatePackageJson() {
  const packagePath = join(backendDir, 'package.json')
  
  if (!validateFile(packagePath, 'Package configuration')) {
    return false
  }

  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
    
    // Check for Wrangler dependency
    const hasWrangler = packageJson.devDependencies?.wrangler || packageJson.dependencies?.wrangler
    if (!hasWrangler) {
      log('red', '✗ Wrangler dependency not found in package.json')
      return false
    }

    // Check for Workers types
    const hasWorkersTypes = packageJson.devDependencies?.['@cloudflare/workers-types']
    if (!hasWorkersTypes) {
      log('yellow', 'Consider adding @cloudflare/workers-types for better TypeScript support')
    }

    // Check for Wrangler scripts
    const wranglerScripts = Object.keys(packageJson.scripts || {}).filter(script => 
      script.includes('wrangler')
    )

    if (wranglerScripts.length === 0) {
      log('yellow', 'No Wrangler scripts found in package.json')
    } else {
      log('green', `✓ Found Wrangler scripts: ${wranglerScripts.join(', ')}`)
    }

    log('green', '✓ Package configuration is valid')
    return true
  } catch (error) {
    log('red', `Error reading package.json: ${error.message}`)
    return false
  }
}

function validateWorkerEntry() {
  const workerPath = join(backendDir, 'worker.ts')
  
  if (!validateFile(workerPath, 'Worker entry point')) {
    return false
  }

  try {
    const content = readFileSync(workerPath, 'utf8')
    
    // Check for required exports
    if (!content.includes('export default')) {
      log('red', '✗ Worker entry point must have a default export')
      return false
    }

    // Check for fetch handler
    if (!content.includes('fetch(')) {
      log('red', '✗ Worker entry point must have a fetch handler')
      return false
    }

    log('green', '✓ Worker entry point is valid')
    return true
  } catch (error) {
    log('red', `Error reading worker.ts: ${error.message}`)
    return false
  }
}

function validateTypeScriptConfig() {
  const tsconfigPath = join(backendDir, 'tsconfig.workers.json')
  
  if (!validateFile(tsconfigPath, 'Workers TypeScript configuration')) {
    return false
  }

  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'))
    
    // Check for Workers-specific configuration
    const hasWebWorkerLib = tsconfig.compilerOptions?.lib?.includes('WebWorker')
    if (!hasWebWorkerLib) {
      log('yellow', 'Consider adding "WebWorker" to lib array in tsconfig.workers.json')
    }

    const hasWorkersTypes = tsconfig.compilerOptions?.types?.includes('@cloudflare/workers-types')
    if (!hasWorkersTypes) {
      log('yellow', 'Consider adding "@cloudflare/workers-types" to types array')
    }

    log('green', '✓ TypeScript configuration is valid')
    return true
  } catch (error) {
    log('red', `Error reading tsconfig.workers.json: ${error.message}`)
    return false
  }
}

function main() {
  console.log('🔍 Validating Cloudflare Workers configuration...\n')

  const validations = [
    validateWranglerToml,
    validatePackageJson,
    validateWorkerEntry,
    validateTypeScriptConfig
  ]

  const results = validations.map(validation => validation())
  const allValid = results.every(result => result)

  console.log('\n' + '='.repeat(50))
  
  if (allValid) {
    log('green', '🎉 All validations passed! Your Workers configuration looks good.')
    console.log('\nNext steps:')
    console.log('1. Run ./scripts/setup-workers.sh to create Cloudflare resources')
    console.log('2. Set required secrets with wrangler secret put')
    console.log('3. Test locally with npm run wrangler:dev')
    console.log('4. Deploy with npm run wrangler:deploy')
  } else {
    log('red', '❌ Some validations failed. Please fix the issues above.')
    process.exit(1)
  }
}

main()