/**
 * Simple test runner for DELETE request functionality
 * This verifies that the API client correctly handles DELETE requests without Content-Type headers
 */

// Simple test framework
class SimpleTest {
  constructor() {
    this.tests = []
    this.results = []
  }

  test(name, fn) {
    this.tests.push({ name, fn })
  }

  async run() {
    console.log('🚀 Running DELETE request functionality tests...\n')
    
    for (const test of this.tests) {
      try {
        console.log(`🧪 ${test.name}`)
        const result = await test.fn()
        if (result) {
          console.log(`✅ PASS: ${test.name}`)
          this.results.push({ name: test.name, passed: true })
        } else {
          console.log(`❌ FAIL: ${test.name}`)
          this.results.push({ name: test.name, passed: false })
        }
      } catch (error) {
        console.log(`❌ ERROR: ${test.name} - ${error.message}`)
        this.results.push({ name: test.name, passed: false, error })
      }
      console.log('')
    }
    
    this.printSummary()
  }

  printSummary() {
    console.log('📊 Test Results Summary:')
    console.log('========================')
    
    const passed = this.results.filter(r => r.passed).length
    const total = this.results.length
    
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${result.name}`)
    })
    
    console.log(`\n🎯 Overall: ${passed}/${total} tests passed`)
    
    if (passed === total) {
      console.log('🎉 All tests passed! DELETE request functionality is working correctly.')
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.')
    }
  }
}

// Mock fetch for testing
let originalFetch
let mockFetch

function setupMockFetch() {
  originalFetch = global.fetch
  mockFetch = {
    requests: [],
    mockResponse: null,
    
    setup(response) {
      this.mockResponse = response
      this.requests = []
      
      global.fetch = async (url, options = {}) => {
        this.requests.push({ url, options })
        return {
          ok: this.mockResponse.ok !== false,
          status: this.mockResponse.status || 200,
          statusText: this.mockResponse.statusText || 'OK',
          json: async () => this.mockResponse.data || { success: true }
        }
      }
    },
    
    restore() {
      if (originalFetch) {
        global.fetch = originalFetch
      }
    },
    
    getLastRequest() {
      return this.requests[this.requests.length - 1]
    }
  }
}

// Simple API client implementation for testing
class TestApiClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    // Conditionally set Content-Type header only when request has a body and is not a GET request
    const headers = {}
    if (options.body && options.method !== 'GET') {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url, {
      headers: {
        ...headers,
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()
    
    if (!response.ok) {
      const error = new Error(data.message || `HTTP ${response.status}`)
      error.success = false
      error.message = data.message || `HTTP ${response.status}`
      throw error
    }

    return data
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }
}

// Test suite
const testSuite = new SimpleTest()

testSuite.test('DELETE request should not include Content-Type header', async () => {
  setupMockFetch()
  mockFetch.setup({ data: { success: true, message: 'Deleted' } })
  
  const client = new TestApiClient()
  await client.delete('/api/domains/123/dns-records/456')
  
  const request = mockFetch.getLastRequest()
  const headers = request.options.headers || {}
  
  mockFetch.restore()
  
  return !('Content-Type' in headers)
})

testSuite.test('POST request should include Content-Type header', async () => {
  setupMockFetch()
  mockFetch.setup({ data: { success: true, data: { id: 'new' } } })
  
  const client = new TestApiClient()
  await client.post('/api/domains/123/dns-records', { type: 'A', name: 'test' })
  
  const request = mockFetch.getLastRequest()
  const headers = request.options.headers || {}
  
  mockFetch.restore()
  
  return headers['Content-Type'] === 'application/json'
})

testSuite.test('PUT request should include Content-Type header', async () => {
  setupMockFetch()
  mockFetch.setup({ data: { success: true, data: { id: 'updated' } } })
  
  const client = new TestApiClient()
  await client.put('/api/domains/123/dns-records/456', { content: '1.2.3.4' })
  
  const request = mockFetch.getLastRequest()
  const headers = request.options.headers || {}
  
  mockFetch.restore()
  
  return headers['Content-Type'] === 'application/json'
})

testSuite.test('GET request should not include Content-Type header', async () => {
  setupMockFetch()
  mockFetch.setup({ data: { success: true, data: [] } })
  
  const client = new TestApiClient()
  await client.get('/api/domains')
  
  const request = mockFetch.getLastRequest()
  const headers = request.options.headers || {}
  
  mockFetch.restore()
  
  return !('Content-Type' in headers)
})

testSuite.test('DELETE request error handling works correctly', async () => {
  setupMockFetch()
  mockFetch.setup({ 
    ok: false, 
    status: 404, 
    data: { success: false, message: 'Not found' } 
  })
  
  const client = new TestApiClient()
  
  try {
    await client.delete('/api/domains/invalid/dns-records/invalid')
    return false // Should have thrown an error
  } catch (error) {
    mockFetch.restore()
    return error.success === false && error.message === 'Not found'
  }
})

testSuite.test('Custom headers are preserved with conditional Content-Type', async () => {
  setupMockFetch()
  mockFetch.setup({ data: { success: true } })
  
  const client = new TestApiClient()
  await client.request('/api/test', {
    method: 'POST',
    body: JSON.stringify({ test: 'data' }),
    headers: {
      'Authorization': 'Bearer token123',
      'X-Custom-Header': 'custom-value'
    }
  })
  
  const request = mockFetch.getLastRequest()
  const headers = request.options.headers || {}
  
  mockFetch.restore()
  
  return (
    headers['Content-Type'] === 'application/json' &&
    headers['Authorization'] === 'Bearer token123' &&
    headers['X-Custom-Header'] === 'custom-value'
  )
})

// Run the tests
testSuite.run().then(() => {
  console.log('\n✨ DELETE request functionality testing complete!')
})