#!/usr/bin/env node

/**
 * Security Configuration Test Script
 * 
 * This script validates the security configuration without running the full application.
 */

import { securityConfig, validateSecurityConfig } from '../src/config/security.js'

console.log('🔒 Testing Security Configuration...\n')

// Test security configuration validation
console.log('1. Validating security configuration...')
const validation = validateSecurityConfig(securityConfig)

if (validation.valid) {
  console.log('✅ Security configuration is valid')
} else {
  console.log('❌ Security configuration has errors:')
  validation.errors.forEach(error => console.log(`   - ${error}`))
  process.exit(1)
}

// Test CORS origins
console.log('\n2. Testing CORS origins...')
console.log('CORS Origins:', securityConfig.corsOrigins)

if (securityConfig.corsOrigins.length === 0) {
  console.log('❌ No CORS origins configured')
  process.exit(1)
}

// Validate CORS origins format
const invalidOrigins = securityConfig.corsOrigins.filter(origin => {
  try {
    new URL(origin)
    return false
  } catch {
    return true
  }
})

if (invalidOrigins.length > 0) {
  console.log('❌ Invalid CORS origins found:', invalidOrigins)
  process.exit(1)
}

console.log('✅ CORS origins are valid')

// Test rate limiting configuration
console.log('\n3. Testing rate limiting configuration...')
console.log(`Rate Limit: ${securityConfig.rateLimitMax} requests per ${securityConfig.rateLimitWindow}ms`)

if (securityConfig.rateLimitMax <= 0) {
  console.log('❌ Invalid rate limit max value')
  process.exit(1)
}

if (securityConfig.rateLimitWindow <= 0) {
  console.log('❌ Invalid rate limit window value')
  process.exit(1)
}

console.log('✅ Rate limiting configuration is valid')

// Test CSP configuration
console.log('\n4. Testing CSP configuration...')
console.log('CSP Enabled:', securityConfig.cspEnabled)

if (securityConfig.cspEnabled) {
  const requiredDirectives = ['default-src', 'script-src', 'style-src']
  const missingDirectives = requiredDirectives.filter(
    directive => !securityConfig.cspDirectives[directive]
  )

  if (missingDirectives.length > 0) {
    console.log('❌ Missing required CSP directives:', missingDirectives)
    process.exit(1)
  }

  console.log('✅ CSP configuration is valid')
} else {
  console.log('ℹ️  CSP is disabled (likely development mode)')
}

// Test security headers configuration
console.log('\n5. Testing security headers configuration...')
console.log('Security Headers Enabled:', securityConfig.securityHeadersEnabled)
console.log('HSTS Enabled:', securityConfig.hstsEnabled)

if (securityConfig.hstsEnabled && securityConfig.hstsMaxAge <= 0) {
  console.log('❌ Invalid HSTS max age value')
  process.exit(1)
}

console.log('✅ Security headers configuration is valid')

// Test suspicious request detection
console.log('\n6. Testing suspicious request detection...')
console.log('Block Suspicious Requests:', securityConfig.blockSuspiciousRequests)
console.log('Suspicious User Agents:', securityConfig.suspiciousUserAgents.length)
console.log('Suspicious Paths:', securityConfig.suspiciousPaths.length)
console.log('Suspicious Params:', securityConfig.suspiciousParams.length)

if (securityConfig.blockSuspiciousRequests) {
  if (securityConfig.suspiciousUserAgents.length === 0) {
    console.log('⚠️  No suspicious user agents configured')
  }
  
  if (securityConfig.suspiciousPaths.length === 0) {
    console.log('⚠️  No suspicious paths configured')
  }
  
  if (securityConfig.suspiciousParams.length === 0) {
    console.log('⚠️  No suspicious parameters configured')
  }
}

console.log('✅ Suspicious request detection configuration is valid')

// Test file upload configuration
console.log('\n7. Testing file upload configuration...')
console.log('Max File Size:', securityConfig.maxRequestSize, 'bytes')
console.log('Allowed Content Types:', securityConfig.allowedContentTypes)

if (securityConfig.maxRequestSize <= 0) {
  console.log('❌ Invalid max request size')
  process.exit(1)
}

if (securityConfig.allowedContentTypes.length === 0) {
  console.log('❌ No allowed content types configured')
  process.exit(1)
}

console.log('✅ File upload configuration is valid')

// Summary
console.log('\n🎉 All security configuration tests passed!')
console.log('\nSecurity Configuration Summary:')
console.log('================================')
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`CORS Origins: ${securityConfig.corsOrigins.length}`)
console.log(`Rate Limiting: ${securityConfig.rateLimitEnabled ? 'Enabled' : 'Disabled'}`)
console.log(`Security Headers: ${securityConfig.securityHeadersEnabled ? 'Enabled' : 'Disabled'}`)
console.log(`CSP: ${securityConfig.cspEnabled ? 'Enabled' : 'Disabled'}`)
console.log(`HSTS: ${securityConfig.hstsEnabled ? 'Enabled' : 'Disabled'}`)
console.log(`Suspicious Request Detection: ${securityConfig.blockSuspiciousRequests ? 'Enabled' : 'Disabled'}`)
console.log(`Max Request Size: ${(securityConfig.maxRequestSize / 1024 / 1024).toFixed(1)}MB`)

console.log('\n✅ Security configuration is ready for deployment!')