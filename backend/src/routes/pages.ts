import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { cloudflareClient } from '../services/cloudflare-client.js'
import { ResponseFormatter, ErrorHandler } from '../utils/index.js'
import { CreatePageRequest, Page, DeploymentResult, DeploymentStatus, CheckMissingAssetsRequest, AssetsUploadRequest, DeployPageRequest } from '../types.js'

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

export async function pagesRoutes(fastify: FastifyInstance) {
  // GET /api/pages - Get all pages
  fastify.get('/api/pages', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Use configured account ID (no API call needed)
      const accountId = cloudflareClient.getConfiguredAccountId()

      // Get all Pages projects
      const projects = await cloudflareClient.getPagesProjects(accountId)
      const pages = projects.map(transformPagesProjectToPage)

      return ResponseFormatter.success(
        pages,
        'Pages retrieved successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // POST /api/pages - Create new page project
  fastify.post<{ Body: CreatePageRequest }>('/api/pages', async (request: FastifyRequest<{ Body: CreatePageRequest }>, reply: FastifyReply) => {
    try {
      const { name } = request.body

      // Validate project name
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw ErrorHandler.createValidationError('Project name is required')
      }

      // Validate project name format (Cloudflare Pages naming rules)
      const projectNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/
      const trimmedName = name.trim().toLowerCase()

      if (trimmedName.length < 1 || trimmedName.length > 58) {
        throw ErrorHandler.createValidationError('Project name must be between 1 and 58 characters')
      }

      if (!projectNameRegex.test(trimmedName)) {
        throw ErrorHandler.createValidationError('Project name must contain only lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.')
      }

      // Use configured account ID
      const accountId = cloudflareClient.getConfiguredAccountId()

      // Check if project name already exists
      try {
        await cloudflareClient.getPagesProject(accountId, trimmedName)
        // If we get here, project already exists
        throw ErrorHandler.createValidationError('A project with this name already exists')
      } catch (error: any) {
        // If it's a 404 error, that's good - project doesn't exist
        if (error.statusCode !== 404) {
          throw error
        }
      }

      // Create the project
      const project = await cloudflareClient.createPagesProject(accountId, trimmedName, {
        build_config: {
          destination_dir: '/',
          root_dir: '/'
        },
        production_branch: 'main'
      })

      const page = transformPagesProjectToPage(project)

      return ResponseFormatter.success(
        page,
        'Page project created successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  fastify.post<{ Params: { projectName: string }; Body: DeployPageRequest }>('/api/pages/:projectName/deploy', async (request: FastifyRequest<{ Params: { projectName: string }; Body: DeployPageRequest }>, reply: FastifyReply) => {
    try {
      const { projectName } = request.params
      const { manifest } = request.body

      if (!projectName || typeof projectName !== 'string') {
        throw ErrorHandler.createValidationError('Page project name is required')
      }

      if (!manifest || typeof manifest !== 'object') {
        throw ErrorHandler.createValidationError('Manifest is required')
      }

      // Use configured account ID
      const accountId = cloudflareClient.getConfiguredAccountId()

      // Create deployment with manifest
      const deployment = await cloudflareClient.createPagesDeploymentWithManifest(accountId, projectName, manifest)

      const result = transformDeploymentToResult(deployment)

      return ResponseFormatter.success(
        result,
        'Deployment created successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // GET /api/pages/:projectName/upload-url - Get direct upload URL
  fastify.get<{ Params: { projectName: string } }>('/api/pages/:projectName/upload-url', async (request: FastifyRequest<{ Params: { projectName: string } }>, reply: FastifyReply) => {
    try {
      const { projectName } = request.params

      if (!projectName || typeof projectName !== 'string') {
        throw ErrorHandler.createValidationError('Page project name is required')
      }

      // Use configured account ID
      const accountId = cloudflareClient.getConfiguredAccountId()

      // No need to verify project exists since we have the project name directly
      // This saves an API call to Cloudflare

      // For now, return our own upload endpoint as a fallback
      // This allows the frontend to work while we perfect the direct upload
      const data = await cloudflareClient.createPagesDeploymentUploadJwt(accountId, projectName)

      return ResponseFormatter.success(
        {
          jwt: data.jwt
        },
        'Upload URL generated successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })


  // GET /api/pages/:projectName/deployment-status - Get deployment status
  fastify.get<{ Params: { projectName: string }; Querystring: { deploymentId?: string } }>('/api/pages/:projectName/deployment-status', async (request: FastifyRequest<{ Params: { projectName: string }; Querystring: { deploymentId?: string } }>, reply: FastifyReply) => {
    try {
      const { projectName } = request.params
      const { deploymentId } = request.query

      if (!projectName || typeof projectName !== 'string') {
        throw ErrorHandler.createValidationError('Page project name is required')
      }

      // Use configured account ID
      const accountId = cloudflareClient.getConfiguredAccountId()

      let deployment
      if (deploymentId) {
        // Get specific deployment status using project name directly
        try {
          deployment = await cloudflareClient.getPagesDeployment(accountId, projectName, deploymentId)
        } catch (error: any) {
          if (error.statusCode === 404) {
            throw ErrorHandler.createValidationError('Deployment not found')
          }
          throw error
        }
      } else {
        // Get latest deployment - we need to fetch project info for this
        try {
          const project = await cloudflareClient.getPagesProject(accountId, projectName)
          if (!project.latest_deployment) {
            throw ErrorHandler.createValidationError('No deployments found for this project')
          }
          deployment = project.latest_deployment
        } catch (error: any) {
          if (error.statusCode === 404) {
            throw ErrorHandler.createValidationError('Page project not found')
          }
          throw error
        }
      }

      const deploymentStatus = transformDeploymentToStatus(deployment)

      return ResponseFormatter.success(
        deploymentStatus,
        'Deployment status retrieved successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // POST /api/pages/assets/check-missing - Proxy for checking missing assets
  fastify.post<{ Body: CheckMissingAssetsRequest }>('/api/pages/assets/check-missing', async (request: FastifyRequest<{ Body: CheckMissingAssetsRequest }>, reply: FastifyReply) => {
    try {
      const { jwt, hashes } = request.body

      // Validate JWT token
      if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
        throw ErrorHandler.createValidationError('JWT token is required')
      }

      // Validate hashes array
      if (!hashes || !Array.isArray(hashes)) {
        throw ErrorHandler.createValidationError('Hashes array is required')
      }

      if (hashes.length === 0) {
        throw ErrorHandler.createValidationError('At least one hash is required')
      }

      // Validate each hash is a string
      for (const hash of hashes) {
        if (typeof hash !== 'string' || hash.trim().length === 0) {
          throw ErrorHandler.createValidationError('All hashes must be non-empty strings')
        }
      }

      // Call Cloudflare API through the client
      const result = await cloudflareClient.checkMissingAssets(jwt.trim(), hashes)

      return ResponseFormatter.success(
        result,
        'Missing assets checked successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // POST /api/pages/assets/upload - Proxy for uploading assets
  fastify.post<{ Body: AssetsUploadRequest }>('/api/pages/assets/upload', async (request: FastifyRequest<{ Body: AssetsUploadRequest }>, reply: FastifyReply) => {
    try {
      const { jwt, payload } = request.body

      // Validate JWT token
      if (!jwt || typeof jwt !== 'string' || jwt.trim().length === 0) {
        throw ErrorHandler.createValidationError('JWT token is required')
      }

      // Validate payload array
      if (!payload || !Array.isArray(payload)) {
        throw ErrorHandler.createValidationError('Payload array is required')
      }

      if (payload.length === 0) {
        throw ErrorHandler.createValidationError('At least one upload payload is required')
      }

      // Validate each payload item
      for (const item of payload) {
        if (!item || typeof item !== 'object') {
          throw ErrorHandler.createValidationError('Each payload item must be an object')
        }

        if (typeof item.base64 !== 'boolean') {
          throw ErrorHandler.createValidationError('Payload item base64 field must be a boolean')
        }

        if (!item.key || typeof item.key !== 'string' || item.key.trim().length === 0) {
          throw ErrorHandler.createValidationError('Payload item key must be a non-empty string')
        }

        if (!item.value || typeof item.value !== 'string' || item.value.trim().length === 0) {
          throw ErrorHandler.createValidationError('Payload item value must be a non-empty string')
        }

        if (!item.metadata || typeof item.metadata !== 'object') {
          throw ErrorHandler.createValidationError('Payload item metadata must be an object')
        }

        if (!item.metadata.contentType || typeof item.metadata.contentType !== 'string' || item.metadata.contentType.trim().length === 0) {
          throw ErrorHandler.createValidationError('Payload item metadata.contentType must be a non-empty string')
        }
      }

      // Call Cloudflare API through the client
      const result = await cloudflareClient.uploadAssets(jwt.trim(), payload)

      return ResponseFormatter.success(
        result,
        'Assets uploaded successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // GET /api/pages/:projectName/domains - Get project domains
  fastify.get<{ Params: { projectName: string } }>('/api/pages/:projectName/domains', async (request: FastifyRequest<{ Params: { projectName: string } }>, reply: FastifyReply) => {
    try {
      const { projectName } = request.params

      if (!projectName || typeof projectName !== 'string') {
        throw ErrorHandler.createValidationError('Page project name is required')
      }

      // Use configured account ID
      const accountId = cloudflareClient.getConfiguredAccountId()

      // Get project domains
      const domains = await cloudflareClient.getPagesProjectDomains(accountId, projectName)

      return ResponseFormatter.success(
        domains,
        'Project domains retrieved successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // POST /api/pages/:projectName/domains - Add domain to project
  fastify.post<{ Params: { projectName: string }; Body: { name: string } }>('/api/pages/:projectName/domains', async (request: FastifyRequest<{ Params: { projectName: string }; Body: { name: string } }>, reply: FastifyReply) => {
    try {
      const { projectName } = request.params
      const { name } = request.body

      if (!projectName || typeof projectName !== 'string') {
        throw ErrorHandler.createValidationError('Page project name is required')
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw ErrorHandler.createValidationError('Domain name is required')
      }

      // Validate domain name format
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      const trimmedName = name.trim().toLowerCase()

      if (!domainRegex.test(trimmedName)) {
        throw ErrorHandler.createValidationError('Invalid domain name format')
      }

      // Use configured account ID
      const accountId = cloudflareClient.getConfiguredAccountId()

      // Add domain to project
      const domain = await cloudflareClient.addPagesProjectDomain(accountId, projectName, trimmedName)

      return ResponseFormatter.success(
        domain,
        'Domain added to project successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // DELETE /api/pages/:projectName/domains/:domainName - Delete domain from project
  fastify.delete<{ Params: { projectName: string; domainName: string } }>('/api/pages/:projectName/domains/:domainName', async (request: FastifyRequest<{ Params: { projectName: string; domainName: string } }>, reply: FastifyReply) => {
    try {
      const { projectName, domainName } = request.params

      if (!projectName || typeof projectName !== 'string') {
        throw ErrorHandler.createValidationError('Page project name is required')
      }

      if (!domainName || typeof domainName !== 'string') {
        throw ErrorHandler.createValidationError('Domain name is required')
      }

      // Use configured account ID
      const accountId = cloudflareClient.getConfiguredAccountId()

      // Delete domain from project
      await cloudflareClient.deletePagesProjectDomain(accountId, projectName, domainName)

      return ResponseFormatter.success(
        null,
        'Domain deleted from project successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })
}