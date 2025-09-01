import { cloudflareClient } from './cloudflare-client.js';
import { config } from '../config/index.js';
import { AppError } from '../types.js';
export class HealthCheckService {
    startTime;
    constructor() {
        this.startTime = Date.now();
    }
    async performHealthCheck() {
        const timestamp = new Date().toISOString();
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const [cloudflareCheck, memoryCheck, diskCheck] = await Promise.allSettled([
            this.checkCloudflareAPI(),
            this.checkMemoryUsage(),
            this.checkDiskUsage()
        ]);
        const checks = {
            database: { status: 'pass', message: 'No database configured' },
            cloudflare_api: this.getResultFromSettled(cloudflareCheck),
            memory: this.getResultFromSettled(memoryCheck),
            disk: this.getResultFromSettled(diskCheck)
        };
        const overallStatus = this.determineOverallStatus(checks);
        return {
            status: overallStatus,
            timestamp,
            version: process.env.npm_package_version || '1.0.0',
            uptime,
            checks,
            environment: config.nodeEnv,
            ...(process.env.GIT_COMMIT || process.env.BUILD_TIME ? {
                build_info: {
                    ...(process.env.GIT_COMMIT && { commit: process.env.GIT_COMMIT }),
                    ...(process.env.BUILD_TIME && { build_time: process.env.BUILD_TIME })
                }
            } : {})
        };
    }
    async checkCloudflareAPI() {
        const startTime = Date.now();
        try {
            const isValid = await cloudflareClient.verifyToken();
            const responseTime = Date.now() - startTime;
            if (isValid) {
                return {
                    status: 'pass',
                    message: 'Cloudflare API is accessible',
                    response_time_ms: responseTime
                };
            }
            else {
                return {
                    status: 'fail',
                    message: 'Cloudflare API token verification failed',
                    response_time_ms: responseTime
                };
            }
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                status: 'fail',
                message: error instanceof AppError ? error.message : 'Cloudflare API check failed',
                response_time_ms: responseTime,
                details: error instanceof AppError ? error.details : undefined
            };
        }
    }
    async checkMemoryUsage() {
        try {
            const memUsage = process.memoryUsage();
            const totalMemoryMB = Math.round(memUsage.rss / 1024 / 1024);
            const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
            const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            let status = 'pass';
            let message = `Memory usage: ${totalMemoryMB}MB RSS, ${heapUsedMB}MB/${heapTotalMB}MB heap`;
            if (heapUsagePercent > 90) {
                status = 'fail';
                message += ' - Critical memory usage';
            }
            else if (heapUsagePercent > 80) {
                status = 'warn';
                message += ' - High memory usage';
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
            };
        }
        catch (error) {
            return {
                status: 'fail',
                message: 'Failed to check memory usage',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async checkDiskUsage() {
        try {
            const fs = await import('fs/promises');
            await fs.stat('.');
            return {
                status: 'pass',
                message: 'Disk access is working',
                details: {
                    working_directory_accessible: true
                }
            };
        }
        catch (error) {
            return {
                status: 'fail',
                message: 'Disk access check failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    getResultFromSettled(result) {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        else {
            return {
                status: 'fail',
                message: 'Health check failed with exception',
                details: result.reason instanceof Error ? result.reason.message : 'Unknown error'
            };
        }
    }
    determineOverallStatus(checks) {
        const statuses = Object.values(checks).map(check => check.status);
        if (statuses.includes('fail')) {
            return 'unhealthy';
        }
        else if (statuses.includes('warn')) {
            return 'degraded';
        }
        else {
            return 'healthy';
        }
    }
    getSimpleHealthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString()
        };
    }
}
export const healthCheckService = new HealthCheckService();
