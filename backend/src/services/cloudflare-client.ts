import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { config } from '../config/index.js'
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

// Cloudflare Zone Types
interface CloudflareZone {
  id: string
  name: string
  status: string
  name_servers: string[]
  created_on: string
  modified_on: string
}

// Cloudflare DNS Record Types
interface CloudflareDNSRecord {
  id: string
  type: string
  name: string
  content: string
  ttl: number
  proxied?: boolean
  created_on: string
  modified_on: string
}

// Cloudflare SSL Certificate Types
interface CloudflareSSLCertificate {
  id: string
  status: string
  issuer: string
  expires_on: string
  hosts?: string[]
  type?: string
  validation_method?: string
  validity_days?: number
}

// Cloudflare Pages Project Types
interface CloudflarePagesProject {
  id: string
  name: string
  subdomain: string
  domains: string[]
  source?: {
    type: string
    config: any
  }
  build_config?: {
    build_command?: string
    destination_dir?: string
    root_dir?: string
  }
  deployment_configs: {
    preview: any
    production: any
  }
  latest_deployment?: {
    id: string
    short_id: string
    project_id: string
    project_name: string
    environment: string
    url: string
    created_on: string
    modified_on: string
    latest_stage: {
      name: string
      started_on: string
      ended_on?: string
      status: string
    }
  }
  created_on: string
  production_branch?: string
}

// Cloudflare Pages Deployment Types
interface CloudflarePagesDeployment {
  id: string
  short_id: string
  project_id: string
  project_name: string
  environment: string
  url: string
  created_on: string
  modified_on: string
  latest_stage: {
    name: string
    started_on: string
    ended_on?: string
    status: string
  }
  deployment_trigger: {
    type: string
    metadata: any
  }
  stages: Array<{
    name: string
    started_on: string
    ended_on?: string
    status: string
  }>
  build_config: {
    build_command?: string
    destination_dir?: string
    root_dir?: string
  }
  source?: {
    type: string
    config: any
  }
}

export class CloudflareClient {
  private client: AxiosInstance

