import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClient } from '../api'
import { useNotifications } from '../../utils/notifications'

// Mock dependencies
vi.mock('../../utils/notifications', () => ({
  useNotifications: vi.fn(() => ({
    error: vi.fn()
  }))
}))

// Mock fetch
global.fetch = vi.fn()

describe('API Enhanced Error Handling', () => {
  let apiClient: ApiClient
  const mockNotifications = {
    error: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
      ; (useNotifications as any).mockReturnValue(mockNotifications)
    apiClient = new ApiClient('http://localhost:3000', false) // Disable notifications for testing
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle network errors correctly', async () => {
    ; (fetch as any).mockRejectedValue(new TypeError('Failed to fetch'))

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('NETWORK_ERROR')
      expect(error.message).toBe('网络连接失败，请检查网络设置')
    }
  })

  it('should handle timeout errors correctly', async () => {
    ; (fetch as any).mockImplementation(() =>
      new Promise((resolve) => {
        // Simulate a request that takes longer than timeout
        setTimeout(() => resolve(new Response('OK')), 35000)
      })
    )

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('TIMEOUT_ERROR')
      expect(error.message).toBe('请求超时，请检查网络连接')
    }
  })

  it('should handle 400 validation errors correctly', async () => {
    ; (fetch as any).mockResolvedValue(new Response(
      JSON.stringify({ message: '输入数据无效' }),
      { status: 400, statusText: 'Bad Request' }
    ))

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('输入数据无效')
    }
  })

  it('should handle 401 authentication errors correctly', async () => {
    ; (fetch as any).mockResolvedValue(new Response(
      JSON.stringify({ message: 'API密钥无效' }),
      { status: 401, statusText: 'Unauthorized' }
    ))

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('AUTHENTICATION_ERROR')
      expect(error.message).toBe('API密钥无效')
    }
  })

  it('should handle 403 permission errors correctly', async () => {
    ; (fetch as any).mockResolvedValue(new Response(
      JSON.stringify({ message: '权限不足' }),
      { status: 403, statusText: 'Forbidden' }
    ))

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('PERMISSION_ERROR')
      expect(error.message).toBe('权限不足')
    }
  })

  it('should handle 404 not found errors correctly', async () => {
    ; (fetch as any).mockResolvedValue(new Response(
      JSON.stringify({ message: '域名不存在' }),
      { status: 404, statusText: 'Not Found' }
    ))

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('NOT_FOUND_ERROR')
      expect(error.message).toBe('域名不存在')
    }
  })

  it('should handle 409 conflict errors correctly', async () => {
    ; (fetch as any).mockResolvedValue(new Response(
      JSON.stringify({ message: 'DNS记录已存在' }),
      { status: 409, statusText: 'Conflict' }
    ))

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('CONFLICT_ERROR')
      expect(error.message).toBe('DNS记录已存在')
    }
  })

  it('should handle 429 rate limit errors correctly', async () => {
    ; (fetch as any).mockResolvedValue(new Response(
      JSON.stringify({ message: '请求过于频繁' }),
      { status: 429, statusText: 'Too Many Requests' }
    ))

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('RATE_LIMIT_ERROR')
      expect(error.message).toBe('请求过于频繁')
    }
  })

  it('should handle 500 server errors correctly', async () => {
    ; (fetch as any).mockResolvedValue(new Response(
      JSON.stringify({ message: '服务器内部错误' }),
      { status: 500, statusText: 'Internal Server Error' }
    ))

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('SERVER_ERROR')
      expect(error.message).toBe('服务器内部错误')
    }
  })

  it('should handle non-JSON responses gracefully', async () => {
    ; (fetch as any).mockResolvedValue(new Response(
      'Internal Server Error',
      { status: 500, statusText: 'Internal Server Error' }
    ))

    try {
      await apiClient.get('/test')
    } catch (error: any) {
      expect(error.error.code).toBe('SERVER_ERROR')
      expect(error.message).toBe('服务器错误，请稍后重试')
    }
  })

  it('should handle successful responses correctly', async () => {
    const mockData = { success: true, data: { id: 1, name: 'test' } }
      ; (fetch as any).mockResolvedValue(new Response(
        JSON.stringify(mockData),
        { status: 200, statusText: 'OK' }
      ))

    const result = await apiClient.get('/test')
    expect(result).toEqual(mockData)
  })
})