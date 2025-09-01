import { WorkersResponseFormatter } from './workers-response-formatter.js';
import { WorkersRequestHandler } from './workers-request-handler.js';
export class WorkersMiddleware {
    configManager;
    rateLimitStore = new Map();
    constructor(configManager) {
        this.configManager = configManager;
    }
    async rateLimit(request, key) {
        const rateLimitConfig = this.configManager.getRateLimitConfig();
        const clientKey = key || this.getClientIP(request);
        const now = Date.now();
        this.cleanupExpiredRateLimits(now);
        const currentState = this.rateLimitStore.get(clientKey);
        if (!currentState || now > currentState.resetTime) {
            const newState = {
                count: 1,
                resetTime: now + rateLimitConfig.window
            };
            this.rateLimitStore.set(clientKey, newState);
            return {
                allowed: true,
                remaining: rateLimitConfig.max - 1,
                resetTime: newState.resetTime
            };
        }
        if (currentState.count >= rateLimitConfig.max) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: currentState.resetTime
            };
        }
        currentState.count++;
        this.rateLimitStore.set(clientKey, currentState);
        return {
            allowed: true,
            remaining: rateLimitConfig.max - currentState.count,
            resetTime: currentState.resetTime
        };
    }
    async strictRateLimit(request, key) {
        const clientKey = `strict:${key || this.getClientIP(request)}`;
        const now = Date.now();
        const strictLimit = 10;
        const strictWindow = 60000;
        this.cleanupExpiredRateLimits(now);
        const currentState = this.rateLimitStore.get(clientKey);
        if (!currentState || now > currentState.resetTime) {
            const newState = {
                count: 1,
                resetTime: now + strictWindow
            };
            this.rateLimitStore.set(clientKey, newState);
            return {
                allowed: true,
                remaining: strictLimit - 1,
                resetTime: newState.resetTime
            };
        }
        if (currentState.count >= strictLimit) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: currentState.resetTime
            };
        }
        currentState.count++;
        this.rateLimitStore.set(clientKey, currentState);
        return {
            allowed: true,
            remaining: strictLimit - currentState.count,
            resetTime: currentState.resetTime
        };
    }
    cleanupExpiredRateLimits(now) {
        for (const [key, state] of this.rateLimitStore.entries()) {
            if (now > state.resetTime) {
                this.rateLimitStore.delete(key);
            }
        }
    }
    getClientIP(request) {
        const cfConnectingIP = request.headers.get('CF-Connecting-IP');
        if (cfConnectingIP)
            return cfConnectingIP;
        const xForwardedFor = request.headers.get('X-Forwarded-For');
        if (xForwardedFor) {
            return xForwardedFor.split(',')[0].trim();
        }
        const xRealIP = request.headers.get('X-Real-IP');
        if (xRealIP)
            return xRealIP;
        return '127.0.0.1';
    }
    logRequest(request) {
        if (this.configManager.get('logLevel') === 'debug') {
            const method = request.method;
            const url = request.url;
            const userAgent = WorkersRequestHandler.getUserAgent(request);
            const clientIP = WorkersRequestHandler.getClientIP(request);
            console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${clientIP} - UA: ${userAgent}`);
        }
    }
    validateRequest(request) {
        if (this.configManager.isProduction()) {
            const userAgent = request.headers.get('User-Agent');
            if (!userAgent) {
                return {
                    valid: false,
                    error: WorkersResponseFormatter.error('User-Agent header is required', 'MISSING_USER_AGENT', 400)
                };
            }
        }
        if (this.isSuspiciousRequest(request)) {
            return {
                valid: false,
                error: WorkersResponseFormatter.error('Request blocked', 'REQUEST_BLOCKED', 403)
            };
        }
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
            const contentLength = WorkersRequestHandler.getHeader(request, 'content-length');
            const maxFileSize = this.configManager.get('maxFileSize');
            if (contentLength && parseInt(contentLength) > maxFileSize) {
                return {
                    valid: false,
                    error: WorkersResponseFormatter.error(`Request body too large. Maximum size is ${maxFileSize} bytes.`, 'REQUEST_TOO_LARGE', 413)
                };
            }
        }
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
            const contentType = WorkersRequestHandler.getHeader(request, 'content-type');
            if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
                return {
                    valid: false,
                    error: WorkersResponseFormatter.error('Unsupported content type. Use application/json or multipart/form-data.', 'UNSUPPORTED_MEDIA_TYPE', 415)
                };
            }
        }
        return { valid: true };
    }
    isSuspiciousRequest(request) {
        const userAgent = request.headers.get('User-Agent');
        const url = new URL(request.url);
        if (userAgent && this.configManager.isProduction()) {
            const suspiciousUserAgents = [
                'sqlmap', 'nikto', 'nmap', 'masscan', 'zap', 'burp', 'wget'
            ];
            const lowerUserAgent = userAgent.toLowerCase();
            if (suspiciousUserAgents.some(suspicious => lowerUserAgent.includes(suspicious))) {
                return true;
            }
        }
        const suspiciousPaths = [
            '/.env', '/wp-admin', '/admin', '/phpmyadmin', '/.git', '/config', '/backup'
        ];
        if (suspiciousPaths.some(path => url.pathname.includes(path))) {
            return true;
        }
        const suspiciousParams = ['union', 'select', 'drop', 'delete', 'insert', 'update'];
        const queryString = url.search.toLowerCase();
        if (suspiciousParams.some(param => queryString.includes(param))) {
            return true;
        }
        return false;
    }
    addSecurityHeaders(response, request) {
        const headers = new Headers(response.headers);
        const isProduction = this.configManager.isProduction();
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'DENY');
        headers.set('X-XSS-Protection', '1; mode=block');
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        if (isProduction) {
            headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
        if (request && request.url.includes('/api/')) {
            const cspDirectives = [
                "default-src 'none'",
                "frame-ancestors 'none'",
                "base-uri 'none'"
            ];
            headers.set('Content-Security-Policy', cspDirectives.join('; '));
        }
        const permissionsPolicy = [
            'camera=(),',
            'microphone=(),',
            'geolocation=(),',
            'payment=(),',
            'usb=(),',
            'magnetometer=(),',
            'gyroscope=(),',
            'accelerometer=()'
        ].join(' ');
        headers.set('Permissions-Policy', permissionsPolicy);
        headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
        headers.delete('Server');
        headers.delete('X-Powered-By');
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    }
    addCorsHeaders(response, request) {
        const headers = new Headers(response.headers);
        const origin = request.headers.get('Origin');
        const allowedOrigins = this.configManager.get('corsOrigins');
        let allowedOrigin = '*';
        if (origin && allowedOrigins.includes(origin)) {
            allowedOrigin = origin;
        }
        else if (this.configManager.isProduction() && origin) {
            allowedOrigin = allowedOrigins[0] || 'https://luckyjingwen.top';
        }
        headers.set('Access-Control-Allow-Origin', allowedOrigin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key, X-Client-Version');
        headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
        headers.set('Access-Control-Max-Age', '86400');
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    }
    handleCors(request) {
        const origin = request.headers.get('Origin');
        const allowedOrigins = this.configManager.get('corsOrigins');
        let allowedOrigin = '*';
        if (origin && allowedOrigins.includes(origin)) {
            allowedOrigin = origin;
        }
        else if (this.configManager.isProduction() && origin) {
            allowedOrigin = allowedOrigins[0] || 'https://luckyjingwen.top';
        }
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Key, X-Client-Version',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400',
                'Vary': 'Origin'
            }
        });
    }
    handleError(error, request) {
        this.logError(error, request);
        if (this.configManager.isProduction()) {
            return WorkersResponseFormatter.error('Internal server error', 'INTERNAL_ERROR', 500);
        }
        return WorkersResponseFormatter.error(error.message || 'Internal server error', 'INTERNAL_ERROR', 500, error.stack);
    }
    logError(error, request) {
        const method = request.method;
        const url = request.url;
        const clientIP = WorkersRequestHandler.getClientIP(request);
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ERROR - ${method} ${url} - IP: ${clientIP}`);
        console.error('Error details:', error);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    }
    withTimeout(promise, timeoutMs = 30000) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Request timeout after ${timeoutMs}ms`));
                }, timeoutMs);
            })
        ]);
    }
    healthCheck() {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: this.configManager.get('nodeEnv'),
            version: '1.0.0'
        };
        return WorkersResponseFormatter.success(health, 'Service is healthy');
    }
    recordMetrics(request, response, startTime) {
        const duration = Date.now() - startTime;
        const method = request.method;
        const status = response.status;
        const url = new URL(request.url).pathname;
        if (this.configManager.get('logLevel') === 'debug') {
            console.log(`[METRICS] ${method} ${url} - ${status} - ${duration}ms`);
        }
    }
}
