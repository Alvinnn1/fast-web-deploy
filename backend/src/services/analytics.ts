import { cloudflareClient } from './cloudflare-client.js'
import { config } from '../config/index.js'
import { AppError, ErrorType } from '../types.js'

export interface AnalyticsData {
  requests: {
    total: number
    cached: number
    uncached: number
  }
  bandwidth: {
    total: number
    cached: number
    uncached: number
  }
  threats: {
    total: number
    types: Record<string, number>
  }
  performance: {
    avg_response_time: number
    p95_response_time: number
  }
  status_codes: Record<string, number>
  countries: Record<string, number>
  timestamp: string
}

export interface MonitoringMetrics {
  uptime_percentage: number
  avg_response_time: number
  error_rate: number
  total_requests: number
  last_24h_requests: number
  timestamp: string
}

export class AnalyticsService {
  private zoneId: string | null = null

  constructor() {
    // Initialize with configured zone if available
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID || null
  }

  async getZoneAnalytics(zoneId?: string, since?: string, until?: string): Promise<AnalyticsData> {
    const targetZoneId = zoneId || this.zoneId
    if (!targetZoneId) {
      throw new AppError(
        ErrorType.CONFIGURATION_ERROR,
        'Zone ID is required for analytics',
        400
      )
    }

    try {
      // Set default time range to last 24 hours if not provided
      const sinceTime = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const untilTime = until || new Date().toISOString()

      // Make multiple API calls to get different analytics data
      const [httpRequests, bandwidth, threats, performance] = await Promise.allSettled([
        this.getHttpRequestsAnalytics(targetZoneId, sinceTime, untilTime),
        this.getBandwidthAnalytics(targetZoneId, sinceTime, untilTime),
        this.getThreatsAnalytics(targetZoneId, sinceTime, untilTime),
        this.getPerformanceAnalytics(targetZoneId, sinceTime, untilTime)
      ])

      return {
        requests: this.getSettledValue(httpRequests, { total: 0, cached: 0, uncached: 0 }),
        bandwidth: this.getSettledValue(bandwidth, { total: 0, cached: 0, uncached: 0 }),
        threats: this.getSettledValue(threats, { total: 0, types: {} }),
        performance: this.getSettledValue(performance, { avg_response_time: 0, p95_response_time: 0 }),
        status_codes: {},
        countries: {},
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        `Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  async getPagesAnalytics(accountId?: string, projectName?: string): Promise<any> {
    const targetAccountId = accountId || config.cloudflareAccountId
    if (!targetAccountId) {
      throw new AppError(
        ErrorType.CONFIGURATION_ERROR,
        'Account ID is required for Pages analytics',
        400
      )
    }

    try {
      // Get Pages projects if no specific project is requested
      if (!projectName) {
        const projects = await cloudflareClient.getPagesProjects(targetAccountId)
        return {
          projects: projects.map(project => ({
            name: project.name,
            subdomain: project.subdomain,
            domains: project.domains,
            latest_deployment: project.latest_deployment
          })),
          timestamp: new Date().toISOString()
        }
      }

      // Get specific project analytics
      const project = await cloudflareClient.getPagesProject(targetAccountId, projectName)
      const deployments = await cloudflareClient.getPagesDeployments(targetAccountId, projectName)

      return {
        project: {
          name: project.name,
          subdomain: project.subdomain,
          domains: project.domains,
          latest_deployment: project.latest_deployment
        },
        deployments: deployments.slice(0, 10), // Last 10 deployments
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        `Failed to fetch Pages analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  async getMonitoringMetrics(): Promise<MonitoringMetrics> {
    try {
      // This would typically integrate with Cloudflare's monitoring APIs
      // For now, we'll provide basic metrics based on health checks
      const uptime = process.uptime()
      const uptimeHours = uptime / 3600

      return {
        uptime_percentage: Math.min(99.9, (uptimeHours / 24) * 100), // Simplified calculation
        avg_response_time: 150, // Placeholder - would come from actual monitoring
        error_rate: 0.1, // Placeholder - would come from actual monitoring
        total_requests: 0, // Placeholder - would come from actual monitoring
        last_24h_requests: 0, // Placeholder - would come from actual monitoring
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new AppError(
        ErrorType.CLOUDFLARE_API_ERROR,
        `Failed to fetch monitoring metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  private async getHttpRequestsAnalytics(zoneId: string, since: string, until: string) {
    // This would make actual API calls to Cloudflare Analytics API
    // For now, returning mock data structure
    return {
      total: 0,
      cached: 0,
      uncached: 0
    }
  }

  private async getBandwidthAnalytics(zoneId: string, since: string, until: string) {
    // This would make actual API calls to Cloudflare Analytics API
    // For now, returning mock data structure
    return {
      total: 0,
      cached: 0,
      uncached: 0
    }
  }

  private async getThreatsAnalytics(zoneId: string, since: string, until: string) {
    // This would make actual API calls to Cloudflare Analytics API
    // For now, returning mock data structure
    return {
      total: 0,
      types: {}
    }
  }

  private async getPerformanceAnalytics(zoneId: string, since: string, until: string) {
    // This would make actual API calls to Cloudflare Analytics API
    // For now, returning mock data structure
    return {
      avg_response_time: 0,
      p95_response_time: 0
    }
  }

  private getSettledValue<T>(result: PromiseSettledResult<T>, defaultValue: T): T {
    return result.status === 'fulfilled' ? result.value : defaultValue
  }

  // Set zone ID for analytics
  setZoneId(zoneId: string): void {
    this.zoneId = zoneId
  }

  // Get current zone ID
  getZoneId(): string | null {
    return this.zoneId
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()