/**
 * Simplified Security Middleware - Basic security configurations for production
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config/index.js'

interface RateLimitEntry {
  count: number
  resetTime: number
}

export class SimpleSecurityMiddleware {
  private static instance: SimpleSecurityMiddleware
  private rateLimitStore: Map<string, RateLimitEntry> = new Map()

  private constructor() {
    // Clean up rate limit store every 5 minutes
    setInterval(() => this.cleanupRateLimit(), 5 * 60 * 1000)
  }

  public static getInstance(): SimpleSecurityMiddleware {
    if (!SimpleSecurityMiddleware.instance) {
      SimpleSecurityMiddleware.instance = new SimpleSecurityMiddleware()
    }
    return SimpleSecurityMiddleware.instance
  }

  /**
   * Register security middleware with Fastify
   */
  async register(fastify: FastifyInstance): Promise<void> {
    // Register CORS
    await this.registerCORS(fastify)

    // Register rate limiting
    if (config.nodeEnv === 'production') {
      await this.registerRateLimit(fastify)
    }

    // Register security headers
    await this.registerSecurityHeaders(fastify)

    // Register request validation
    await this.registerRequestValidation(fastify)
  }

  /**
   * Configure CORS
   */
  private async registerCORS(fastify: FastifyInstance): Promise<void> {
    await fastify.register(import('@fastify/cors'), {
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Client-Version'
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ],
      maxAge: 86400 // 24 hours
    })
  }

  /**
   * Configure rate limiting
   */
  private async registerRateLimit(fastify: FastifyInstance): Promise<void> {
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      const clientIP = this.getClientIP(request)
      const now = Date.now()

      // Check if IP is whitelisted
      if (['127.0.0.1', '::1'].includes(clientIP)) {
        return
      }

      const key = `rate_limit:${clientIP}`
      let entry = this.rateLimitStore.get(key)

      // Initialize or reset if window expired
      if (!entry || now > entry.resetTime) {
        entry = {
          count: 0,
          resetTime: now + config.rateLimitWindow
        }
      }

      // Check if limit exceeded
      if (entry.count >= config.rateLimitMax) {
        reply.code(429)
        reply.header('X-RateLimit-Limit', config.rateLimitMax)
        reply.header('X-RateLimit-Remaining', 0)
        reply.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000))

        return reply.send({
          success: false,
          message: 'Rate limit exceeded',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            limit: config.rateLimitMax,
            remaining: 0,
            resetTime: new Date(entry.resetTime)
          }
        })
      }

      // Increment counter
      entry.count++
      this.rateLimitStore.set(key, entry)

      // Add rate limit headers
      reply.header('X-RateLimit-Limit', config.rateLimitMax)
      reply.header('X-RateLimit-Remaining', config.rateLimitMax - entry.count)
      reply.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000))
    })
  }

  /**
   * Configure security headers
   */
  private async registerSecurityHeaders(fastify: FastifyInstance): Promise<void> {
    fastify.addHook('onSend', async (_request: FastifyRequest, reply: FastifyReply, payload) => {
      // Basic security headers
      reply.header('X-Content-Type-Options', 'nosniff')
      reply.header('X-Frame-Options', 'DENY')
      reply.header('X-XSS-Protection', '1; mode=block')
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')

      // Production-only headers
      if (config.nodeEnv === 'production') {
        reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
      }

      // Permissions Policy
      const permissionsPolicy = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()'
      ].join(', ')
      reply.header('Permissions-Policy', permissionsPolicy)

      // Cross-Origin policies
      reply.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin')

      // Content Security Policy for production
      if (config.nodeEnv === 'production') {
        const cspDirectives = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://api.cloudflare.com wss:",
          "frame-src 'self' https://challenges.cloudflare.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests"
        ]

        reply.header('Content-Security-Policy', cspDirectives.join('; '))
      }

      // Remove server information
      reply.removeHeader('Server')
      reply.removeHeader('X-Powered-By')

      return payload
    })
  }

  /**
   * Configure request validation
   */
  private async registerRequestValidation(fastify: FastifyInstance): Promise<void> {
    fastify.addHook('preHandler', async (request, reply) => {
      // Validate request size
      const contentLength = request.headers['content-length']
      if (contentLength && parseInt(contentLength) > config.maxFileSize) {
        reply.code(413).send({
          success: false,
          message: 'Request entity too large',
          error: {
            code: 'REQUEST_TOO_LARGE',
            maxSize: config.maxFileSize
          }
        })
        return
      }

      // Validate User-Agent header in production
      const userAgent = request.headers['user-agent']
      if (!userAgent && config.nodeEnv === 'production') {
        reply.code(400).send({
          success: false,
          message: 'User-Agent header is required',
          error: {
            code: 'MISSING_USER_AGENT'
          }
        })
        return
      }

      // Block suspicious requests
      if (this.isSuspiciousRequest(request)) {
        reply.code(403).send({
          success: false,
          message: 'Request blocked',
          error: {
            code: 'REQUEST_BLOCKED'
          }
        })
        return
      }
    })
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: FastifyRequest): string {
    // Check X-Forwarded-For header
    const xForwardedFor = request.headers['x-forwarded-for']
    if (xForwardedFor && typeof xForwardedFor === 'string') {
      const ips = xForwardedFor.split(',').map(ip => ip.trim())
      return ips[0] || '127.0.0.1'
    }

    // Check X-Real-IP header
    const xRealIP = request.headers['x-real-ip']
    if (xRealIP && typeof xRealIP === 'string') {
      return xRealIP
    }

    // Check CF-Connecting-IP header (Cloudflare)
    const cfConnectingIP = request.headers['cf-connecting-ip']
    if (cfConnectingIP && typeof cfConnectingIP === 'string') {
      return cfConnectingIP
    }

    // Fallback to socket remote address
    return request.socket.remoteAddress || '127.0.0.1'
  }

  /**
   * Check if request is suspicious
   */
  private isSuspiciousRequest(request: FastifyRequest): boolean {
    const userAgent = request.headers['user-agent']

    // Block requests with suspicious user agents
    const suspiciousUserAgents = [
      'sqlmap', 'nikto', 'nmap', 'masscan', 'zap', 'burp'
    ]

    if (userAgent && config.nodeEnv === 'production') {
      const lowerUserAgent = userAgent.toLowerCase()
      if (suspiciousUserAgents.some(suspicious => lowerUserAgent.includes(suspicious))) {
        return true
      }
    }

    // Block requests with suspicious paths
    const suspiciousPaths = [
      '/.env', '/.git', '/wp-admin', '/admin', '/phpmyadmin', '/config', '/backup'
    ]

    if (suspiciousPaths.some(path => request.url.includes(path))) {
      return true
    }

    return false
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimit(): void {
    const now = Date.now()
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }
  }
}

/**
 * Export singleton instance
 */
export const simpleSecurityMiddleware = SimpleSecurityMiddleware.getInstance()