/**
 * Manual test for DELETE request functionality
 * This test verifies that DELETE requests work without Content-Type header conflicts
 * 
 * To run this test:
 * 1. Start the backend server
 * 2. Run this file with: npx tsx delete-request-manual-test.ts
 * 3. Check the console output for test results
 */

import { ApiClient, api } from '../api'

// Mock console for testing
const originalConsole = console
const testResults: string[] = []

const mockConsole = {
  log: (...args: any[]) => {
    testResults.push(`LOG: ${args.join(' ')}`)
    originalConsole.log(...args)
  },
  error: (...args: any[]) => {
    testResults.push(`ERROR: ${args.join(' ')}`)
    originalConsole.error(...args)
  }
}

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  testDomainId: 'test-domain-123',
  testRecordId: 'test-record-456'
}

/**
 * Test 1: Verify DELETE request headers
 */
async function testDeleteRequestHeaders() {
  console.log('🧪 Test 1: DELETE request headers')

  try {
    // Create API client with notifications disabled for testing
    const testClient = new ApiClient(TEST_CONFIG.baseURL, false)

    // Mock fetch to capture the request
    const originalFetch = global.fetch
    let capturedRequest: any = null

    global.fetch = async (url: string, options: RequestInit = {}) => {
      capturedRequest = { url, options }
      // Return a mock successful response
      return {
        ok: true,
        json: async () => ({ success: true, message: 'Test successful' })
      } as Response
    }

    // Make DELETE request
    await testClient.delete('/api/domains/test/dns-records/123')

    // Verify headers
    const headers = capturedRequest?.options?.headers || {}
    const hasContentType = 'Content-Type' in headers

    if (!hasContentType) {
      console.log('✅ DELETE request correctly omits Content-Type header')
      return true
    } else {
      console.error('❌ DELETE request incorrectly includes Content-Type header:', headers)
      return false
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error)
    return false
  }
}

/**
 * Test 2: Verify POST request headers (for comparison)
 */
async function testPostRequestHeaders() {
  console.log('🧪 Test 2: POST request headers (should include Content-Type)')

  try {
    const testClient = new ApiClient(TEST_CONFIG.baseURL, false)

    // Mock fetch to capture the request
    let capturedRequest: any = null

    global.fetch = async (url: string, options: RequestInit = {}) => {
      capturedRequest = { url, options }
      return {
        ok: true,
        json: async () => ({ success: true, data: { id: 'new-record' } })
      } as Response
    }

    // Make POST request with data
    await testClient.post('/api/domains/test/dns-records', {
      type: 'A',
      name: 'test',
      content: '1.2.3.4'
    })

    // Verify headers
    const headers = capturedRequest?.options?.headers || {}
    const hasContentType = headers['Content-Type'] === 'application/json'

    if (hasContentType) {
      console.log('✅ POST request correctly includes Content-Type header')
      return true
    } else {
      console.error('❌ POST request missing Content-Type header:', headers)
      return false
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error)
    return false
  }
}

/**
 * Test 3: Test deleteDnsRecord API method specifically
 */
async function testDeleteDnsRecordMethod() {
  console.log('🧪 Test 3: deleteDnsRecord API method')

  try {
    // Mock fetch to capture the request
    let capturedRequest: any = null

    global.fetch = async (url: string, options: RequestInit = {}) => {
      capturedRequest = { url, options }
      return {
        ok: true,
        json: async () => ({ success: true, message: 'DNS record deleted successfully' })
      } as Response
    }

    // Use the actual API method
    await api.domains.deleteDnsRecord(TEST_CONFIG.testDomainId, TEST_CONFIG.testRecordId)

    // Verify the request was made correctly
    const expectedUrl = `${TEST_CONFIG.baseURL}/api/domains/${TEST_CONFIG.testDomainId}/dns-records/${TEST_CONFIG.testRecordId}`
    const actualUrl = capturedRequest?.url
    const method = capturedRequest?.options?.method
    const headers = capturedRequest?.options?.headers || {}
    const hasContentType = 'Content-Type' in headers

    let success = true

    if (actualUrl !== expectedUrl) {
      console.error('❌ Incorrect URL:', actualUrl, 'expected:', expectedUrl)
      success = false
    }

    if (method !== 'DELETE') {
      console.error('❌ Incorrect method:', method, 'expected: DELETE')
      success = false
    }

    if (hasContentType) {
      console.error('❌ DELETE request includes Content-Type header:', headers)
      success = false
    }

    if (success) {
      console.log('✅ deleteDnsRecord method works correctly without Content-Type header')
      return true
    }

    return false
  } catch (error) {
    console.error('❌ Test failed with error:', error)
    return false
  }
}

