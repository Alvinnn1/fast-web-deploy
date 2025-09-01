export class WorkersConfigManager {
    config;
    constructor(env) {
        const isProduction = (env.NODE_ENV || 'production') === 'production';
        this.config = {
            nodeEnv: env.NODE_ENV || 'production',
            cloudflareApiToken: env.CLOUDFLARE_API_TOKEN || '',
            cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID || '',
            cloudflareEmail: env.CLOUDFLARE_EMAIL || '',
            cloudflareApiBaseUrl: 'https://api.cloudflare.com/client/v4',
            corsOrigins: this.parseCorsOrigins(env.CORS_ORIGINS, isProduction),
            trustedProxies: env.TRUSTED_PROXIES?.split(',') || this.getDefaultTrustedProxies(),
            blockedIPs: env.BLOCKED_IPS?.split(',') || [],
            allowedIPs: env.ALLOWED_IPS?.split(',') || [],
            enableSecurityHeaders: env.ENABLE_SECURITY_HEADERS !== 'false',
            enableCSP: env.ENABLE_CSP !== 'false' && isProduction,
            enableRateLimiting: env.ENABLE_RATE_LIMITING !== 'false' && isProduction,
            logLevel: env.LOG_LEVEL || 'info',
            maxFileSize: parseInt(env.MAX_FILE_SIZE || '10485760', 10),
            allowedFileTypes: env.ALLOWED_FILE_TYPES?.split(',') || ['application/zip'],
            rateLimitMax: parseInt(env.RATE_LIMIT_MAX || '100', 10),
            rateLimitWindow: parseInt(env.RATE_LIMIT_WINDOW || '900000', 10)
        };
    }
    parseCorsOrigins(corsOrigins, isProduction) {
        if (corsOrigins) {
            return corsOrigins.split(',').map(origin => origin.trim());
        }
        if (isProduction) {
            return [
                'https://luckyjingwen.top',
                'https://www.luckyjingwen.top',
                'https://cloudflare-static-deployer.pages.dev'
            ];
        }
        return ['http://localhost:5173', 'http://localhost:3000'];
    }
    getDefaultTrustedProxies() {
        return [
            '127.0.0.1',
            '::1',
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16'
        ];
    }
    getConfig() {
        return this.config;
    }
    get(key) {
        return this.config[key];
    }
    isDevelopment() {
        return this.config.nodeEnv === 'development';
    }
    isProduction() {
        return this.config.nodeEnv === 'production';
    }
    isStaging() {
        return this.config.nodeEnv === 'staging';
    }
    validateConfig() {
        const errors = [];
        if (!this.config.cloudflareApiToken) {
            errors.push('CLOUDFLARE_API_TOKEN is required');
        }
        if (!this.config.cloudflareAccountId) {
            errors.push('CLOUDFLARE_ACCOUNT_ID is required');
        }
        if (!this.config.cloudflareEmail) {
            errors.push('CLOUDFLARE_EMAIL is required');
        }
        if (this.config.corsOrigins.length === 0) {
            errors.push('At least one CORS origin must be specified');
        }
        if (this.config.maxFileSize <= 0) {
            errors.push('MAX_FILE_SIZE must be a positive number');
        }
        if (this.config.rateLimitMax <= 0) {
            errors.push('RATE_LIMIT_MAX must be a positive number');
        }
        if (this.config.rateLimitWindow <= 0) {
            errors.push('RATE_LIMIT_WINDOW must be a positive number');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    getCloudflareConfig() {
        return {
            apiToken: this.config.cloudflareApiToken,
            accountId: this.config.cloudflareAccountId,
            email: this.config.cloudflareEmail,
            apiBaseUrl: this.config.cloudflareApiBaseUrl
        };
    }
    getCorsConfig() {
        return {
            origins: this.config.corsOrigins
        };
    }
    getUploadConfig() {
        return {
            maxFileSize: this.config.maxFileSize,
            allowedFileTypes: this.config.allowedFileTypes
        };
    }
    getRateLimitConfig() {
        return {
            max: this.config.rateLimitMax,
            window: this.config.rateLimitWindow
        };
    }
    getSecurityConfig() {
        return {
            corsOrigins: this.config.corsOrigins,
            trustedProxies: this.config.trustedProxies,
            blockedIPs: this.config.blockedIPs,
            allowedIPs: this.config.allowedIPs,
            enableSecurityHeaders: this.config.enableSecurityHeaders,
            enableCSP: this.config.enableCSP,
            enableRateLimiting: this.config.enableRateLimiting
        };
    }
}
