import { cloudflareClient } from './cloudflare-client.js'
import { config } from '../config/index.js'
import { AppError, ErrorType } from '../types.js'

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: HealthStatus
    cloudflare_api: HealthStatus
    memory: HealthStatus
    disk: HealthStatus
  }
  environment: string
  build_info?: {
    commit?: string
    build_time?: string
  }
}

export interface HealthStatus {
  status: 'pass' | 'warn' | 'fail'
  message: string
  response_time_ms?: number
  details?: any
}

export class HealthCheckService {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString()
    const uptime = Math.floor((Date.now() - this.startTime) / 1000)

    // Perform all health checks in parallel
    const [
      cloudflareCheck,
      memoryCheck,
      diskCheck
    ] = await Promise.allSettled([
      this.checkCloudflareAPI(),
      this.checkMemoryUsage(),
      this.checkDiskUsage()
    ])

    const checks = {
      database: { status: 'pass' as const, message: 'No database configured' }, // Placeholder since we don't use a database
      cloudflare_api: this.getResultFromSettled(cloudflareCheck),
      memory: this.getResultFromSettled(memoryCheck),
      disk: this.getResultFromSettled(diskCheck)
    }

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checks)

    return {
      status: overallStatus,
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      uptime,
      checks,
      environment: config.nodeEnv,
      build_info: {
        commit: process.env.GIT_COMMIT,
        build_time: process.env.BUILD_TIME
      }
    }
  }

  private async checkCloudflareAPI(): Promise<HealthStatus> {
    const startTime = Date.now()

    try {
      const isValid = await cloudflareClient.verifyToken()
      const responseTime = Date.now() - startTime

      if (isValid) {
        return {
          status: 'pass',
          message: 'Cloudflare API is accessible',
          response_time_ms: responseTime
        }
      } else {
        return {
          status: 'fail',
          message: 'Cloudflare API token verification failed',
          response_time_ms: responseTime
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        status: 'fail',
        message: error instanceof AppError ? error.message : 'Cloudflare API check failed',
        response_time_ms: responseTime,
        details: error instanceof AppError ? error.details : undefined
      }
    }
  }

  private async checkMemoryUsage(): Promise<HealthStatus> {
    try {
      const memUsage = process.memoryUsage()
      const totalMemoryMB = Math.round(memUsage.rss / 1024 / 1024)
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)

      // Consider memory usage unhealthy if heap usage is over 80% of total heap
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100

      let status: 'pass' | 'warn' | 'fail' = 'pass'
      let message = `Memory usage: ${totalMemoryMB}MB RSS, ${heapUsedMB}MB/${heapTotalMB}MB heap`

      if (heapUsagePercent > 90) {
        status = 'fail'
        message += ' - Critical memory usage'
      } else if (heapUsagePercent > 80) {
        status = 'warn'
        message += ' - High memory usage'
      }

      return {
        status,
        message,
        details: {
          rss_mb: totalMemoryMB,
          heap_used_mb: heapUsedMB,
          heap_total_mb: heapTotalMB,
          heap_usage_percent: Math.round(heapUsagePercent)
        }
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Failed to check memory usage',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async checkDiskUsage(): Promise<HealthStatus> {
    try {
      // For containerized environments, we'll check available disk space
      // This is a simplified check - in production you might want more sophisticated monitoring
      const fs = await import('fs/promises')
      const stats = await fs.stat('.')

      return {
        status: 'pass',
        message: 'Disk access is working',
        details: {
          working_directory_accessible: true
        }
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Disk access check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private getResultFromSettled(result: PromiseSettledResult<HealthStatus>): HealthStatus {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        status: 'fail',
        message: 'Health check failed with exception',
        details: result.reason instanceof Error ? result.reason.message : 'Unknown error'
      }
    }
  }

  private determineOverallStatus(checks: Record<string, HealthStatus>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map(check => check.status)

    if (statuses.includes('fail')) {
      return 'unhealthy'
    } else if (statuses.includes('warn')) {
      return 'degraded'
    } else {
      return 'healthy'
    }
  }

  // Simple health check for load balancers (just returns OK)
  getSimpleHealthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService()