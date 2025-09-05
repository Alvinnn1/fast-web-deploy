import type { ApiResponse } from '../types/common'
import type { Page, DeploymentResult, DeploymentStatusDetail, UploadUrlResponse, UploadPayload } from '../types/page'
import type { Domain, DomainDetail, DNSRecord, SSLCertificate, CreateDNSRecordRequest } from '../types/domain'
import { ErrorHandler } from '../utils/loading'
import { useNotifications } from '../utils/notifications'

/**
 * API客户端类 - 统一的HTTP请求处理
 * 提供与后端API通信的统一接口
 */
export class ApiClient {
  private baseURL: string
  private showNotifications: boolean

  constructor(baseURL: string = 'http://localhost:3000', showNotifications: boolean = true) {
    this.baseURL = baseURL
    this.showNotifications = showNotifications
  }

  /**
   * 通用HTTP请求方法
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      // Conditionally set Content-Type header only when request has a body and is not a GET request
      const headers: Record<string, string> = {}
      if (options.body && options.method !== 'GET') {
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(url, {
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      })

      clearTimeout(timeoutId)

      let data: any
      try {
        data = await response.json()
      } catch (parseError) {
        // Handle non-JSON responses
        data = { message: response.statusText }
      }

      if (!response.ok) {
        // Enhanced error handling based on status codes
        let errorCode = 'REQUEST_FAILED'
        let errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`

        switch (response.status) {
          case 400:
            errorCode = 'VALIDATION_ERROR'
            errorMessage = data.message || '请求参数无效'
            break
          case 401:
            errorCode = 'AUTHENTICATION_ERROR'
            errorMessage = 'API认证失败，请检查配置'
            break
          case 403:
            errorCode = 'PERMISSION_ERROR'
            errorMessage = '没有权限执行此操作'
            break
          case 404:
            errorCode = 'NOT_FOUND_ERROR'
            errorMessage = '请求的资源不存在'
            break
          case 409:
            errorCode = 'CONFLICT_ERROR'
            errorMessage = data.message || '资源冲突，可能已存在'
            break
          case 429:
            errorCode = 'RATE_LIMIT_ERROR'
            errorMessage = '请求过于频繁，请稍后重试'
            break
          case 500:
          case 502:
          case 503:
          case 504:
            errorCode = 'SERVER_ERROR'
            errorMessage = '服务器错误，请稍后重试'
            break
        }

        const apiError: ApiResponse<T> = {
          success: false,
          message: errorMessage,
          error: {
            code: errorCode,
            details: { status: response.status, data }
          }
        }

        throw apiError
      }

      return data
    } catch (error: any) {
      let apiError: ApiResponse<T>

      if (error?.name === 'AbortError') {
        // Request timeout
        apiError = {
          success: false,
          message: '请求超时，请检查网络连接',
          error: {
            code: 'TIMEOUT_ERROR',
            details: error
          }
        }
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error
        apiError = {
          success: false,
          message: '网络连接失败，请检查网络设置',
          error: {
            code: 'NETWORK_ERROR',
            details: error
          }
        }
      } else if (error?.success === false) {
        // Already formatted API error
        apiError = error as ApiResponse<T>
      } else {
        // Unknown error
        apiError = {
          success: false,
          message: error instanceof Error ? error.message : '未知错误',
          error: {
            code: 'UNKNOWN_ERROR',
            details: error
          }
        }
      }

      // 显示错误通知
      if (this.showNotifications) {
        const userError = ErrorHandler.handle(apiError)
        const { error: showError } = useNotifications()
        showError(userError)
      }

      throw apiError
    }
  }

  /**
   * GET请求
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  /**
   * 文件上传请求
   */
  async uploadFile<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        body: formData,
        // 不设置Content-Type，让浏览器自动设置multipart/form-data边界
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      return data
    } catch (error) {
      const apiError: ApiResponse<T> = {
        success: false,
        message: error instanceof Error ? error.message : '文件上传失败',
        error: {
          code: 'UPLOAD_FAILED',
          details: error
        }
      }

      // 显示错误通知
      if (this.showNotifications) {
        const userError = ErrorHandler.handle(apiError)
        const { error: showError } = useNotifications()
        showError(userError)
      }

      throw apiError
    }
  }
}