/**
 * Test 4: Test error handling for DELETE requests
 */
async function testDeleteErrorHandling() {
  console.log('🧪 Test 4: DELETE request error handling')

  try {
    const testClient = new ApiClient(TEST_CONFIG.baseURL, false)

    // Mock fetch to return an error response
    global.fetch = async () => {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          success: false,
          message: 'DNS record not found'
        })
      } as Response
    }

    // Make DELETE request that should fail
    try {
      await testClient.delete('/api/domains/invalid/dns-records/invalid')
      console.error('❌ Expected error but request succeeded')
      return false
    } catch (error: any) {
      if (error.success === false && error.message) {
        console.log('✅ DELETE request error handling works correctly')
        return true
      } else {
        console.error('❌ Unexpected error format:', error)
        return false
      }
    }
  } catch (error) {
    console.error('❌ Test setup failed:', error)
    return false
  }
}

/**
 * Test 5: Integration test with UI component behavior simulation
 */
async function testUIIntegration() {
  console.log('🧪 Test 5: UI integration simulation')

  try {
    // Simulate the UI flow for deleting a DNS record
    const mockDomainId = 'domain-123'
    const mockRecordId = 'record-456'

    // Mock fetch to track requests
    const requests: any[] = []

    global.fetch = async (url: string, options: RequestInit = {}) => {
      requests.push({ url, options })
      return {
        ok: true,
        json: async () => ({ success: true, message: 'Operation successful' })
      } as Response
    }

    // Simulate the exact call made by the UI
    const response = await api.domains.deleteDnsRecord(mockDomainId, mockRecordId)

    // Verify the request
    if (requests.length === 1) {
      const request = requests[0]
      const headers = request.options?.headers || {}
      const hasContentType = 'Content-Type' in headers

      if (!hasContentType && request.options?.method === 'DELETE') {
        console.log('✅ UI integration test passed - DELETE request without Content-Type')
        return true
      } else {
        console.error('❌ UI integration test failed - incorrect headers or method')
        return false
      }
    } else {
      console.error('❌ Expected 1 request, got:', requests.length)
      return false
    }
  } catch (error) {
    console.error('❌ UI integration test failed:', error)
    return false
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting DELETE request functionality tests...\n')

  const tests = [
    { name: 'DELETE request headers', fn: testDeleteRequestHeaders },
    { name: 'POST request headers', fn: testPostRequestHeaders },
    { name: 'deleteDnsRecord method', fn: testDeleteDnsRecordMethod },
    { name: 'DELETE error handling', fn: testDeleteErrorHandling },
    { name: 'UI integration', fn: testUIIntegration }
  ]

  const results = []

  for (const test of tests) {
    const result = await test.fn()
    results.push({ name: test.name, passed: result })
    console.log('') // Add spacing between tests
  }

  // Summary
  console.log('📊 Test Results Summary:')
  console.log('========================')

  const passed = results.filter(r => r.passed).length
  const total = results.length

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`${status} ${result.name}`)
  })

  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`)

  if (passed === total) {
    console.log('🎉 All tests passed! DELETE request functionality is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.')
  }

  return passed === total
}

// Export for potential use in other test files
export {
  testDeleteRequestHeaders,
  testPostRequestHeaders,
  testDeleteDnsRecordMethod,
  testDeleteErrorHandling,
  testUIIntegration,
  runAllTests
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1)
  })
}