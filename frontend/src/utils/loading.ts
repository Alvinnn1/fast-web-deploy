import { ref, type Ref } from 'vue'

// 移除了全局Loading管理器，现在只保留错误处理功能
// 各个组件可以自行管理局部的loading状态

import { ErrorType, type UserFriendlyError } from '../types/common'

/**
 * 错误处理工具类
 * 提供统一的错误处理和用户友好的错误信息
 */

export class ErrorHandler {
  /**
   * 将API错误转换为用户友好的错误信息
   */
  static handle(error: any): UserFriendlyError {
    // 网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        title: '网络连接错误',
        message: '请检查网络连接后重试',
        action: 'retry'
      }
    }

    // API响应错误
    if (error.error?.code) {
      switch (error.error.code) {
        case 'NETWORK_ERROR':
          return {
            title: '网络连接错误',
            message: error.message || '请检查网络连接后重试',
            action: 'retry'
          }
        case 'TIMEOUT_ERROR':
          return {
            title: '请求超时',
            message: error.message || '网络响应超时，请重试',
            action: 'retry'
          }
        case 'RATE_LIMIT_ERROR':
          return {
            title: '请求过于频繁',
            message: error.message || '操作过于频繁，请稍后重试',
            action: 'retry'
          }
        case 'VALIDATION_ERROR':
          return {
            title: '输入验证失败',
            message: error.message || '请检查输入信息是否正确',
            action: 'dismiss'
          }
        case 'AUTHENTICATION_ERROR':
          return {
            title: 'API认证失败',
            message: error.message || 'API认证失败，请联系管理员',
            action: 'redirect'
          }
        case 'PERMISSION_ERROR':
          return {
            title: '权限不足',
            message: error.message || '没有权限执行此操作',
            action: 'dismiss'
          }
        case 'NOT_FOUND_ERROR':
          return {
            title: '资源不存在',
            message: error.message || '请求的资源不存在或已被删除',
            action: 'dismiss'
          }
        case 'CONFLICT_ERROR':
          return {
            title: '资源冲突',
            message: error.message || '资源已存在或发生冲突',
            action: 'dismiss'
          }
        case 'SERVER_ERROR':
          return {
            title: '服务器错误',
            message: error.message || '服务器暂时不可用，请稍后重试',
            action: 'retry'
          }
        case 'CLOUDFLARE_API_ERROR':
          return {
            title: 'Cloudflare服务错误',
            message: error.message || 'Cloudflare服务暂时不可用，请稍后重试',
            action: 'retry'
          }
        case 'UPLOAD_FAILED':
          return {
            title: '文件上传失败',
            message: error.message || '请检查文件格式和大小（需小于10MB）',
            action: 'retry'
          }
        default:
          return {
            title: '操作失败',
            message: error.message || '发生未知错误，请重试',
            action: 'retry'
          }
      }
    }

    // 默认错误处理
    return {
      title: '操作失败',
      message: error.message || '发生未知错误，请重试',
      action: 'retry'
    }
  }

  /**
   * 显示错误信息（可以集成到UI组件中）
   */
  static showError(error: any, showFunction?: (error: UserFriendlyError) => void): void {
    const userError = this.handle(error)

    if (showFunction) {
      showFunction(userError)
    } else {
      // 默认使用console.error，实际项目中应该集成到UI组件
      console.error(`${userError.title}: ${userError.message}`)
    }
  }
}

// withLoading函数已移除，请在各个组件中自行管理loading状态