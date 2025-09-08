#!/usr/bin/env node

/**
 * Fix Worker Exports Script
 * 
 * This script adds the missing Env export to the compiled worker.js file
 * to fix the Wrangler "named entrypoint" error.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const workerPath = join(__dirname, '..', 'dist-workers', 'worker.js')

try {
  // Read the compiled worker file
  let content = readFileSync(workerPath, 'utf8')
  
  // Check if Env export already exists
  if (content.includes('export { Env }')) {
    console.log('✓ Env export already exists in worker.js')
    process.exit(0)
  }
  
  // Add Env export at the end of the file
  content += '\n// Export Env interface for Wrangler\nexport { Env };\n'
  
  // Write the modified content back
  writeFileSync(workerPath, content, 'utf8')
  
  console.log('✓ Added Env export to worker.js')
} catch (error) {
  console.error('✗ Error fixing worker exports:', error.message)
  process.exit(1)
}
