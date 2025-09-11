/**
 * Pages Handler - Handles pages-related requests in Workers environment
 */

import { WorkersCloudflareClient } from '../workers-cloudflare-client.js'
import { WorkersResponseFormatter } from '../workers-response-formatter.js'
import { WorkersErrorHandler } from '../workers-error-handler.js'
import { CreatePageRequest, Page, DeploymentResult, DeploymentStatus, CheckMissingAssetsRequest, AssetsUploadRequest, DeployPageRequest } from '../../types.js'
import { PaginationHelper } from '../../utils/pagination.js'

// Transform Cloudflare Pages project to our Page interface
function transformPagesProjectToPage(project: any): Page {
  const latestDeployment = project.latest_deployment

  let status: Page['status'] = 'created'
  let url: string | undefined
  let deploymentId: string | undefined
  let lastDeployedAt: string | undefined

  if (latestDeployment) {
    deploymentId = latestDeployment.id
    lastDeployedAt = latestDeployment.modified_on
    url = latestDeployment.url

    // Map Cloudflare deployment status to our status
    const deploymentStatus = latestDeployment.latest_stage?.status
    switch (deploymentStatus) {
      case 'success':
        status = 'deployed'
        break
      case 'failure':
      case 'canceled':
        status = 'failed'
        break
      case 'active':
      case 'building':
        status = 'deploying'
        break
      default:
        status = 'created'
    }
  }

  return {
    id: project.id,
    name: project.name,
    status,
    domains: project.domains,
    createdAt: project.created_on,
    ...(url && { url }),
    ...(deploymentId && { deploymentId }),
    ...(lastDeployedAt && { lastDeployedAt })
  }
}

// Transform Cloudflare deployment to our DeploymentResult interface
function transformDeploymentToResult(deployment: any): DeploymentResult {
  const status = deployment.latest_stage?.status
  let mappedStatus: DeploymentResult['status'] = 'queued'

  switch (status) {
    case 'success':
      mappedStatus = 'success'
      break
    case 'failure':
    case 'canceled':
      mappedStatus = 'failure'
      break
    case 'active':
    case 'building':
      mappedStatus = 'building'
      break
    case 'deploying':
      mappedStatus = 'deploying'
      break
    default:
      mappedStatus = 'queued'
  }

  const errorMessage = status === 'failure' ? 'Deployment failed' : undefined

  return {
    id: deployment.id,
    status: mappedStatus,
    ...(deployment.url && { url: deployment.url }),
    ...(errorMessage && { errorMessage })
  }
}

// Transform deployment to status interface
function transformDeploymentToStatus(deployment: any): DeploymentStatus {
  const status = deployment.latest_stage?.status
  let mappedStatus: DeploymentStatus['status'] = 'queued'
  let progress: number | undefined

  switch (status) {
    case 'success':
      mappedStatus = 'success'
      progress = 100
      break
    case 'failure':
    case 'canceled':
      mappedStatus = 'failure'
      progress = 100
      break
    case 'active':
    case 'building':
      mappedStatus = 'building'
      progress = 50
      break
    case 'deploying':
      mappedStatus = 'deploying'
      progress = 80
      break
    default:
      mappedStatus = 'queued'
      progress = 0
  }

  // Extract logs from stages
  const logs: string[] = []
  if (deployment.stages && Array.isArray(deployment.stages)) {
    deployment.stages.forEach((stage: any) => {
      logs.push(`${stage.name}: ${stage.status} (${stage.started_on})`)
    })
  }

  const errorMessage = status === 'failure' ? 'Deployment failed' : undefined

  return {
    status: mappedStatus,
    ...(progress !== undefined && { progress }),
    ...(logs.length > 0 && { logs }),
    ...(deployment.url && { url: deployment.url }),
    ...(errorMessage && { errorMessage })
  }
}

export class PagesHandler {
  constructor(private cloudflareClient: WorkersCloudflareClient) { }

