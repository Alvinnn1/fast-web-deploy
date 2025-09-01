import { useNotifications } from './notifications'
import { ErrorHandler } from './loading'
import type { ApiResponse, UserFriendlyError } from '../types/common'

/**
 * API调用包装器，自动处理成功和错误通知
 */
export async function callWithNotification<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options?: {
    successMessage?: string
    showSuccessNotification?: boolean
    showErrorNotification?: boolean
    onSuccess?: (data: T) => void
    onError?: (error: UserFriendlyError) => void
  }
): Promise<T | null> {
  const { success, error } = useNotifications()
  const {
    successMessage,
    showSuccessNotification = true,
    showErrorNotification = true,
    onSuccess,
    onError
  } = options || {}

  try {
    const response = await apiCall()

    if (response.success && response.data) {
      // 显示成功通知
      if (showSuccessNotification && successMessage) {
        success(successMessage)
      }

      // 执行成功回调
      if (onSuccess) {
        onSuccess(response.data)
      }

      return response.data
    } else {
      throw new Error(response.message || '操作失败')
    }
  } catch (err: any) {
    const userError = ErrorHandler.handle(err)

    // 显示错误通知
    if (showErrorNotification) {
      error(userError)
    }

    // 执行错误回调
    if (onError) {
      onError(userError)
    }

    return null
  }
}

/**
 * 简化的API调用，只处理错误通知
 */
export async function callApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  onSuccess?: (data: T) => void
): Promise<T | null> {
  return callWithNotification(apiCall, {
    showSuccessNotification: false,
    onSuccess
  })
}

/**
 * 带成功消息的API调用
 */
export async function callApiWithSuccess<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  successMessage: string,
  onSuccess?: (data: T) => void
): Promise<T | null> {
  return callWithNotification(apiCall, {
    successMessage,
    onSuccess
  })
}