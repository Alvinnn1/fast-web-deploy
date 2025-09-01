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
    it('should make successful GET request', async () => {
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
        headers: {
          'Content-Type': 'application/json'
        }
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
    it('should make successful POST request', async () => {
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
        body: JSON.stringify(requestData)
      })
      expect(result).toEqual(mockResponse)
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
        headers: {
          'Content-Type': 'application/json'
        }
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
})