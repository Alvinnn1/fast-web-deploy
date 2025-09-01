import { config } from '../config/index.js';
export class SimpleSecurityMiddleware {
    static instance;
    rateLimitStore = new Map();
    constructor() {
        setInterval(() => this.cleanupRateLimit(), 5 * 60 * 1000);
    }
    static getInstance() {
        if (!SimpleSecurityMiddleware.instance) {
            SimpleSecurityMiddleware.instance = new SimpleSecurityMiddleware();
        }
        return SimpleSecurityMiddleware.instance;
    }
    async register(fastify) {
        await this.registerCORS(fastify);
        if (config.nodeEnv === 'production') {
            await this.registerRateLimit(fastify);
        }
        await this.registerSecurityHeaders(fastify);
        await this.registerRequestValidation(fastify);
    }
    async registerCORS(fastify) {
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
            maxAge: 86400
        });
    }
    async registerRateLimit(fastify) {
        fastify.addHook('preHandler', async (request, reply) => {
            const clientIP = this.getClientIP(request);
            const now = Date.now();
            if (['127.0.0.1', '::1'].includes(clientIP)) {
                return;
            }
            const key = `rate_limit:${clientIP}`;
            let entry = this.rateLimitStore.get(key);
            if (!entry || now > entry.resetTime) {
                entry = {
                    count: 0,
                    resetTime: now + config.rateLimitWindow
                };
            }
            if (entry.count >= config.rateLimitMax) {
                reply.code(429);
                reply.header('X-RateLimit-Limit', config.rateLimitMax);
                reply.header('X-RateLimit-Remaining', 0);
                reply.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
                return reply.send({
                    success: false,
                    message: 'Rate limit exceeded',
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        limit: config.rateLimitMax,
                        remaining: 0,
                        resetTime: new Date(entry.resetTime)
                    }
                });
            }
            entry.count++;
            this.rateLimitStore.set(key, entry);
            reply.header('X-RateLimit-Limit', config.rateLimitMax);
            reply.header('X-RateLimit-Remaining', config.rateLimitMax - entry.count);
            reply.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
        });
    }
    async registerSecurityHeaders(fastify) {
        fastify.addHook('onSend', async (_request, reply, payload) => {
            reply.header('X-Content-Type-Options', 'nosniff');
            reply.header('X-Frame-Options', 'DENY');
            reply.header('X-XSS-Protection', '1; mode=block');
            reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
            if (config.nodeEnv === 'production') {
                reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
            }
            const permissionsPolicy = [
                'camera=()',
                'microphone=()',
                'geolocation=()',
                'payment=()',
                'usb=()'
            ].join(', ');
            reply.header('Permissions-Policy', permissionsPolicy);
            reply.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
            reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
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
                ];
                reply.header('Content-Security-Policy', cspDirectives.join('; '));
            }
            reply.removeHeader('Server');
            reply.removeHeader('X-Powered-By');
            return payload;
        });
    }
    async registerRequestValidation(fastify) {
        fastify.addHook('preHandler', async (request, reply) => {
            const contentLength = request.headers['content-length'];
            if (contentLength && parseInt(contentLength) > config.maxFileSize) {
                reply.code(413).send({
                    success: false,
                    message: 'Request entity too large',
                    error: {
                        code: 'REQUEST_TOO_LARGE',
                        maxSize: config.maxFileSize
                    }
                });
                return;
            }
            const userAgent = request.headers['user-agent'];
            if (!userAgent && config.nodeEnv === 'production') {
                reply.code(400).send({
                    success: false,
                    message: 'User-Agent header is required',
                    error: {
                        code: 'MISSING_USER_AGENT'
                    }
                });
                return;
            }
            if (this.isSuspiciousRequest(request)) {
                reply.code(403).send({
                    success: false,
                    message: 'Request blocked',
                    error: {
                        code: 'REQUEST_BLOCKED'
                    }
                });
                return;
            }
        });
    }
    getClientIP(request) {
        const xForwardedFor = request.headers['x-forwarded-for'];
        if (xForwardedFor && typeof xForwardedFor === 'string') {
            const ips = xForwardedFor.split(',').map(ip => ip.trim());
            return ips[0] || '127.0.0.1';
        }
        const xRealIP = request.headers['x-real-ip'];
        if (xRealIP && typeof xRealIP === 'string') {
            return xRealIP;
        }
        const cfConnectingIP = request.headers['cf-connecting-ip'];
        if (cfConnectingIP && typeof cfConnectingIP === 'string') {
            return cfConnectingIP;
        }
        return request.socket.remoteAddress || '127.0.0.1';
    }
    isSuspiciousRequest(request) {
        const userAgent = request.headers['user-agent'];
        const suspiciousUserAgents = [
            'sqlmap', 'nikto', 'nmap', 'masscan', 'zap', 'burp'
        ];
        if (userAgent && config.nodeEnv === 'production') {
            const lowerUserAgent = userAgent.toLowerCase();
            if (suspiciousUserAgents.some(suspicious => lowerUserAgent.includes(suspicious))) {
                return true;
            }
        }
        const suspiciousPaths = [
            '/.env', '/.git', '/wp-admin', '/admin', '/phpmyadmin', '/config', '/backup'
        ];
        if (suspiciousPaths.some(path => request.url.includes(path))) {
            return true;
        }
        return false;
    }
    cleanupRateLimit() {
        const now = Date.now();
        for (const [key, entry] of this.rateLimitStore.entries()) {
            if (now > entry.resetTime) {
                this.rateLimitStore.delete(key);
            }
        }
    }
}
export const simpleSecurityMiddleware = SimpleSecurityMiddleware.getInstance();
