import { WorkersCloudflareClient } from './workers-cloudflare-client.js';
import { WorkersResponseFormatter } from './workers-response-formatter.js';
import { WorkersErrorHandler } from './workers-error-handler.js';
import { WorkersConfigManager } from './workers-config.js';
import { WorkersMiddleware } from './workers-middleware.js';
import { DomainsHandler } from './handlers/domains-handler.js';
import { PagesHandler } from './handlers/pages-handler.js';
export class WorkersRouter {
    cloudflareClient;
    domainsHandler;
    pagesHandler;
    configManager;
    middleware;
    constructor(env) {
        this.configManager = new WorkersConfigManager(env);
        const validation = this.configManager.validateConfig();
        if (!validation.valid) {
            console.error('Configuration validation failed:', validation.errors);
            throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
        this.middleware = new WorkersMiddleware(this.configManager);
        this.cloudflareClient = new WorkersCloudflareClient(env);
        this.domainsHandler = new DomainsHandler(this.cloudflareClient);
        this.pagesHandler = new PagesHandler(this.cloudflareClient);
    }
    async route(request) {
        const startTime = Date.now();
        try {
            this.middleware.logRequest(request);
            const rateLimitResult = await this.middleware.rateLimit(request);
            if (!rateLimitResult.allowed) {
                const response = WorkersResponseFormatter.error('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, {
                    limit: this.configManager.getRateLimitConfig().max,
                    remaining: rateLimitResult.remaining,
                    resetTime: rateLimitResult.resetTime
                });
                const headers = new Headers(response.headers);
                headers.set('X-RateLimit-Limit', this.configManager.getRateLimitConfig().max.toString());
                headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
                if (rateLimitResult.resetTime) {
                    headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());
                }
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers
                });
            }
            const validation = this.middleware.validateRequest(request);
            if (!validation.valid && validation.error) {
                return this.middleware.addSecurityHeaders(validation.error, request);
            }
            const url = new URL(request.url);
            const method = request.method;
            const pathname = url.pathname;
            if (pathname === '/health' && method === 'GET') {
                const response = this.middleware.healthCheck();
                this.middleware.recordMetrics(request, response, startTime);
                return this.middleware.addSecurityHeaders(response, request);
            }
            if (pathname === '/api/test' && method === 'GET') {
                const response = WorkersResponseFormatter.success({ message: 'Backend API is working!' }, 'API test successful');
                return this.middleware.addSecurityHeaders(response, request);
            }
            if (pathname === '/api/test-error' && method === 'GET') {
                throw WorkersErrorHandler.createValidationError('This is a test validation error');
            }
            const sensitiveEndpoints = ['/api/domains', '/api/pages'];
            if (sensitiveEndpoints.some(endpoint => pathname.startsWith(endpoint))) {
                const strictRateLimit = await this.middleware.strictRateLimit(request);
                if (!strictRateLimit.allowed) {
                    const response = WorkersResponseFormatter.error('Rate limit exceeded for sensitive endpoint', 'STRICT_RATE_LIMIT_EXCEEDED', 429, {
                        limit: 10,
                        remaining: strictRateLimit.remaining,
                        resetTime: strictRateLimit.resetTime
                    });
                    return this.middleware.addSecurityHeaders(response, request);
                }
            }
            let response;
            if (pathname.startsWith('/api/domains')) {
                response = await this.domainsHandler.handle(request, pathname, method);
            }
            else if (pathname.startsWith('/api/pages')) {
                response = await this.pagesHandler.handle(request, pathname, method);
            }
            else {
                response = WorkersResponseFormatter.error('API endpoint not found', 'NOT_FOUND', 404);
            }
            response = this.middleware.addSecurityHeaders(response, request);
            const headers = new Headers(response.headers);
            headers.set('X-RateLimit-Limit', this.configManager.getRateLimitConfig().max.toString());
            headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
            if (rateLimitResult.resetTime) {
                headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());
            }
            this.middleware.recordMetrics(request, response, startTime);
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers
            });
        }
        catch (error) {
            const errorResponse = this.middleware.handleError(error, request);
            return this.middleware.addSecurityHeaders(errorResponse, request);
        }
    }
    handleCors(request) {
        return this.middleware.handleCors(request);
    }
    addCorsHeaders(response, request) {
        return this.middleware.addCorsHeaders(response, request);
    }
}
