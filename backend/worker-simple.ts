/**
 * Simplified Cloudflare Workers Entry Point
 */

interface Env {
  CLOUDFLARE_API_TOKEN: string
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_EMAIL: string
  CORS_ORIGINS: string
  NODE_ENV: string
}

// CORS origins configuration
const getCorsOrigins = (env: Env): string[] => {
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  }
  return ['https://luckyjingwen.top', 'https://www.luckyjingwen.top']
}

// Add CORS headers
const addCorsHeaders = (response: Response, request: Request, corsOrigins: string[]): Response => {
  const origin = request.headers.get('Origin')
  const allowedOrigin = origin && corsOrigins.includes(origin) ? origin : corsOrigins[0]

  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', allowedOrigin)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  headers.set('Access-Control-Max-Age', '86400')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

// Add security headers
const addSecurityHeaders = (response: Response): Response => {
  const headers = new Headers(response.headers)

  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')

  // Remove server information
  headers.delete('Server')
  headers.delete('X-Powered-By')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

// Handle CORS preflight
const handleCors = (request: Request, corsOrigins: string[]): Response => {
  const origin = request.headers.get('Origin')
  const allowedOrigin = origin && corsOrigins.includes(origin) ? origin : corsOrigins[0]

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400'
    }
  })
}

// Create JSON response
const jsonResponse = (data: any, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const corsOrigins = getCorsOrigins(env)
      const url = new URL(request.url)
      const method = request.method
      const pathname = url.pathname

      // Handle CORS preflight requests
      if (method === 'OPTIONS') {
        return addSecurityHeaders(handleCors(request, corsOrigins))
      }

      let response: Response

      // Health check endpoint
      if (pathname === '/health' && method === 'GET') {
        response = jsonResponse({
          success: true,
          data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: env.NODE_ENV || 'production',
            version: '1.0.0'
          },
          message: 'Service is healthy'
        })
      }
      // API test endpoint
      else if (pathname === '/api/test' && method === 'GET') {
        response = jsonResponse({
          success: true,
          data: { message: 'Backend API is working!' },
          message: 'API test successful'
        })
      }
      // 404 for unknown routes
      else {
        response = jsonResponse({
          success: false,
          message: 'API endpoint not found',
          error: {
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString()
          }
        }, 404)
      }

      // Add security headers and CORS
      response = addSecurityHeaders(response)
      response = addCorsHeaders(response, request, corsOrigins)

      return response

    } catch (error) {
      console.error('Worker error:', error)

      const errorResponse = jsonResponse({
        success: false,
        message: 'Internal server error',
        error: {
          code: 'WORKER_ERROR',
          timestamp: new Date().toISOString()
        }
      }, 500)

      return addSecurityHeaders(errorResponse)
    }
  }
}

export { Env }