// 创建默认的API客户端实例
// 开发模式：使用相对路径利用Vite代理
// 生产模式：使用环境变量指定的API基础URL（Cloudflare Workers）
const isDevelopment = import.meta.env.DEV
const baseURL = isDevelopment
  ? '' // 开发模式：使用相对路径，让Vite代理处理
  : (import.meta.env.VITE_API_BASE_URL || 'https://api.luckyjingwen.top') // 生产模式：使用Cloudflare Workers域名
export const apiClient = new ApiClient(baseURL)

// 导出API方法的便捷函数
export const api = {
  // 域名相关API
  domains: {
    list: () => apiClient.get<Domain[]>('/api/domains'),
    create: (data: { name: string; nameservers?: string[] }) =>
      apiClient.post<Domain>('/api/domains', data),
    getDetail: (id: string) => apiClient.get<DomainDetail>(`/api/domains/${id}`),
    getDnsRecords: (id: string) => apiClient.get<DNSRecord[]>(`/api/domains/${id}/dns-records`),
    updateDnsRecord: (domainId: string, recordId: string, data: any) =>
      apiClient.put<DNSRecord>(`/api/domains/${domainId}/dns-records/${recordId}`, data),
    createDnsRecord: (domainId: string, data: CreateDNSRecordRequest) =>
      apiClient.post<DNSRecord>(`/api/domains/${domainId}/dns-records`, data),
    deleteDnsRecord: (domainId: string, recordId: string) =>
      apiClient.delete<void>(`/api/domains/${domainId}/dns-records/${recordId}`),
    requestSSL: (id: string) => apiClient.post<SSLCertificate>(`/api/domains/${id}/ssl-certificate`),
  },

  // 页面相关API
  pages: {
    list: () => apiClient.get<Page[]>('/api/pages'),
    create: (data: { name: string }) => apiClient.post<Page>('/api/pages', data),

    // 获取直接上传URL
    getUploadUrl: (projectName: string) =>
      apiClient.get<UploadUrlResponse>(`/api/pages/${projectName}/upload-url`),

    getDeploymentStatus: (projectName: string) =>
      apiClient.get<DeploymentStatusDetail>(`/api/pages/${projectName}/deployment-status`),

    // Get deployment status by deployment ID
    getDeploymentStatusById: (projectName: string, deploymentId: string) =>
      apiClient.get<DeploymentStatusDetail>(`/api/pages/${projectName}/deployment-status?deploymentId=${deploymentId}`),

    // Get deployment status by deployment ID with polling-specific error handling
    pollDeploymentStatus: async (projectName: string, deploymentId: string): Promise<ApiResponse<DeploymentStatusDetail>> => {
      try {
        return await apiClient.get<DeploymentStatusDetail>(`/api/pages/${projectName}/deployment-status?deploymentId=${deploymentId}`)
      } catch (error: any) {
        // For polling, we want to handle errors more gracefully
        // Return a failed response instead of throwing to allow silent failure
        const pollingError: ApiResponse<DeploymentStatusDetail> = {
          success: false,
          message: error?.message || 'Failed to poll deployment status',
          error: {
            code: 'POLLING_FAILED',
            details: error
          }
        }
        return pollingError
      }
    },

    // Deploy page with manifest
    deploy: (projectName: string, manifest: Record<string, string>) =>
      apiClient.post<DeploymentResult>(`/api/pages/${projectName}/deploy`, { manifest }),

    // 检查缺失的资产
    checkMissingAssets: (jwt: string, payload: UploadPayload[]) => {
      return apiClient.request<{ result: string[], success: boolean }>('/api/pages/assets/check-missing', {
        method: 'POST',
        body: JSON.stringify({
          jwt,
          hashes: payload.map(p => p.key)
        })
      })
    },
    assetsUpload: (jwt: string, payload: UploadPayload[]) => {
      return apiClient.request<{ result: { successful_key_count: number, unsuccessful_keys: string[] }, success: boolean }>('/api/pages/assets/upload', {
        method: 'POST',
        body: JSON.stringify({
          jwt,
          payload
        })
      })
    },

    // 域名管理API
    getDomains: (projectName: string) =>
      apiClient.get<any[]>(`/api/pages/${projectName}/domains`),
    addDomain: (projectName: string, domainName: string) =>
      apiClient.post<any>(`/api/pages/${projectName}/domains`, { name: domainName }),
    deleteDomain: (projectName: string, domainName: string) =>
      apiClient.delete<void>(`/api/pages/${projectName}/domains/${domainName}`),
  },
}