  constructor() {
    // Determine which authentication method to use
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (config.cloudflareApiKey && config.cloudflareEmail) {
      // Use Global API Key authentication
      headers['X-Auth-Email'] = config.cloudflareEmail
      headers['X-Auth-Key'] = config.cloudflareApiKey
    } else {
      // Use API Token authentication (default)
      headers['Authorization'] = `Bearer ${config.cloudflareApiToken}`
    }

    this.client = axios.create({
      baseURL: config.cloudflareApiBaseUrl,
      headers,
      timeout: 30000 // 30 seconds timeout
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    )
  }

  private handleError(error: AxiosError): never {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status
      const data = error.response.data as CloudflareResponse

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

      // Fallback for any other status codes
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        'Unexpected response from Cloudflare API.',
        status,
        data
      )
    } else if (error.request) {
      // Network error
      throw new AppError(
        ErrorType.NETWORK_ERROR,
        'Unable to connect to Cloudflare API. Please check your internet connection.',
        0,
        error.message
      )
    } else {
      // Other error
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        'An unexpected error occurred while calling Cloudflare API.',
        500,
        error.message
      )
    }
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    try {
      const response: AxiosResponse<CloudflareResponse<T>> = await this.client.request({
        method,
        url: endpoint,
        data
      })

      const cloudflareResponse = response.data

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
      throw this.handleError(error as AxiosError)
    }
  }

  // Zone Management Methods
  async getZones(): Promise<CloudflareZone[]> {
    return this.makeRequest<CloudflareZone[]>('GET', '/zones')
  }

  async getZone(zoneId: string): Promise<CloudflareZone> {
    return this.makeRequest<CloudflareZone>('GET', `/zones/${zoneId}`)
  }

  async createZone(name: string, nameservers?: string[]): Promise<CloudflareZone> {
    const data: any = { name }
    if (nameservers && nameservers.length > 0) {
      data.name_servers = nameservers
    }
    return this.makeRequest<CloudflareZone>('POST', '/zones', data)
  }

  // DNS Records Management Methods
  async getDNSRecords(zoneId: string): Promise<CloudflareDNSRecord[]> {
    return this.makeRequest<CloudflareDNSRecord[]>('GET', `/zones/${zoneId}/dns_records`)
  }

  async getDNSRecord(zoneId: string, recordId: string): Promise<CloudflareDNSRecord> {
    return this.makeRequest<CloudflareDNSRecord>('GET', `/zones/${zoneId}/dns_records/${recordId}`)
  }

  async createDNSRecord(
    zoneId: string,
    record: {
      type: string
      name: string
      content: string
      ttl?: number
      proxied?: boolean
    }
  ): Promise<CloudflareDNSRecord> {
    return this.makeRequest<CloudflareDNSRecord>('POST', `/zones/${zoneId}/dns_records`, record)
  }

  async updateDNSRecord(
    zoneId: string,
    recordId: string,
    record: {
      type: string
      name: string
      content: string
      ttl?: number
      proxied?: boolean
    }
  ): Promise<CloudflareDNSRecord> {
    return this.makeRequest<CloudflareDNSRecord>('PUT', `/zones/${zoneId}/dns_records/${recordId}`, record)
  }

  async deleteDNSRecord(zoneId: string, recordId: string): Promise<{ id: string }> {
    return this.makeRequest<{ id: string }>('DELETE', `/zones/${zoneId}/dns_records/${recordId}`)
  }

  // SSL Certificate Management Methods
  async getSSLCertificates(zoneId: string): Promise<any[]> {
    return this.makeRequest<any[]>('GET', `/zones/${zoneId}/ssl/certificate_packs`)
  }

  async getSSLCertificate(zoneId: string): Promise<CloudflareSSLCertificate | null> {
    try {
      const certificatePacks = await this.getSSLCertificates(zoneId)

      if (!certificatePacks || certificatePacks.length === 0) {
        return null
      }

      // Find the first active certificate pack
      const activePack = certificatePacks.find(pack => pack.status === 'active')
      if (!activePack) {
        return null
      }

      // Get the primary certificate from the pack
      const primaryCert = activePack.certificates?.find((cert: any) =>
        cert.id === activePack.primary_certificate
      ) || activePack.certificates?.[0]

      if (!primaryCert) {
        return null
      }

      return {
        id: primaryCert.id,
        status: primaryCert.status,
        issuer: primaryCert.issuer || activePack.certificate_authority || 'Unknown',
        expires_on: primaryCert.expires_on,
        hosts: activePack.hosts || [],
        type: activePack.type || 'universal',
        validation_method: activePack.validation_method || 'txt',
        validity_days: activePack.validity_days || 90
      }
    } catch (error) {
      // If SSL certificates are not available or accessible, return null
      return null
    }
  }

  async requestSSLCertificate(zoneId: string): Promise<CloudflareSSLCertificate> {
    // For Universal SSL, we typically don't need to create a new certificate pack
    // Instead, we can trigger SSL certificate provisioning by enabling Universal SSL
    try {
      // First, try to get existing certificate
      const existingCert = await this.getSSLCertificate(zoneId)
      if (existingCert && existingCert.status === 'active') {
        return existingCert
      }

      // If no active certificate, request a new Universal SSL certificate
      const result = await this.makeRequest<any>('POST', `/zones/${zoneId}/ssl/certificate_packs`, {
        type: 'universal',
        hosts: [] // Let Cloudflare determine the hosts automatically
      })

      // Return the created certificate pack in the expected format
      return {
        id: result.id || result.certificates?.[0]?.id || 'pending',
        status: result.status || 'pending',
        issuer: result.certificate_authority || 'Cloudflare',
        expires_on: result.certificates?.[0]?.expires_on || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        hosts: result.hosts || [],
        type: result.type || 'universal',
        validation_method: result.validation_method || 'txt',
        validity_days: result.validity_days || 90
      }
    } catch (error) {
      // If certificate pack creation fails, it might be because Universal SSL is already enabled
      // Try to get the existing certificate again
      const existingCert = await this.getSSLCertificate(zoneId)
      if (existingCert) {
        return existingCert
      }
      throw error
    }
  }

  // Pages Management Methods
  async getPagesProjects(accountId?: string): Promise<CloudflarePagesProject[]> {
    // If no account ID provided, we'll need to get it from the API token
    const endpoint = accountId ? `/accounts/${accountId}/pages/projects` : '/accounts/pages/projects'
    return this.makeRequest<CloudflarePagesProject[]>('GET', endpoint)
  }

  async getPagesProject(accountId: string, projectName: string): Promise<CloudflarePagesProject> {
    return this.makeRequest<CloudflarePagesProject>('GET', `/accounts/${accountId}/pages/projects/${projectName}`)
  }

  async createPagesProject(
    accountId: string,
    name: string,
    options?: {
      build_config?: {
        build_command?: string
        destination_dir?: string
        root_dir?: string
      }
      deployment_configs?: {
        preview?: any
        production?: any
      }
      production_branch?: string
    }
  ): Promise<CloudflarePagesProject> {
    const data = {
      name,
      ...options
    }
    return this.makeRequest<CloudflarePagesProject>('POST', `/accounts/${accountId}/pages/projects`, data)
  }

  // Create deployment and get upload URL for direct upload
  async createPagesDeploymentUploadJwt(
    accountId: string,
    projectName: string
  ): Promise<{
    jwt: string
  }> {

    return this.makeRequest<{ jwt: string }>('GET', `/accounts/${accountId}/pages/projects/${projectName}/upload-token`)
  }

  // Legacy method for backward compatibility
  async createPagesDeployment(
    accountId: string,
    projectName: string,
  ): Promise<CloudflarePagesDeployment> {
    try {
      // For file uploads, we need to handle multipart/form-data differently
      const response = await this.client.post(
        `/accounts/${accountId}/pages/projects/${projectName}/deployments`,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      const cloudflareResponse = response.data as CloudflareResponse<CloudflarePagesDeployment>

      if (!cloudflareResponse.success) {
        const errorMessage = cloudflareResponse.errors?.[0]?.message || 'Pages deployment failed'
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
      throw this.handleError(error as AxiosError)
    }
  }

  // Create deployment with manifest
  async createPagesDeploymentWithManifest(
    accountId: string,
    projectName: string,
    manifest: Record<string, string>
  ): Promise<CloudflarePagesDeployment> {
    try {
      // Create form data with manifest
      const formData = new FormData()
      formData.append('manifest', JSON.stringify(manifest))

      const response = await this.client.post(
        `/accounts/${accountId}/pages/projects/${projectName}/deployments`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      const cloudflareResponse = response.data as CloudflareResponse<CloudflarePagesDeployment>

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
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw this.handleError(error as AxiosError)
    }
  }

  async getPagesDeployment(
    accountId: string,
    projectName: string,
    deploymentId: string
  ): Promise<CloudflarePagesDeployment> {
    return this.makeRequest<CloudflarePagesDeployment>(
      'GET',
      `/accounts/${accountId}/pages/projects/${projectName}/deployments/${deploymentId}`
    )
  }

  async getPagesDeployments(
    accountId: string,
    projectName: string
  ): Promise<CloudflarePagesDeployment[]> {
    return this.makeRequest<CloudflarePagesDeployment[]>(
      'GET',
      `/accounts/${accountId}/pages/projects/${projectName}/deployments`
    )
  }

  // Account Information Methods
  async getAccountId(): Promise<string> {
    // Use configured account ID if available
    if (config.cloudflareAccountId) {
      return config.cloudflareAccountId
    }

    // Fallback to API call if not configured
    const accounts = await this.makeRequest<Array<{ id: string; name: string }>>('GET', '/accounts')
    if (!accounts || accounts.length === 0) {
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        'No Cloudflare accounts found for this API token',
        404
      )
    }

    const firstAccount = accounts[0]
    if (!firstAccount || !firstAccount.id) {
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        'Invalid account data received from Cloudflare API',
        500
      )
    }

    return firstAccount.id
  }

  // Get configured account ID directly (without API call)
  getConfiguredAccountId(): string {
    if (!config.cloudflareAccountId) {
      throw new AppError(
        ErrorType.CONFIGURATION_ERROR,
        'Cloudflare Account ID is not configured',
        500
      )
    }
    return config.cloudflareAccountId
  }

  // Get configured email directly (without API call)
  getConfiguredEmail(): string {
    if (!config.cloudflareEmail) {
      throw new AppError(
        ErrorType.CONFIGURATION_ERROR,
        'Cloudflare Email is not configured',
        500
      )
    }
    return config.cloudflareEmail
  }

  // Utility method to verify API token
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
      // Create a temporary client instance with JWT authorization for this request
      const jwtClient = axios.create({
        baseURL: config.cloudflareApiBaseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        timeout: 30000
      })

      const response: AxiosResponse<CheckMissingAssetsResponse> = await jwtClient.post(
        '/pages/assets/check-missing',
        { hashes }
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status
          const data = error.response.data

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
        } else if (error.request) {
          throw new AppError(
            ErrorType.NETWORK_ERROR,
            'Unable to connect to Cloudflare Pages assets API. Please check your internet connection.',
            0,
            error.message
          )
        }
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
      // Create a temporary client instance with JWT authorization for this request
      const jwtClient = axios.create({
        baseURL: config.cloudflareApiBaseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        timeout: 60000 // Longer timeout for file uploads
      })

      const response: AxiosResponse<AssetsUploadResponse> = await jwtClient.post(
        '/pages/assets/upload',
        payload
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status
          const data = error.response.data

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
        } else if (error.request) {
          throw new AppError(
            ErrorType.NETWORK_ERROR,
            'Unable to connect to Cloudflare Pages assets API. Please check your internet connection.',
            0,
            error.message
          )
        }
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

// Export singleton instance
export const cloudflareClient = new CloudflareClient()