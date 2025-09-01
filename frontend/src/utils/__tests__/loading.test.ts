import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoadingManager, useLoading, ErrorHandler, ErrorType, withLoading } from '../loading'

describe('LoadingManager', () => {
  let loadingManager: LoadingManager

  beforeEach(() => {
    loadingManager = LoadingManager.getInstance()
    loadingManager.reset()
  })

  it('should be a singleton', () => {
    const instance1 = LoadingManager.getInstance()
    const instance2 = LoadingManager.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('should manage loading state correctly', () => {
    expect(loadingManager.isLoading()).toBe(false)

    loadingManager.startLoading()
    expect(loadingManager.isLoading()).toBe(true)

    loadingManager.stopLoading()
    expect(loadingManager.isLoading()).toBe(false)
  })

  it('should handle multiple concurrent loading operations', () => {
    loadingManager.startLoading()
    loadingManager.startLoading()
    expect(loadingManager.isLoading()).toBe(true)

    loadingManager.stopLoading()
    expect(loadingManager.isLoading()).toBe(true)

    loadingManager.stopLoading()
    expect(loadingManager.isLoading()).toBe(false)
  })

  it('should notify subscribers of state changes', () => {
    const callback = vi.fn()
    const unsubscribe = loadingManager.subscribe(callback)

    loadingManager.startLoading()
    expect(callback).toHaveBeenCalledWith(true)

    loadingManager.stopLoading()
    expect(callback).toHaveBeenCalledWith(false)

    unsubscribe()
    loadingManager.startLoading()
    expect(callback).toHaveBeenCalledTimes(2) // Should not be called after unsubscribe
  })

  it('should reset loading state', () => {
    loadingManager.startLoading()
    loadingManager.startLoading()
    expect(loadingManager.isLoading()).toBe(true)

    loadingManager.reset()
    expect(loadingManager.isLoading()).toBe(false)
  })
})

describe('ErrorHandler', () => {
  it('should handle network errors', () => {
    const networkError = new TypeError('Failed to fetch')
    const result = ErrorHandler.handle(networkError)

    expect(result.title).toBe('网络连接错误')
    expect(result.action).toBe('retry')
  })

  it('should handle Cloudflare API errors', () => {
    const apiError = {
      error: { code: 'CLOUDFLARE_API_ERROR' },
      message: 'API rate limit exceeded'
    }
    const result = ErrorHandler.handle(apiError)

    expect(result.title).toBe('Cloudflare服务错误')
    expect(result.message).toBe('API rate limit exceeded')
    expect(result.action).toBe('retry')
  })

  it('should handle validation errors', () => {
    const validationError = {
      error: { code: 'VALIDATION_ERROR' },
      message: 'Invalid domain format'
    }
    const result = ErrorHandler.handle(validationError)

    expect(result.title).toBe('输入验证失败')
    expect(result.message).toBe('Invalid domain format')
    expect(result.action).toBe('dismiss')
  })

  it('should handle authentication errors', () => {
    const authError = {
      error: { code: 'AUTHENTICATION_ERROR' },
      message: 'Invalid API token'
    }
    const result = ErrorHandler.handle(authError)

    expect(result.title).toBe('API认证失败')
    expect(result.action).toBe('redirect')
  })

  it('should handle unknown errors', () => {
    const unknownError = { message: 'Something went wrong' }
    const result = ErrorHandler.handle(unknownError)

    expect(result.title).toBe('操作失败')
    expect(result.message).toBe('Something went wrong')
    expect(result.action).toBe('retry')
  })
})

describe('withLoading', () => {
  let loadingManager: LoadingManager

  beforeEach(() => {
    loadingManager = LoadingManager.getInstance()
    loadingManager.reset()
  })

  it('should handle successful operations', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const result = await withLoading(operation)

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalled()
    expect(loadingManager.isLoading()).toBe(false)
  })

  it('should handle failed operations', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Operation failed'))
    const errorHandler = vi.fn()

    const result = await withLoading(operation, errorHandler)

    expect(result).toBe(null)
    expect(errorHandler).toHaveBeenCalledWith(new Error('Operation failed'))
    expect(loadingManager.isLoading()).toBe(false)
  })

  it('should manage loading state during operation', async () => {
    let loadingDuringOperation = false
    const operation = vi.fn().mockImplementation(async () => {
      loadingDuringOperation = loadingManager.isLoading()
      return 'success'
    })

    await withLoading(operation)

    expect(loadingDuringOperation).toBe(true)
    expect(loadingManager.isLoading()).toBe(false)
  })
})