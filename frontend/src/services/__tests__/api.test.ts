import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClient, api } from '../api'
import { LoadingManager } from '../../utils/loading'

// Mock fetch
global.fetch = vi.fn()

describe('ApiClient', () => {
  let apiClient: ApiClient
  let loadingManager: LoadingManager

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:3000')
    loadingManager = LoadingManager.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    loadingManager.reset()
  })

  describe('GET requests', () => {
    it('should make successful GET request without Content-Type header', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: '1', name: 'test.com' }]
      }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      const result = await apiClient.get('/api/domains')

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/domains', {
        method: 'GET',
        headers: {},
        signal: expect.any(AbortSignal)
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Domain not found'
      }

        ; (fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: () => Promise.resolve(mockErrorResponse)
        })

      await expect(apiClient.get('/api/domains/invalid')).rejects.toMatchObject({
        success: false,
        message: 'Domain not found'
      })
    })
  })

  describe('POST requests', () => {
    it('should make successful POST request with Content-Type header when body is present', async () => {
      const requestData = { name: 'example.com' }
      const mockResponse = {
        success: true,
        data: { id: '1', name: 'example.com' }
      }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      const result = await apiClient.post('/api/domains', requestData)

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: expect.any(AbortSignal)
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('DELETE requests', () => {
    it('should make successful DELETE request without Content-Type header', async () => {
      const mockResponse = {
        success: true,
        message: 'DNS record deleted successfully'
      }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      const result = await apiClient.delete('/api/domains/1/dns-records/123')

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/domains/1/dns-records/123', {
        method: 'DELETE',
        headers: {},
        signal: expect.any(AbortSignal)
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('PUT requests', () => {
    it('should make successful PUT request with Content-Type header when body is present', async () => {
      const requestData = { name: 'updated.com' }
      const mockResponse = {
        success: true,
        data: { id: '1', name: 'updated.com' }
      }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      const result = await apiClient.put('/api/domains/1', requestData)

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/domains/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: expect.any(AbortSignal)
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Header configuration', () => {
    it('should not set Content-Type header for requests without body', async () => {
      const mockResponse = { success: true }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      await apiClient.request('/api/test', { method: 'DELETE' })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        method: 'DELETE',
        headers: {},
        signal: expect.any(AbortSignal)
      })
    })

    it('should set Content-Type header for requests with body (non-GET)', async () => {
      const mockResponse = { success: true }
      const requestData = { test: 'data' }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      await apiClient.request('/api/test', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json'
        },
        signal: expect.any(AbortSignal)
      })
    })

    it('should not set Content-Type header for GET requests even with body', async () => {
      const mockResponse = { success: true }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      await apiClient.request('/api/test', {
        method: 'GET',
        body: 'some-body'
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        method: 'GET',
        body: 'some-body',
        headers: {},
        signal: expect.any(AbortSignal)
      })
    })

    it('should preserve custom headers while conditionally setting Content-Type', async () => {
      const mockResponse = { success: true }
      const requestData = { test: 'data' }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      await apiClient.request('/api/test', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        }
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        },
        signal: expect.any(AbortSignal)
      })
    })
  })

  describe('File upload', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['test content'], 'test.zip', { type: 'application/zip' })
      const mockResponse = {
        success: true,
        data: { deploymentId: '123' }
      }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      const formData = new FormData()
      formData.append('zip', mockFile)

      const result = await apiClient.uploadFile('/api/pages/1/deploy', formData)

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/pages/1/deploy', {
        method: 'POST',
        body: formData
      })
      expect(result).toEqual(mockResponse)
    })
  })
})

describe('Deployment status polling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get deployment status by ID successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        status: 'success',
        progress: 100,
        url: 'https://test.pages.dev'
      }
    }

      ; (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

    const result = await api.pages.getDeploymentStatusById('test-project', 'deployment-123')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/pages/test-project/deployment-status?deploymentId=deployment-123',
      {
        method: 'GET',
        headers: {},
        signal: expect.any(AbortSignal)
      }
    )
    expect(result).toEqual(mockResponse)
  })

  it('should handle polling errors gracefully', async () => {
    const mockErrorResponse = {
      success: false,
      message: 'Deployment not found'
    }

      ; (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve(mockErrorResponse)
      })

    const result = await api.pages.pollDeploymentStatus('test-project', 'invalid-deployment')

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('POLLING_FAILED')
    expect(result.message).toContain('Deployment not found')
  })

  it('should handle network errors in polling gracefully', async () => {
    ; (fetch as any).mockRejectedValueOnce(new Error('Network error'))

    const result = await api.pages.pollDeploymentStatus('test-project', 'deployment-123')

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('POLLING_FAILED')
    expect(result.message).toContain('Failed to poll deployment status')
  })
})

describe('API convenience methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide domain API methods', () => {
    expect(typeof api.domains.list).toBe('function')
    expect(typeof api.domains.create).toBe('function')
    expect(typeof api.domains.getDetail).toBe('function')
    expect(typeof api.domains.getDnsRecords).toBe('function')
    expect(typeof api.domains.updateDnsRecord).toBe('function')
    expect(typeof api.domains.createDnsRecord).toBe('function')
    expect(typeof api.domains.deleteDnsRecord).toBe('function')
    expect(typeof api.domains.requestSSL).toBe('function')
  })

  it('should provide page API methods', () => {
    expect(typeof api.pages.list).toBe('function')
    expect(typeof api.pages.create).toBe('function')
    expect(typeof api.pages.deploy).toBe('function')
    expect(typeof api.pages.getDeploymentStatus).toBe('function')
    expect(typeof api.pages.getDeploymentStatusById).toBe('function')
    expect(typeof api.pages.pollDeploymentStatus).toBe('function')
  })

  describe('DNS record operations', () => {
    it('should delete DNS record without Content-Type header', async () => {
      const mockResponse = { success: true, message: 'DNS record deleted' }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      const result = await api.domains.deleteDnsRecord('domain123', 'record456')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/domains/domain123/dns-records/record456',
        {
          method: 'DELETE',
          headers: {},
          signal: expect.any(AbortSignal)
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should create DNS record with Content-Type header', async () => {
      const requestData = { type: 'A', name: 'test', content: '1.2.3.4' }
      const mockResponse = { success: true, data: { id: 'new-record', ...requestData } }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      const result = await api.domains.createDnsRecord('domain123', requestData)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/domains/domain123/dns-records',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: expect.any(AbortSignal)
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should update DNS record with Content-Type header', async () => {
      const requestData = { content: '5.6.7.8' }
      const mockResponse = { success: true, data: { id: 'record456', ...requestData } }

        ; (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

      const result = await api.domains.updateDnsRecord('domain123', 'record456', requestData)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/domains/domain123/dns-records/record456',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: expect.any(AbortSignal)
        }
      )
      expect(result).toEqual(mockResponse)
    })
  })
})