import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { config } from './config/index.js'
import { errorMiddleware } from './middleware/error-middleware.js'
import { simpleSecurityMiddleware } from './middleware/security-middleware-simple.js'
import { ResponseFormatter, ErrorHandler } from './utils/index.js'
import { domainsRoutes } from './routes/domains.js'
import { pagesRoutes } from './routes/pages.js'
import { monitoringRoutes } from './routes/monitoring.js'
import { healthCheckService } from './services/health-check.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const fastify = Fastify({
  logger: {
    level: config.logLevel || 'info'
  }
})

// Register error handling middleware
await fastify.register(errorMiddleware)

// Register security middleware (includes CORS, rate limiting, security headers)
await simpleSecurityMiddleware.register(fastify)

await fastify.register(multipart, {
  limits: {
    fileSize: config.maxFileSize || 10 * 1024 * 1024 // 10MB limit
  }
})

// Serve static files in production
if (config.nodeEnv === 'production') {
  // Serve static frontend files
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/'
  })

  // SPA fallback - serve index.html for non-API routes
  fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      reply.code(404).send({ error: 'API endpoint not found' })
    } else {
      reply.sendFile('index.html')
    }
  })
}

// Enhanced health check route
fastify.get('/health', async (_request, reply) => {
  try {
    const healthResult = await healthCheckService.performHealthCheck()

    // Set appropriate HTTP status based on health
    let statusCode = 200
    if (healthResult.status === 'degraded') {
      statusCode = 200 // Still OK, but with warnings
    } else if (healthResult.status === 'unhealthy') {
      statusCode = 503 // Service Unavailable
    }

    reply.code(statusCode)
    return ResponseFormatter.success(healthResult, 'Health check completed')
  } catch (error) {
    reply.code(503)
    return ResponseFormatter.error(
      'Health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
})

// Simple health check for load balancers
fastify.get('/health/simple', async () => {
  return healthCheckService.getSimpleHealthCheck()
})

// API routes placeholder
fastify.get('/api/test', async () => {
  return ResponseFormatter.success(
    { message: 'Backend API is working!' },
    'API test successful'
  )
})

// Test error handling route
fastify.get('/api/test-error', async () => {
  throw ErrorHandler.createValidationError('This is a test validation error')
})

// Register domain routes
await fastify.register(domainsRoutes)

// Register pages routes
await fastify.register(pagesRoutes)

// Register monitoring routes
await fastify.register(monitoringRoutes)

// Start server
const start = async (): Promise<void> => {
  try {
    await fastify.listen({
      port: config.port,
      host: config.host
    })
    console.log(`Server listening on http://${config.host}:${config.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()