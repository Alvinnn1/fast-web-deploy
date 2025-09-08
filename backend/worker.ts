/**
 * Cloudflare Workers Entry Point
 * 
 * This file serves as the main entry point for the Cloudflare Workers deployment.
 * It adapts the Fastify-based backend to work in the Workers environment.
 */

import { WorkersRouter } from './src/adapters/workers-router.js'

// Define Env interface for Workers
export interface Env {
  CLOUDFLARE_API_TOKEN: string
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_EMAIL: string
  CORS_ORIGINS: string
  NODE_ENV: string
  LOG_LEVEL?: string
  MAX_FILE_SIZE?: string
  ALLOWED_FILE_TYPES?: string
  RATE_LIMIT_MAX?: string
  RATE_LIMIT_WINDOW?: string
  TRUSTED_PROXIES?: string
  BLOCKED_IPS?: string
  ALLOWED_IPS?: string
  ENABLE_SECURITY_HEADERS?: string
  ENABLE_CSP?: string
  ENABLE_RATE_LIMITING?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const router = new WorkersRouter(env)

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return router.handleCors(request)
      }

      // Route the request with timeout
      const response = await Promise.race([
        router.route(request),
        new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        })
      ])

      // Add CORS headers to the response
      return router.addCorsHeaders(response, request)
    } catch (error) {
      console.error('Worker error:', error)

      // Determine error type and status
      let status = 500
      let message = 'Internal server error'

      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          status = 504
          message = 'Request timeout'
        } else if (error.message.includes('Configuration validation failed')) {
          status = 500
          message = 'Service configuration error'
        }
      }

      // Return appropriate error response
      const errorResponse = new Response(
        JSON.stringify({
          success: false,
          message,
          error: {
            code: status === 504 ? 'REQUEST_TIMEOUT' : 'WORKER_ERROR',
            timestamp: new Date().toISOString()
          }
        }),
        {
          status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
          }
        }
      )

      return errorResponse
    }
  }
}

// Env interface is already exported above