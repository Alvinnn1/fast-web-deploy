import { ResponseFormatter } from '../utils/index.js';
import { analyticsService } from '../services/analytics.js';
import { healthCheckService } from '../services/health-check.js';
export async function monitoringRoutes(fastify) {
    fastify.get('/api/analytics/zone', async (request) => {
        try {
            const { zone_id, since, until } = request.query;
            const analytics = await analyticsService.getZoneAnalytics(zone_id, since, until);
            return ResponseFormatter.success(analytics, 'Zone analytics retrieved successfully');
        }
        catch (error) {
            return ResponseFormatter.error('Failed to retrieve zone analytics', error instanceof Error ? error.message : 'Unknown error');
        }
    });
    fastify.get('/api/analytics/pages', async (request) => {
        try {
            const { account_id, project_name } = request.query;
            const analytics = await analyticsService.getPagesAnalytics(account_id, project_name);
            return ResponseFormatter.success(analytics, 'Pages analytics retrieved successfully');
        }
        catch (error) {
            return ResponseFormatter.error('Failed to retrieve Pages analytics', error instanceof Error ? error.message : 'Unknown error');
        }
    });
    fastify.get('/api/monitoring/metrics', async () => {
        try {
            const metrics = await analyticsService.getMonitoringMetrics();
            return ResponseFormatter.success(metrics, 'Monitoring metrics retrieved successfully');
        }
        catch (error) {
            return ResponseFormatter.error('Failed to retrieve monitoring metrics', error instanceof Error ? error.message : 'Unknown error');
        }
    });
    fastify.get('/api/monitoring/health', async (_request, reply) => {
        try {
            const healthResult = await healthCheckService.performHealthCheck();
            let statusCode = 200;
            if (healthResult.status === 'degraded') {
                statusCode = 200;
            }
            else if (healthResult.status === 'unhealthy') {
                statusCode = 503;
            }
            reply.code(statusCode);
            return ResponseFormatter.success(healthResult, 'Health monitoring data retrieved');
        }
        catch (error) {
            reply.code(503);
            return ResponseFormatter.error('Health monitoring failed', error instanceof Error ? error.message : 'Unknown error');
        }
    });
    fastify.get('/api/monitoring/system', async () => {
        try {
            const systemInfo = {
                node_version: process.version,
                platform: process.platform,
                arch: process.arch,
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                cpu_usage: process.cpuUsage(),
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString()
            };
            return ResponseFormatter.success(systemInfo, 'System information retrieved');
        }
        catch (error) {
            return ResponseFormatter.error('Failed to retrieve system information', error instanceof Error ? error.message : 'Unknown error');
        }
    });
    fastify.get('/api/monitoring/deployment', async () => {
        try {
            const deploymentInfo = {
                version: process.env.npm_package_version || '1.0.0',
                build_time: process.env.BUILD_TIME || 'unknown',
                git_commit: process.env.GIT_COMMIT || 'unknown',
                environment: process.env.NODE_ENV || 'development',
                deployed_at: process.env.DEPLOYED_AT || new Date().toISOString(),
                uptime_seconds: process.uptime(),
                timestamp: new Date().toISOString()
            };
            return ResponseFormatter.success(deploymentInfo, 'Deployment information retrieved');
        }
        catch (error) {
            return ResponseFormatter.error('Failed to retrieve deployment information', error instanceof Error ? error.message : 'Unknown error');
        }
    });
}