  async handle(request: Request, pathname: string, method: string): Promise<Response> {
    try {
      const url = new URL(request.url)
      const pathParts = pathname.split('/').filter(Boolean)

      // GET /api/pages - Get all pages
      if (pathParts.length === 2 && pathParts[1] === 'pages' && method === 'GET') {
        return this.getAllPages(request)
      }

      // POST /api/pages - Create new page project
      if (pathParts.length === 2 && pathParts[1] === 'pages' && method === 'POST') {
        return this.createPage(request)
      }

      // GET /api/pages/:projectName - Get specific page project
      if (pathParts.length === 3 && pathParts[1] === 'pages' && method === 'GET') {
        const projectName = pathParts[2]!
        return this.getPage(projectName)
      }

      // POST /api/pages/:projectName/deploy - Deploy page
      if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'deploy' && method === 'POST') {
        const projectName = pathParts[2]!
        return this.deployPage(request, projectName)
      }

      // GET /api/pages/:projectName/upload-url - Get direct upload URL
      if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'upload-url' && method === 'GET') {
        const projectName = pathParts[2]!
        return this.getUploadUrl(projectName)
      }

      // GET /api/pages/:projectName/deployment-status - Get deployment status
      if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'deployment-status' && method === 'GET') {
        const projectName = pathParts[2]!
        const deploymentId = url.searchParams.get('deploymentId')
        return this.getDeploymentStatus(projectName, deploymentId)
      }

      // POST /api/pages/assets/check-missing - Proxy for checking missing assets
      if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[2] === 'assets' && pathParts[3] === 'check-missing' && method === 'POST') {
        return this.checkMissingAssets(request)
      }

      // POST /api/pages/assets/upload - Proxy for uploading assets
      if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[2] === 'assets' && pathParts[3] === 'upload' && method === 'POST') {
        return this.uploadAssets(request)
      }

      // GET /api/pages/:projectName/domains - Get project domains
      if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'domains' && method === 'GET') {
        const projectName = pathParts[2]!
        return this.getProjectDomains(projectName)
      }

      // POST /api/pages/:projectName/domains - Add domain to project
      if (pathParts.length === 4 && pathParts[1] === 'pages' && pathParts[3] === 'domains' && method === 'POST') {
        const projectName = pathParts[2]!
        return this.addProjectDomain(request, projectName)
      }

      // DELETE /api/pages/:projectName/domains/:domainName - Delete domain from project
      if (pathParts.length === 5 && pathParts[1] === 'pages' && pathParts[3] === 'domains' && method === 'DELETE') {
        const projectName = pathParts[2]!
        const domainName = pathParts[4]!
        return this.deleteProjectDomain(projectName, domainName)
      }

      return WorkersResponseFormatter.notFound('Pages endpoint not found')
    } catch (error) {
      return WorkersErrorHandler.createErrorResponse(error)
    }
  }

  private async getAllPages(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const paginationParams = PaginationHelper.parseParams(url.searchParams)

    // Validate pagination parameters
    const validation = PaginationHelper.validateParams(paginationParams)
    if (!validation.valid) {
      return WorkersResponseFormatter.badRequest(validation.error!)
    }

    // Use configured account ID (no API call needed)
    const accountId = this.cloudflareClient.getConfiguredAccountId()

    // Get all Pages projects
    const projects = await this.cloudflareClient.getPagesProjects(accountId)
    const pages = projects.map(transformPagesProjectToPage)

    // Apply pagination
    const paginatedResult = PaginationHelper.paginate(pages, paginationParams)

    return WorkersResponseFormatter.success(
      paginatedResult,
      'Pages retrieved successfully'
    )
  }

  private async createPage(request: Request): Promise<Response> {
    const body = await request.json() as CreatePageRequest
    const { name } = body

    // Validate project name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw WorkersErrorHandler.createValidationError('Project name is required')
    }

    // Validate project name format (Cloudflare Pages naming rules)
    const projectNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/
    const trimmedName = name.trim().toLowerCase()

    if (trimmedName.length < 1 || trimmedName.length > 58) {
      throw WorkersErrorHandler.createValidationError('Project name must be between 1 and 58 characters')
    }

    if (!projectNameRegex.test(trimmedName)) {
      throw WorkersErrorHandler.createValidationError('Project name must contain only lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.')
    }

    // Use configured account ID
    const accountId = this.cloudflareClient.getConfiguredAccountId()

    // Check if project name already exists
    try {
      await this.cloudflareClient.getPagesProject(accountId, trimmedName)
      // If we get here, project already exists
      throw WorkersErrorHandler.createValidationError('A project with this name already exists')
    } catch (error: any) {
      // If it's a 404 error, that's good - project doesn't exist
      if (error.statusCode !== 404) {
        throw error
      }
    }

    // Create the project
    const project = await this.cloudflareClient.createPagesProject(accountId, trimmedName, {
      build_config: {
        destination_dir: '/',
        root_dir: '/'
      },
      production_branch: 'main'
    })

    const page = transformPagesProjectToPage(project)

    return WorkersResponseFormatter.success(
      page,
      'Page project created successfully'
    )
  }

  private async getPage(projectName: string): Promise<Response> {
    if (!projectName || typeof projectName !== 'string') {
      throw WorkersErrorHandler.createValidationError('Page project name is required')
    }

    // Use configured account ID
    const accountId = this.cloudflareClient.getConfiguredAccountId()

    // Get the specific project
    try {
      const project = await this.cloudflareClient.getPagesProject(accountId, projectName)
      const page = transformPagesProjectToPage(project)

      return WorkersResponseFormatter.success(
        page,
        'Page project retrieved successfully'
      )
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw WorkersErrorHandler.createValidationError('Page project not found')
      }
      throw error
    }
  }

  private async deployPage(request: Request, projectName: string): Promise<Response> {
    if (!projectName || typeof projectName !== 'string') {
      throw WorkersErrorHandler.createValidationError('Page project name is required')
    }

    const body = await request.json() as DeployPageRequest
    const { manifest } = body

    if (!manifest || typeof manifest !== 'object') {
      throw WorkersErrorHandler.createValidationError('Manifest is required')
    }

    // Use configured account ID
    const accountId = this.cloudflareClient.getConfiguredAccountId()

    // Create deployment with manifest
    const deployment = await this.cloudflareClient.createPagesDeploymentWithManifest(accountId, projectName, manifest)

    const result = transformDeploymentToResult(deployment)

    return WorkersResponseFormatter.success(
      result,
      'Deployment created successfully'
    )
  }

  private async getUploadUrl(projectName: string): Promise<Response> {
    if (!projectName || typeof projectName !== 'string') {
      throw WorkersErrorHandler.createValidationError('Page project name is required')
    }

    // Use configured account ID
    const accountId = this.cloudflareClient.getConfiguredAccountId()

    // Get upload JWT token
    const data = await this.cloudflareClient.createPagesDeploymentUploadJwt(accountId, projectName)

    return WorkersResponseFormatter.success(
      {
        jwt: data.jwt
      },
      'Upload URL generated successfully'
    )
  }

  private async getDeploymentStatus(projectName: string, deploymentId?: string | null): Promise<Response> {
    if (!projectName || typeof projectName !== 'string') {
      throw WorkersErrorHandler.createValidationError('Page project name is required')
    }

    // Use configured account ID
    const accountId = this.cloudflareClient.getConfiguredAccountId()

    let deployment
    if (deploymentId) {
      // Get specific deployment status using project name directly
      try {
        deployment = await this.cloudflareClient.getPagesDeployment(accountId, projectName, deploymentId)
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw WorkersErrorHandler.createValidationError('Deployment not found')
        }
        throw error
      }
    } else {
      // Get latest deployment - we need to fetch project info for this
      try {
        const project = await this.cloudflareClient.getPagesProject(accountId, projectName)
        if (!project.latest_deployment) {
          throw WorkersErrorHandler.createValidationError('No deployments found for this project')
        }
        deployment = project.latest_deployment
      } catch (error: any) {
        if (error.statusCode === 404) {
          throw WorkersErrorHandler.createValidationError('Page project not found')
        }
        throw error
      }
    }

    const deploymentStatus = transformDeploymentToStatus(deployment)

    return WorkersResponseFormatter.success(
      deploymentStatus,
      'Deployment status retrieved successfully'
    )
  }

  private async checkMissingAssets(request: Request): Promise<Response> {
    const body = await request.json() as CheckMissingAssetsRequest
    const { jwt, hashes } = body

    // Validate JWT token
    if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
      throw WorkersErrorHandler.createValidationError('JWT token is required')
    }

    // Validate hashes array
    if (!hashes || !Array.isArray(hashes)) {
      throw WorkersErrorHandler.createValidationError('Hashes array is required')
    }

    if (hashes.length === 0) {
      throw WorkersErrorHandler.createValidationError('At least one hash is required')
    }

    // Validate each hash is a string
    for (const hash of hashes) {
      if (typeof hash !== 'string' || hash.trim().length === 0) {
        throw WorkersErrorHandler.createValidationError('All hashes must be non-empty strings')
      }
    }

    // Call Cloudflare API through the client
    const result = await this.cloudflareClient.checkMissingAssets(jwt.trim(), hashes)

    return WorkersResponseFormatter.success(
      result,
      'Missing assets checked successfully'
    )
  }

  private async uploadAssets(request: Request): Promise<Response> {
    const body = await request.json() as AssetsUploadRequest
    const { jwt, payload } = body

    // Validate JWT token
    if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
      throw WorkersErrorHandler.createValidationError('JWT token is required')
    }

    // Validate payload array
    if (!payload || !Array.isArray(payload)) {
      throw WorkersErrorHandler.createValidationError('Payload array is required')
    }

    if (payload.length === 0) {
      throw WorkersErrorHandler.createValidationError('At least one upload payload is required')
    }

    // Validate each payload item
    for (const item of payload) {
      if (!item || typeof item !== 'object') {
        throw WorkersErrorHandler.createValidationError('Each payload item must be an object')
      }

      if (typeof item.base64 !== 'boolean') {
        throw WorkersErrorHandler.createValidationError('Payload item base64 field must be a boolean')
      }

      if (!item.key || typeof item.key !== 'string' || item.key.trim().length === 0) {
        throw WorkersErrorHandler.createValidationError('Payload item key must be a non-empty string')
      }

      if (!item.value || typeof item.value !== 'string' || item.value.trim().length === 0) {
        throw WorkersErrorHandler.createValidationError('Payload item value must be a non-empty string')
      }

      if (!item.metadata || typeof item.metadata !== 'object') {
        throw WorkersErrorHandler.createValidationError('Payload item metadata must be an object')
      }

      if (!item.metadata.contentType || typeof item.metadata.contentType !== 'string' || item.metadata.contentType.trim().length === 0) {
        throw WorkersErrorHandler.createValidationError('Payload item metadata.contentType must be a non-empty string')
      }
    }

    // Call Cloudflare API through the client
    const result = await this.cloudflareClient.uploadAssets(jwt.trim(), payload)

    return WorkersResponseFormatter.success(
      result,
      'Assets uploaded successfully'
    )
  }

  private async getProjectDomains(projectName: string): Promise<Response> {
    if (!projectName || typeof projectName !== 'string') {
      throw WorkersErrorHandler.createValidationError('Page project name is required')
    }

    // Use configured account ID
    const accountId = this.cloudflareClient.getConfiguredAccountId()

    // Get project domains
    const domains = await this.cloudflareClient.getPagesProjectDomains(accountId, projectName)

    return WorkersResponseFormatter.success(
      domains,
      'Project domains retrieved successfully'
    )
  }

  private async addProjectDomain(request: Request, projectName: string): Promise<Response> {
    if (!projectName || typeof projectName !== 'string') {
      throw WorkersErrorHandler.createValidationError('Page project name is required')
    }

    const body = await request.json() as { name: string }
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw WorkersErrorHandler.createValidationError('Domain name is required')
    }

    // Validate domain name format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    const trimmedName = name.trim().toLowerCase()

    if (!domainRegex.test(trimmedName)) {
      throw WorkersErrorHandler.createValidationError('Invalid domain name format')
    }

    // Use configured account ID
    const accountId = this.cloudflareClient.getConfiguredAccountId()

    // Add domain to project
    const domain = await this.cloudflareClient.addPagesProjectDomain(accountId, projectName, trimmedName)

    return WorkersResponseFormatter.success(
      domain,
      'Domain added to project successfully'
    )
  }

  private async deleteProjectDomain(projectName: string, domainName: string): Promise<Response> {
    if (!projectName || typeof projectName !== 'string') {
      throw WorkersErrorHandler.createValidationError('Page project name is required')
    }

    if (!domainName || typeof domainName !== 'string') {
      throw WorkersErrorHandler.createValidationError('Domain name is required')
    }

    // Use configured account ID
    const accountId = this.cloudflareClient.getConfiguredAccountId()

    // Delete domain from project
    await this.cloudflareClient.deletePagesProjectDomain(accountId, projectName, domainName)

    return WorkersResponseFormatter.success(
      null,
      'Domain deleted from project successfully'
    )
  }
}