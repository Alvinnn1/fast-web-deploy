#!/usr/bin/env node

/**
 * Post-deployment testing script
 * Tests both frontend and backend deployments to ensure they're working correctly
 */

const axios = require('axios')
const { readFileSync } = require('fs')
const { join } = require('path')

const __dirname = __filename.replace('/test-deployment.js', '')

// Configuration
const config = {
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    timeout: 10000
  },
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:3000',
    timeout: 10000
  }
}

// Test results
const results = {
  frontend: [],
  backend: [],
  overall: { passed: 0, failed: 0, warnings: 0 }
}

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }[type] || '📋'
  
  console.log(`${prefix} [${timestamp}] ${message}`)
}

function recordResult(category, test, status, message, details = null) {
  const result = { test, status, message, details, timestamp: new Date().toISOString() }
  results[category].push(result)
  
  if (status === 'pass') {
    results.overall.passed++
    log(`${test}: ${message}`, 'success')
  } else if (status === 'warn') {
    results.overall.warnings++
    log(`${test}: ${message}`, 'warning')
  } else {
    results.overall.failed++
    log(`${test}: ${message}`, 'error')
  }
}

async function makeRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status code
      ...options
    })
    return response
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection refused - service may not be running')
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Request timeout - service may be slow or unresponsive')
    } else {
      throw error
    }
  }
}

// Frontend tests
async function testFrontend() {
  log('Testing frontend deployment...', 'info')
  
  // Test 1: Frontend accessibility
  try {
    const response = await makeRequest(config.frontend.url)
    if (response.status === 200) {
      recordResult('frontend', 'Frontend Accessibility', 'pass', 'Frontend is accessible')
    } else {
      recordResult('frontend', 'Frontend Accessibility', 'fail', `Frontend returned status ${response.status}`)
    }
  } catch (error) {
    recordResult('frontend', 'Frontend Accessibility', 'fail', `Frontend not accessible: ${error.message}`)
  }
  
  // Test 2: Static assets loading
  try {
    const response = await makeRequest(`${config.frontend.url}/health`)
    if (response.status === 200) {
      recordResult('frontend', 'Health Endpoint', 'pass', 'Frontend health endpoint is working')
    } else {
      recordResult('frontend', 'Health Endpoint', 'warn', 'Frontend health endpoint not found (may be normal)')
    }
  } catch (error) {
    recordResult('frontend', 'Health Endpoint', 'warn', 'Frontend health endpoint not accessible (may be normal)')
  }
  
  // Test 3: Check for common frontend files
  const commonPaths = ['/favicon.ico', '/manifest.json']
  for (const path of commonPaths) {
    try {
      const response = await makeRequest(`${config.frontend.url}${path}`)
      if (response.status === 200) {
        recordResult('frontend', `Static Asset ${path}`, 'pass', `${path} is accessible`)
      } else {
        recordResult('frontend', `Static Asset ${path}`, 'warn', `${path} not found (may be normal)`)
      }
    } catch (error) {
      recordResult('frontend', `Static Asset ${path}`, 'warn', `${path} not accessible (may be normal)`)
    }
  }
}

// Backend tests
async function testBackend() {
  log('Testing backend deployment...', 'info')
  
  // Test 1: Backend accessibility
  try {
    const response = await makeRequest(`${config.backend.url}/health`)
    if (response.status === 200) {
      const healthData = response.data
      recordResult('backend', 'Backend Health Check', 'pass', 'Backend health check passed', healthData)
      
      // Analyze health check details
      if (healthData.data && healthData.data.status) {
        const status = healthData.data.status
        if (status === 'healthy') {
          recordResult('backend', 'Backend Status', 'pass', 'All backend systems are healthy')
        } else if (status === 'degraded') {
          recordResult('backend', 'Backend Status', 'warn', 'Backend is running but some systems are degraded')
        } else {
          recordResult('backend', 'Backend Status', 'fail', 'Backend systems are unhealthy')
        }
        
        // Check individual components
        if (healthData.data.checks) {
          const checks = healthData.data.checks
          Object.entries(checks).forEach(([component, check]) => {
            if (check.status === 'pass') {
              recordResult('backend', `${component} Check`, 'pass', check.message)
            } else if (check.status === 'warn') {
              recordResult('backend', `${component} Check`, 'warn', check.message)
            } else {
              recordResult('backend', `${component} Check`, 'fail', check.message)
            }
          })
        }
      }
    } else if (response.status === 503) {
      recordResult('backend', 'Backend Health Check', 'fail', 'Backend is unhealthy (503 status)')
    } else {
      recordResult('backend', 'Backend Health Check', 'fail', `Backend health check failed with status ${response.status}`)
    }
  } catch (error) {
    recordResult('backend', 'Backend Health Check', 'fail', `Backend not accessible: ${error.message}`)
  }
  
  // Test 2: API endpoints
  const apiEndpoints = [
    { path: '/api/test', method: 'GET', expectedStatus: 200 },
    { path: '/health/simple', method: 'GET', expectedStatus: 200 }
  ]
  
  for (const endpoint of apiEndpoints) {
    try {
      const response = await makeRequest(`${config.backend.url}${endpoint.path}`, {
        method: endpoint.method
      })
      
      if (response.status === endpoint.expectedStatus) {
        recordResult('backend', `API ${endpoint.method} ${endpoint.path}`, 'pass', `API endpoint is working`)
      } else {
        recordResult('backend', `API ${endpoint.method} ${endpoint.path}`, 'fail', `Expected status ${endpoint.expectedStatus}, got ${response.status}`)
      }
    } catch (error) {
      recordResult('backend', `API ${endpoint.method} ${endpoint.path}`, 'fail', `API endpoint failed: ${error.message}`)
    }
  }
  
  // Test 3: CORS configuration (if frontend and backend are on different domains)
  if (config.frontend.url !== config.backend.url) {
    try {
      const response = await makeRequest(`${config.backend.url}/api/test`, {
        method: 'OPTIONS',
        headers: {
          'Origin': config.frontend.url,
          'Access-Control-Request-Method': 'GET'
        }
      })
      
      const corsHeaders = response.headers['access-control-allow-origin']
      if (corsHeaders) {
        recordResult('backend', 'CORS Configuration', 'pass', 'CORS headers are present')
      } else {
        recordResult('backend', 'CORS Configuration', 'warn', 'CORS headers not found - may cause frontend issues')
      }
    } catch (error) {
      recordResult('backend', 'CORS Configuration', 'warn', `CORS test failed: ${error.message}`)
    }
  }
}

