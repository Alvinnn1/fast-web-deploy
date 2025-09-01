import { cloudflareClient } from './cloudflare-client.js';
import { config } from '../config/index.js';
import { AppError, ErrorType } from '../types.js';
export class AnalyticsService {
    zoneId = null;
    constructor() {
        this.zoneId = process.env.CLOUDFLARE_ZONE_ID || null;
    }
    async getZoneAnalytics(zoneId, since, until) {
        const targetZoneId = zoneId || this.zoneId;
        if (!targetZoneId) {
            throw new AppError(ErrorType.CONFIGURATION_ERROR, 'Zone ID is required for analytics', 400);
        }
        try {
            const sinceTime = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const untilTime = until || new Date().toISOString();
            const [httpRequests, bandwidth, threats, performance] = await Promise.allSettled([
                this.getHttpRequestsAnalytics(targetZoneId, sinceTime, untilTime),
                this.getBandwidthAnalytics(targetZoneId, sinceTime, untilTime),
                this.getThreatsAnalytics(targetZoneId, sinceTime, untilTime),
                this.getPerformanceAnalytics(targetZoneId, sinceTime, untilTime)
            ]);
            return {
                requests: this.getSettledValue(httpRequests, { total: 0, cached: 0, uncached: 0 }),
                bandwidth: this.getSettledValue(bandwidth, { total: 0, cached: 0, uncached: 0 }),
                threats: this.getSettledValue(threats, { total: 0, types: {} }),
                performance: this.getSettledValue(performance, { avg_response_time: 0, p95_response_time: 0 }),
                status_codes: {},
                countries: {},
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, `Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async getPagesAnalytics(accountId, projectName) {
        const targetAccountId = accountId || config.cloudflareAccountId;
        if (!targetAccountId) {
            throw new AppError(ErrorType.CONFIGURATION_ERROR, 'Account ID is required for Pages analytics', 400);
        }
        try {
            if (!projectName) {
                const projects = await cloudflareClient.getPagesProjects(targetAccountId);
                return {
                    projects: projects.map(project => ({
                        name: project.name,
                        subdomain: project.subdomain,
                        domains: project.domains,
                        latest_deployment: project.latest_deployment
                    })),
                    timestamp: new Date().toISOString()
                };
            }
            const project = await cloudflareClient.getPagesProject(targetAccountId, projectName);
            const deployments = await cloudflareClient.getPagesDeployments(targetAccountId, projectName);
            return {
                project: {
                    name: project.name,
                    subdomain: project.subdomain,
                    domains: project.domains,
                    latest_deployment: project.latest_deployment
                },
                deployments: deployments.slice(0, 10),
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, `Failed to fetch Pages analytics: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async getMonitoringMetrics() {
        try {
            const uptime = process.uptime();
            const uptimeHours = uptime / 3600;
            return {
                uptime_percentage: Math.min(99.9, (uptimeHours / 24) * 100),
                avg_response_time: 150,
                error_rate: 0.1,
                total_requests: 0,
                last_24h_requests: 0,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw new AppError(ErrorType.CLOUDFLARE_API_ERROR, `Failed to fetch monitoring metrics: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async getHttpRequestsAnalytics(_zoneId, _since, _until) {
        return {
            total: 0,
            cached: 0,
            uncached: 0
        };
    }
    async getBandwidthAnalytics(_zoneId, _since, _until) {
        return {
            total: 0,
            cached: 0,
            uncached: 0
        };
    }
    async getThreatsAnalytics(_zoneId, _since, _until) {
        return {
            total: 0,
            types: {}
        };
    }
    async getPerformanceAnalytics(_zoneId, _since, _until) {
        return {
            avg_response_time: 0,
            p95_response_time: 0
        };
    }
    getSettledValue(result, defaultValue) {
        return result.status === 'fulfilled' ? result.value : defaultValue;
    }
    setZoneId(zoneId) {
        this.zoneId = zoneId;
    }
    getZoneId() {
        return this.zoneId;
    }
}
export const analyticsService = new AnalyticsService();
