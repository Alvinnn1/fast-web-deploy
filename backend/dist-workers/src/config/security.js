export function getSecurityConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isStaging = process.env.NODE_ENV === 'staging';
    return {
        corsOrigins: getCorsOrigins(),
        corsCredentials: true,
        corsMaxAge: 86400,
        rateLimitEnabled: isProduction || isStaging,
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
        rateLimitSkipSuccessful: false,
        rateLimitStrictEndpoints: [
            '/api/domains',
            '/api/pages',
            '/api/auth',
            '/api/login',
            '/api/register'
        ],
        securityHeadersEnabled: true,
        hstsEnabled: isProduction,
        hstsMaxAge: 31536000,
        hstsIncludeSubDomains: true,
        hstsPreload: true,
        cspEnabled: isProduction || isStaging,
        cspDirectives: {
            'default-src': ["'self'"],
            'script-src': [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                'https://challenges.cloudflare.com',
                'https://static.cloudflareinsights.com'
            ],
            'style-src': [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com'
            ],
            'font-src': [
                "'self'",
                'https://fonts.gstatic.com',
                'data:'
            ],
            'img-src': [
                "'self'",
                'data:',
                'blob:',
                'https:',
                'https://avatars.cloudflare.com'
            ],
            'connect-src': [
                "'self'",
                'https://api.cloudflare.com',
                'https://challenges.cloudflare.com',
                'wss:'
            ],
            'frame-src': [
                "'self'",
                'https://challenges.cloudflare.com'
            ],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'frame-ancestors': ["'none'"]
        },
        requestValidationEnabled: true,
        maxRequestSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
        allowedContentTypes: [
            'application/json',
            'multipart/form-data',
            'application/x-www-form-urlencoded',
            'text/plain'
        ],
        requiredHeaders: isProduction ? ['user-agent'] : [],
        blockSuspiciousRequests: isProduction || isStaging,
        suspiciousUserAgents: [
            'sqlmap',
            'nikto',
            'nmap',
            'masscan',
            'zap',
            'burp',
            'wget',
            'python-requests',
            'go-http-client'
        ],
        suspiciousPaths: [
            '/.env',
            '/.git',
            '/wp-admin',
            '/admin',
            '/phpmyadmin',
            '/config',
            '/backup',
            '/database',
            '/.htaccess',
            '/web.config'
        ],
        suspiciousParams: [
            'union',
            'select',
            'drop',
            'delete',
            'insert',
            'update',
            'script',
            'javascript',
            'vbscript',
            'onload',
            'onerror'
        ],
        trustedProxies: getTrustedProxies(),
        blockedIPs: getBlockedIPs(),
        allowedIPs: getAllowedIPs()
    };
}
function getCorsOrigins() {
    const corsOrigins = process.env.CORS_ORIGINS;
    if (corsOrigins) {
        return corsOrigins.split(',').map(origin => origin.trim());
    }
    const isProduction = process.env.NODE_ENV === 'production';
    const isStaging = process.env.NODE_ENV === 'staging';
    if (isProduction) {
        return [
            'https://luckyjingwen.top',
            'https://www.luckyjingwen.top',
            'https://cloudflare-static-deployer.pages.dev'
        ];
    }
    if (isStaging) {
        return [
            'https://staging.luckyjingwen.top',
            'https://cloudflare-static-deployer-staging.pages.dev',
            'http://localhost:5173'
        ];
    }
    return [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
    ];
}
function getTrustedProxies() {
    const trustedProxies = process.env.TRUSTED_PROXIES;
    if (trustedProxies) {
        return trustedProxies.split(',').map(proxy => proxy.trim());
    }
    return [
        '127.0.0.1',
        '::1',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '104.16.0.0/13',
        '104.24.0.0/14',
        '108.162.192.0/18',
        '131.0.72.0/22',
        '141.101.64.0/18',
        '162.158.0.0/15',
        '172.64.0.0/13',
        '173.245.48.0/20',
        '188.114.96.0/20',
        '190.93.240.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17'
    ];
}
function getBlockedIPs() {
    const blockedIPs = process.env.BLOCKED_IPS;
    if (blockedIPs) {
        return blockedIPs.split(',').map(ip => ip.trim());
    }
    return [];
}
function getAllowedIPs() {
    const allowedIPs = process.env.ALLOWED_IPS;
    if (allowedIPs) {
        return allowedIPs.split(',').map(ip => ip.trim());
    }
    return [];
}
export function validateSecurityConfig(config) {
    const errors = [];
    if (!config.corsOrigins || config.corsOrigins.length === 0) {
        errors.push('CORS origins must be specified');
    }
    if (config.rateLimitEnabled) {
        if (config.rateLimitMax <= 0) {
            errors.push('Rate limit max must be greater than 0');
        }
        if (config.rateLimitWindow <= 0) {
            errors.push('Rate limit window must be greater than 0');
        }
    }
    if (config.maxRequestSize <= 0) {
        errors.push('Max request size must be greater than 0');
    }
    if (config.cspEnabled && (!config.cspDirectives || Object.keys(config.cspDirectives).length === 0)) {
        errors.push('CSP directives must be specified when CSP is enabled');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
export const securityConfig = getSecurityConfig();
