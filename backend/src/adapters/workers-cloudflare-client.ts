/**
 * Workers Cloudflare Client - Adapts CloudflareClient for Workers environment
 */

import { AppError, ErrorType, UploadPayload, CheckMissingAssetsResponse, AssetsUploadResponse } from '../types.js'

// Cloudflare API Response Types
interface CloudflareResponse<T = any> {
  success: boolean
  errors: Array<{
    code: number
    message: string
  }>
  messages: string[]
  result: T
  result_info?: {
    page: number
    per_page: number
    count: number
    total_count: number
  }
}

export interface Env {
  CLOUDFLARE_API_TOKEN: string
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_EMAIL: string
  CORS_ORIGINS: string
  NODE_ENV: string
}

export class WorkersCloudflareClient {
  private baseUrl = 'https://api.cloudflare.com/client/v4'
  private headers: Record<string, string>

  constructor(private env: Env) {
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`
    }
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const options: RequestInit = {
        method,
        headers: this.headers
      }

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(url, options)

      if (!response.ok) {
        await this.handleHttpError(response)
      }

      const cloudflareResponse = await response.json() as CloudflareResponse<T>

      if (!cloudflareResponse.success) {
        const errorMessage = cloudflareResponse.errors?.[0]?.message || 'Cloudflare API request failed'
        throw new AppError(
          ErrorType.CLOUDFLARE_API_ERROR,
          errorMessage,
          response.status,
          cloudflareResponse.errors
        )
      }

      return cloudflareResponse.result
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        'An unexpected error occurred while calling Cloudflare API.',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status
    let data: any

    try {
      data = await response.json()
    } catch {
      data = { message: response.statusText }
    }

    if (status === 401 || status === 403) {
      throw new AppError(
        ErrorType.AUTHENTICATION_ERROR,
        'Cloudflare API authentication failed. Please check your API token.',
        status,
        data
      )
    }

    if (status >= 400 && status < 500) {
      const errorMessage = data?.errors?.[0]?.message || 'Invalid request to Cloudflare API'
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        errorMessage,
        status,
        data
      )
    }

    if (status >= 500) {
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        'Cloudflare API server error. Please try again later.',
        status,
        data
      )
    }

    throw new AppError(
      ErrorType.CLOUDFLARE_API_ERROR,
      'Unexpected response from Cloudflare API.',
      status,
      data
    )
  }

  // Zone Management Methods
  async getZones(): Promise<any[]> {
    return this.makeRequest<any[]>('GET', '/zones')
  }

  async getZone(zoneId: string): Promise<any> {
    return this.makeRequest<any>('GET', `/zones/${zoneId}`)
  }

  async createZone(name: string, nameservers?: string[]): Promise<any> {
    const data: any = { name }
    if (nameservers && nameservers.length > 0) {
      data.name_servers = nameservers
    }
    return this.makeRequest<any>('POST', '/zones', data)
  }

  // DNS Records Management Methods
  async getDNSRecords(zoneId: string): Promise<any[]> {
    return this.makeRequest<any[]>('GET', `/zones/${zoneId}/dns_records`)
  }

  async getDNSRecord(zoneId: string, recordId: string): Promise<any> {
    return this.makeRequest<any>('GET', `/zones/${zoneId}/dns_records/${recordId}`)
  }

  async createDNSRecord(zoneId: string, record: any): Promise<any> {
    return this.makeRequest<any>('POST', `/zones/${zoneId}/dns_records`, record)
  }

  async updateDNSRecord(zoneId: string, recordId: string, record: any): Promise<any> {
    return this.makeRequest<any>('PUT', `/zones/${zoneId}/dns_records/${recordId}`, record)
  }

  async deleteDNSRecord(zoneId: string, recordId: string): Promise<{ id: string }> {
    return this.makeRequest<{ id: string }>('DELETE', `/zones/${zoneId}/dns_records/${recordId}`)
  }

  // SSL Certificate Management Methods
  async getSSLCertificate(zoneId: string): Promise<any> {
    return this.makeRequest<any>('GET', `/zones/${zoneId}/ssl/certificate_packs?status=all&per_page=20`)
  }

  async requestSSLCertificate(zoneId: string): Promise<any> {
    return this.makeRequest<any>('POST', `/zones/${zoneId}/ssl/certificate_packs`, {
      type: 'advanced',
      hosts: ['*']
    })
  }

  // Pages Management Methods
  async getPagesProjects(accountId?: string): Promise<any[]> {
    const endpoint = accountId ? `/accounts/${accountId}/pages/projects` : `/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`
    return this.makeRequest<any[]>('GET', endpoint)
  }

  async getPagesProject(accountId: string, projectName: string): Promise<any> {
    return this.makeRequest<any>('GET', `/accounts/${accountId}/pages/projects/${projectName}`)
  }

  async createPagesProject(accountId: string, name: string, options?: any): Promise<any> {
    const data = { name, ...options }
    return this.makeRequest<any>('POST', `/accounts/${accountId}/pages/projects`, data)
  }

  async createPagesDeploymentUploadJwt(accountId: string, projectName: string): Promise<{ jwt: string }> {
    return this.makeRequest<{ jwt: string }>('GET', `/accounts/${accountId}/pages/projects/${projectName}/upload-token`)
  }

  async createPagesDeploymentWithManifest(accountId: string, projectName: string, manifest: Record<string, string>): Promise<any> {
    // For Workers, we need to handle FormData differently
    const formData = new FormData()
    formData.append('manifest', JSON.stringify(manifest))

    const response = await fetch(`${this.baseUrl}/accounts/${accountId}/pages/projects/${projectName}/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`
      },
      body: formData
    })

    if (!response.ok) {
      await this.handleHttpError(response)
    }

    const cloudflareResponse = await response.json() as CloudflareResponse<any>

    if (!cloudflareResponse.success) {
      const errorMessage = cloudflareResponse.errors?.[0]?.message || 'Pages deployment with manifest failed'
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        errorMessage,
        response.status,
        cloudflareResponse.errors
      )
    }

    return cloudflareResponse.result
  }

  async getPagesDeployment(accountId: string, projectName: string, deploymentId: string): Promise<any> {
    return this.makeRequest<any>('GET', `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}`)
  }

  async getPagesDeployments(accountId: string, projectName: string): Promise<any[]> {
    return this.makeRequest<any[]>('GET', `/accounts/${accountId}/pages/projects/${projectName}/deployments`)
  }

  // Pages Project Domain Management Methods
  async getPagesProjectDomains(accountId: string, projectName: string): Promise<any[]> {
    return this.makeRequest<any[]>('GET', `/accounts/${accountId}/pages/projects/${projectName}/domains`)
  }

  async addPagesProjectDomain(accountId: string, projectName: string, domainName: string): Promise<any> {
    const data = { name: domainName }
    return this.makeRequest<any>('POST', `/accounts/${accountId}/pages/projects/${projectName}/domains`, data)
  }

  async deletePagesProjectDomain(accountId: string, projectName: string, domainName: string): Promise<void> {
    await this.makeRequest<void>('DELETE', `/accounts/${accountId}/pages/projects/${projectName}/domains/${domainName}`)
  }

  // Account Information Methods
  async getAccountId(): Promise<string> {
    if (this.env.CLOUDFLARE_ACCOUNT_ID) {
      return this.env.CLOUDFLARE_ACCOUNT_ID
    }

    const accounts = await this.makeRequest<Array<{ id: string; name: string }>>('GET', '/accounts')
    if (!accounts || accounts.length === 0) {
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        'No Cloudflare accounts found for this API token',
        404
      )
    }

    return accounts[0]!.id
  }

  getConfiguredAccountId(): string {
    if (!this.env.CLOUDFLARE_ACCOUNT_ID) {
      throw new AppError(
        ErrorType.CONFIGURATION_ERROR,
        'Cloudflare Account ID is not configured',
        500
      )
    }
    return this.env.CLOUDFLARE_ACCOUNT_ID
  }

  getConfiguredEmail(): string {
    if (!this.env.CLOUDFLARE_EMAIL) {
      throw new AppError(
        ErrorType.CONFIGURATION_ERROR,
        'Cloudflare Email is not configured',
        500
      )
    }
    return this.env.CLOUDFLARE_EMAIL
  }

  async verifyToken(): Promise<boolean> {
    try {
      await this.makeRequest('GET', '/user/tokens/verify')
      return true
    } catch (error) {
      return false
    }
  }

  // Asset Upload Proxy Methods
  async checkMissingAssets(jwt: string, hashes: string[]): Promise<CheckMissingAssetsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/pages/assets/check-missing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({ hashes })
      })

      if (!response.ok) {
        const status = response.status
        let data: any

        try {
          data = await response.json()
        } catch {
          data = { message: response.statusText }
        }

        if (status === 401 || status === 403) {
          throw new AppError(
            ErrorType.AUTHENTICATION_ERROR,
            'Invalid or expired JWT token for asset upload',
            status,
            data
          )
        }

        if (status >= 400 && status < 500) {
          const errorMessage = data?.errors?.[0]?.message || 'Invalid request to Cloudflare Pages assets API'
          throw new AppError(
            ErrorType.CLOUDFLARE_API_ERROR,
            errorMessage,
            status,
            data
          )
        }

        if (status >= 500) {
          throw new AppError(
            ErrorType.CLOUDFLARE_API_ERROR,
            'Cloudflare Pages assets API server error. Please try again later.',
            status,
            data
          )
        }
      }

      return await response.json() as CheckMissingAssetsResponse
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        'An unexpected error occurred while checking missing assets.',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async uploadAssets(jwt: string, payload: UploadPayload[]): Promise<AssetsUploadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/pages/assets/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const status = response.status
        let data: any

        try {
          data = await response.json()
        } catch {
          data = { message: response.statusText }
        }

        if (status === 401 || status === 403) {
          throw new AppError(
            ErrorType.AUTHENTICATION_ERROR,
            'Invalid or expired JWT token for asset upload',
            status,
            data
          )
        }

        if (status >= 400 && status < 500) {
          const errorMessage = data?.errors?.[0]?.message || 'Invalid request to Cloudflare Pages assets API'
          throw new AppError(
            ErrorType.CLOUDFLARE_API_ERROR,
            errorMessage,
            status,
            data
          )
        }

        if (status >= 500) {
          throw new AppError(
            ErrorType.CLOUDFLARE_API_ERROR,
            'Cloudflare Pages assets API server error. Please try again later.',
            status,
            data
          )
        }
      }

      return await response.json() as AssetsUploadResponse
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        'An unexpected error occurred while uploading assets.',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
}