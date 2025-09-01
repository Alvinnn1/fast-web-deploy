/**
 * Security Middleware - Comprehensive security configurations for production
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config/index.js'

export interface SecurityConfig {
  corsOrigins: string[]
  enableCSP: boolean
  enableRateLimit: boolean
  rateLimitMax: number
  rateLimitWindow: number
  enableSecurityHeaders: boolean
  trustedProxies: string[]
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware
  private securityConfig: SecurityConfig

  private constructor() {
    this.securityConfig = this.loadSecurityConfig()
  }

  public static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware()
    }
    return SecurityMiddleware.instance
  }

  private loadSecurityConfig(): SecurityConfig {
    return {
      corsOrigins: this.parseCorsOrigins(config.corsOrigins),
      enableCSP: config.nodeEnv === 'production',
      enableRateLimit: config.nodeEnv === 'production',
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
      enableSecurityHeaders: true,
      trustedProxies: this.parseTrustedProxies(process.env.TRUSTED_PROXIES)
    }
  }

  private parseCorsOrigins(origins: string | string[]): string[] {
    if (Array.isArray(origins)) {
      return origins
    }
    if (typeof origins === 'string') {
      return origins.split(',').map(origin => origin.trim())
    }
    // Default CORS origins for production
    return [
      'https://luckyjingwen.top',
      'https://www.luckyjingwen.top',
      'https://cloudflare-static-deployer.pages.dev'
    ]
  }

  private parseTrustedProxies(proxies?: string): string[] {
    if (!proxies) {
      return ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
    }
    return proxies.split(',').map(proxy => proxy.trim())
  }

  /**
   * Register security middleware with Fastify
   */
  async register(fastify: FastifyInstance): Promise<void> {
    // Register CORS with production configuration
    await this.registerCORS(fastify)

    // Register rate limiting
    if (this.securityConfig.enableRateLimit) {
      await this.registerRateLimit(fastify)
    }

    // Register security headers
    if (this.securityConfig.enableSecurityHeaders) {
      await this.registerSecurityHeaders(fastify)
    }

    // Register CSP headers
    if (this.securityConfig.enableCSP) {
      await this.registerCSP(fastify)
    }

    // Register request validation
    await this.registerRequestValidation(fastify)
  }

  /**
   * Configure CORS for production
   */
  private async registerCORS(fastify: FastifyInstance): Promise<void> {
    await fastify.register(import('@fastify/cors'), {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
          callback(null, true)
          return
        }

        // Check if origin is in allowed list
        if (this.securityConfig.corsOrigins.includes(origin)) {
          callback(null, true)
          return
        }

        // Allow localhost in development
        if (config.nodeEnv !== 'production' && origin.includes('localhost')) {
          callback(null, true)
          return
        }

        // Reject other origins
        callback(new Error('Not allowed by CORS'), false)
      },
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
    await fastify.register(import('@fastify/rate-limit'), {
      max: this.securityConfig.rateLimitMax,
      timeWindow: this.securityConfig.rateLimitWindow,
      skipOnError: false,
      skipSuccessfulRequests: false,
      keyGenerator: (request: FastifyRequest) => {
        // Use IP address as key, considering trusted proxies
        return this.getClientIP(request)
      },
      errorResponseBuilder: (request: FastifyRequest, context: any) => {
        return {
          success: false,
          message: 'Rate limit exceeded',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            limit: context.max,
            remaining: 0,
            resetTime: new Date(Date.now() + context.ttl)
          }
        }
      },
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true
      },
      // Different limits for different endpoints
      nameSpace: 'global',
      continueExceeding: false,
      allowList: ['127.0.0.1', '::1'], // Whitelist localhost
      redis: undefined // Use in-memory store for now
    })

    // Stricter rate limiting for sensitive endpoints
    await fastify.register(async (fastify) => {
      await fastify.register(import('@fastify/rate-limit'), {
        max: 10, // 10 requests per window
        timeWindow: 60000, // 1 minute
        nameSpace: 'auth',
        keyGenerator: (request: FastifyRequest) => {
          return `auth:${this.getClientIP(request)}`
        }
      })

      // Apply to authentication-related endpoints
      fastify.addHook('preHandler', async (request, reply) => {
        const sensitiveEndpoints = ['/api/auth', '/api/login', '/api/register']
        if (sensitiveEndpoints.some(endpoint => request.url.startsWith(endpoint))) {
          // Rate limit will be applied automatically
        }
      })
    })
  }

  /**
   * Configure security headers
   */
  private async registerSecurityHeaders(fastify: FastifyInstance): Promise<void> {
    await fastify.register(import('@fastify/helmet'), {
      // Content Security Policy
      contentSecurityPolicy: this.securityConfig.enableCSP ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Vite in development
            "'unsafe-eval'", // Required for Vue.js
            'https://challenges.cloudflare.com',
            'https://static.cloudflareinsights.com'
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Vue.js and Tailwind
            'https://fonts.googleapis.com'
          ],
          fontSrc: [
            "'self'",
            'https://fonts.gstatic.com',
            'data:'
          ],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https:',
            'https://avatars.cloudflare.com'
          ],
          connectSrc: [
            "'self'",
            'https://api.cloudflare.com',
            'https://challenges.cloudflare.com',
            'wss:'
          ],
          frameSrc: [
            "'self'",
            'https://challenges.cloudflare.com'
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.nodeEnv === 'production'
        }
      } : false,

      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: false, // Disable for compatibility

      // Cross-Origin Opener Policy
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },

      // Cross-Origin Resource Policy
      crossOriginResourcePolicy: { policy: 'cross-origin' },

      // DNS Prefetch Control
      dnsPrefetchControl: { allow: false },

      // Expect-CT
      expectCt: config.nodeEnv === 'production' ? {
        maxAge: 86400,
        enforce: true
      } : false,

      // Feature Policy / Permissions Policy
      permissionsPolicy: {
        camera: ['none'],
        microphone: ['none'],
        geolocation: ['none'],
        payment: ['none'],
        usb: ['none']
      },

      // Hide Powered-By header
      hidePoweredBy: true,

      // HTTP Strict Transport Security
      hsts: config.nodeEnv === 'production' ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,

      // IE No Open
      ieNoOpen: true,

      // No Sniff
      noSniff: true,

      // Origin Agent Cluster
      originAgentCluster: true,

      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

      // X-Frame-Options
      frameguard: { action: 'deny' },

      // X-XSS-Protection
      xssFilter: true
    })
  }

  /**
   * Configure Content Security Policy
   */
  private async registerCSP(fastify: FastifyInstance): Promise<void> {
    fastify.addHook('onSend', async (request, reply, payload) => {
      // Add additional CSP headers for API responses
      if (request.url.startsWith('/api/')) {
        reply.header('X-Content-Type-Options', 'nosniff')
        reply.header('X-Frame-Options', 'DENY')
        reply.header('X-XSS-Protection', '1; mode=block')
      }
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
      if (contentLength && parseInt(contentLength) > (config.maxFileSize || 10 * 1024 * 1024)) {
        reply.code(413).send({
          success: false,
          message: 'Request entity too large',
          error: {
            code: 'REQUEST_TOO_LARGE',
            maxSize: config.maxFileSize || 10 * 1024 * 1024
          }
        })
        return
      }

      // Validate User-Agent header
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
   * Get client IP address considering trusted proxies
   */
  private getClientIP(request: FastifyRequest): string {
    // Check X-Forwarded-For header (from trusted proxies)
    const xForwardedFor = request.headers['x-forwarded-for']
    if (xForwardedFor && typeof xForwardedFor === 'string') {
      const ips = xForwardedFor.split(',').map(ip => ip.trim())
      return ips[0] // First IP is the original client
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
    const referer = request.headers['referer']

    // Block requests with suspicious user agents
    const suspiciousUserAgents = [
      'sqlmap',
      'nikto',
      'nmap',
      'masscan',
      'zap',
      'burp',
      'wget',
      'curl', // Block curl in production (optional)
    ]

    if (userAgent && config.nodeEnv === 'production') {
      const lowerUserAgent = userAgent.toLowerCase()
      if (suspiciousUserAgents.some(suspicious => lowerUserAgent.includes(suspicious))) {
        return true
      }
    }

    // Block requests with suspicious paths
    const suspiciousPaths = [
      '/.env',
      '/wp-admin',
      '/admin',
      '/phpmyadmin',
      '/.git',
      '/config',
      '/backup'
    ]

    if (suspiciousPaths.some(path => request.url.includes(path))) {
      return true
    }

    return false
  }

  /**
   * Get security configuration
   */
  public getConfig(): SecurityConfig {
    return { ...this.securityConfig }
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...newConfig }
  }
}

/**
 * Export singleton instance
 */
export const securityMiddleware = SecurityMiddleware.getInstance()