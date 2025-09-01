/**
 * Workers Rate Limiter - Advanced rate limiting for Cloudflare Workers
 */

export interface RateLimitConfig {
  max: number
  window: number
  keyPrefix?: string
  skipSuccessful?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  totalHits: number
}

export class WorkersRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map()
  private cleanupInterval: number = 60000 // 1 minute

  constructor() {
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), this.cleanupInterval)
  }

  /**
   * Check rate limit for a given key
   */
  async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now()
    const rateLimitKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key

    // Get current state
    let state = this.store.get(rateLimitKey)

    // Initialize or reset if window expired
    if (!state || state.resetTime <= now) {
      state = {
        count: 0,
        resetTime: now + config.window
      }
    }

    // Check if limit exceeded
    const allowed = state.count < config.max

    if (allowed) {
      state.count++
      this.store.set(rateLimitKey, state)
    }

    return {
      allowed,
      remaining: Math.max(0, config.max - state.count),
      resetTime: state.resetTime,
      totalHits: state.count
    }
  }

  /**
   * Global rate limiting
   */
  async globalRateLimit(key: string): Promise<RateLimitResult> {
    return this.checkRateLimit(key, {
      max: 100,
      window: 900000, // 15 minutes
      keyPrefix: 'global'
    })
  }

  /**
   * Strict rate limiting for sensitive endpoints
   */
  async strictRateLimit(key: string): Promise<RateLimitResult> {
    return this.checkRateLimit(key, {
      max: 10,
      window: 60000, // 1 minute
      keyPrefix: 'strict'
    })
  }

  /**
   * API endpoint specific rate limiting
   */
  async apiRateLimit(key: string, endpoint: string): Promise<RateLimitResult> {
    const limits = this.getEndpointLimits(endpoint)
    return this.checkRateLimit(key, {
      max: limits.max,
      window: limits.window,
      keyPrefix: `api:${endpoint}`
    })
  }

  /**
   * Burst rate limiting (short window, high limit)
   */
  async burstRateLimit(key: string): Promise<RateLimitResult> {
    return this.checkRateLimit(key, {
      max: 20,
      window: 10000, // 10 seconds
      keyPrefix: 'burst'
    })
  }

  /**
   * Get rate limits for specific endpoints
   */
  private getEndpointLimits(endpoint: string): { max: number; window: number } {
    const endpointLimits: Record<string, { max: number; window: number }> = {
      // Domain management endpoints
      '/api/domains': { max: 30, window: 300000 }, // 30 requests per 5 minutes
      '/api/domains/create': { max: 5, window: 300000 }, // 5 creates per 5 minutes
      '/api/domains/delete': { max: 10, window: 300000 }, // 10 deletes per 5 minutes

      // Pages management endpoints
      '/api/pages': { max: 50, window: 300000 }, // 50 requests per 5 minutes
      '/api/pages/deploy': { max: 10, window: 600000 }, // 10 deploys per 10 minutes
      '/api/pages/upload': { max: 5, window: 300000 }, // 5 uploads per 5 minutes

      // DNS management endpoints
      '/api/dns': { max: 20, window: 300000 }, // 20 requests per 5 minutes
      '/api/dns/records': { max: 30, window: 300000 }, // 30 requests per 5 minutes

      // Health and monitoring
      '/health': { max: 100, window: 60000 }, // 100 requests per minute
      '/api/test': { max: 50, window: 60000 }, // 50 requests per minute

      // Default limits
      'default': { max: 60, window: 300000 } // 60 requests per 5 minutes
    }

    return endpointLimits[endpoint] || endpointLimits['default']!
  }

  /**
   * Check multiple rate limits at once
   */
  async checkMultipleRateLimits(
    key: string,
    checks: Array<{ name: string; config: RateLimitConfig }>
  ): Promise<Record<string, RateLimitResult>> {
    const results: Record<string, RateLimitResult> = {}

    for (const check of checks) {
      results[check.name] = await this.checkRateLimit(key, check.config)
    }

    return results
  }

  /**
   * Get comprehensive rate limit status
   */
  async getRateLimitStatus(key: string, endpoint: string): Promise<{
    global: RateLimitResult
    strict: RateLimitResult
    api: RateLimitResult
    burst: RateLimitResult
    allowed: boolean
  }> {
    const [global, strict, api, burst] = await Promise.all([
      this.globalRateLimit(key),
      this.strictRateLimit(key),
      this.apiRateLimit(key, endpoint),
      this.burstRateLimit(key)
    ])

    return {
      global,
      strict,
      api,
      burst,
      allowed: global.allowed && strict.allowed && api.allowed && burst.allowed
    }
  }

  /**
   * Reset rate limit for a key
   */
  resetRateLimit(key: string, prefix?: string): void {
    const rateLimitKey = prefix ? `${prefix}:${key}` : key
    this.store.delete(rateLimitKey)
  }

  /**
   * Reset all rate limits for a key (all prefixes)
   */
  resetAllRateLimits(key: string): void {
    const keysToDelete: string[] = []

    for (const storeKey of this.store.keys()) {
      if (storeKey.endsWith(`:${key}`) || storeKey === key) {
        keysToDelete.push(storeKey)
      }
    }

    keysToDelete.forEach(k => this.store.delete(k))
  }

  /**
   * Get current rate limit stats
   */
  getRateLimitStats(): {
    totalKeys: number
    activeKeys: number
    memoryUsage: number
  } {
    const now = Date.now()
    let activeKeys = 0

    for (const state of this.store.values()) {
      if (state.resetTime > now) {
        activeKeys++
      }
    }

    return {
      totalKeys: this.store.size,
      activeKeys,
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, state] of this.store.entries()) {
      if (state.resetTime <= now) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.store.delete(key))

    if (keysToDelete.length > 0) {
      console.log(`[RateLimiter] Cleaned up ${keysToDelete.length} expired entries`)
    }
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: each entry ~100 bytes (key + state object)
    return this.store.size * 100
  }

  /**
   * Configure cleanup interval
   */
  setCleanupInterval(interval: number): void {
    this.cleanupInterval = interval
  }

  /**
   * Manual cleanup trigger
   */
  manualCleanup(): number {
    const sizeBefore = this.store.size
    this.cleanup()
    return sizeBefore - this.store.size
  }
}

/**
 * Singleton instance for Workers environment
 */
export const workersRateLimiter = new WorkersRateLimiter()