// Integration tests
async function testIntegration() {
  log('Testing frontend-backend integration...', 'info')
  
  // Test if frontend can reach backend
  if (config.frontend.url !== config.backend.url) {
    try {
      // This would typically be done by loading the frontend and checking if it can make API calls
      // For now, we'll just verify that both services are running
      const frontendResponse = await makeRequest(config.frontend.url)
      const backendResponse = await makeRequest(`${config.backend.url}/health/simple`)
      
      if (frontendResponse.status === 200 && backendResponse.status === 200) {
        recordResult('backend', 'Frontend-Backend Integration', 'pass', 'Both frontend and backend are accessible')
      } else {
        recordResult('backend', 'Frontend-Backend Integration', 'fail', 'One or both services are not accessible')
      }
    } catch (error) {
      recordResult('backend', 'Frontend-Backend Integration', 'fail', `Integration test failed: ${error.message}`)
    }
  }
}

// Performance tests
async function testPerformance() {
  log('Testing performance...', 'info')
  
  // Test backend response time
  const startTime = Date.now()
  try {
    await makeRequest(`${config.backend.url}/health/simple`)
    const responseTime = Date.now() - startTime
    
    if (responseTime < 1000) {
      recordResult('backend', 'Response Time', 'pass', `Backend responds in ${responseTime}ms`)
    } else if (responseTime < 3000) {
      recordResult('backend', 'Response Time', 'warn', `Backend responds in ${responseTime}ms (slow)`)
    } else {
      recordResult('backend', 'Response Time', 'fail', `Backend responds in ${responseTime}ms (too slow)`)
    }
  } catch (error) {
    recordResult('backend', 'Response Time', 'fail', `Response time test failed: ${error.message}`)
  }
}

// Generate report
function generateReport() {
  log('Generating deployment test report...', 'info')
  
  const report = {
    timestamp: new Date().toISOString(),
    config,
    results,
    summary: {
      total_tests: results.overall.passed + results.overall.failed + results.overall.warnings,
      passed: results.overall.passed,
      failed: results.overall.failed,
      warnings: results.overall.warnings,
      success_rate: Math.round((results.overall.passed / (results.overall.passed + results.overall.failed)) * 100) || 0
    }
  }
  
  // Write report to file
  try {
    const reportPath = join(__dirname, '..', 'deployment-test-report.json')
    const fs = require('fs/promises')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    log(`Report saved to: ${reportPath}`, 'success')
  } catch (error) {
    log(`Failed to save report: ${error.message}`, 'error')
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('DEPLOYMENT TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total Tests: ${report.summary.total_tests}`)
  console.log(`✅ Passed: ${report.summary.passed}`)
  console.log(`❌ Failed: ${report.summary.failed}`)
  console.log(`⚠️  Warnings: ${report.summary.warnings}`)
  console.log(`Success Rate: ${report.summary.success_rate}%`)
  console.log('='.repeat(60))
  
  // Exit with appropriate code
  if (results.overall.failed > 0) {
    process.exit(1)
  } else if (results.overall.warnings > 0) {
    log('Deployment tests completed with warnings', 'warning')
    process.exit(0)
  } else {
    log('All deployment tests passed!', 'success')
    process.exit(0)
  }
}

// Main execution
async function main() {
  log('Starting deployment tests...', 'info')
  log(`Frontend URL: ${config.frontend.url}`, 'info')
  log(`Backend URL: ${config.backend.url}`, 'info')
  
  try {
    await testFrontend()
    await testBackend()
    await testIntegration()
    await testPerformance()
  } catch (error) {
    log(`Test execution failed: ${error.message}`, 'error')
    process.exit(1)
  }
  
  generateReport()
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Deployment Testing Script

Usage: node test-deployment.js [options]

Environment Variables:
  FRONTEND_URL    Frontend URL to test (default: http://localhost:5173)
  BACKEND_URL     Backend URL to test (default: http://localhost:3000)

Options:
  --help, -h      Show this help message

Examples:
  # Test local development
  node test-deployment.js

  # Test production deployment
  FRONTEND_URL=https://myapp.pages.dev BACKEND_URL=https://api.myapp.com node test-deployment.js
  `)
  process.exit(0)
}

// Run the tests
main().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error')
  process.exit(1)
})