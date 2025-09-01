export class WorkersRateLimiter {
    store = new Map();
    cleanupInterval = 60000;
    constructor() {
        setInterval(() => this.cleanup(), this.cleanupInterval);
    }
    async checkRateLimit(key, config) {
        const now = Date.now();
        const rateLimitKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
        let state = this.store.get(rateLimitKey);
        if (!state || state.resetTime <= now) {
            state = {
                count: 0,
                resetTime: now + config.window
            };
        }
        const allowed = state.count < config.max;
        if (allowed) {
            state.count++;
            this.store.set(rateLimitKey, state);
        }
        return {
            allowed,
            remaining: Math.max(0, config.max - state.count),
            resetTime: state.resetTime,
            totalHits: state.count
        };
    }
    async globalRateLimit(key) {
        return this.checkRateLimit(key, {
            max: 100,
            window: 900000,
            keyPrefix: 'global'
        });
    }
    async strictRateLimit(key) {
        return this.checkRateLimit(key, {
            max: 10,
            window: 60000,
            keyPrefix: 'strict'
        });
    }
    async apiRateLimit(key, endpoint) {
        const limits = this.getEndpointLimits(endpoint);
        return this.checkRateLimit(key, {
            max: limits.max,
            window: limits.window,
            keyPrefix: `api:${endpoint}`
        });
    }
    async burstRateLimit(key) {
        return this.checkRateLimit(key, {
            max: 20,
            window: 10000,
            keyPrefix: 'burst'
        });
    }
    getEndpointLimits(endpoint) {
        const endpointLimits = {
            '/api/domains': { max: 30, window: 300000 },
            '/api/domains/create': { max: 5, window: 300000 },
            '/api/domains/delete': { max: 10, window: 300000 },
            '/api/pages': { max: 50, window: 300000 },
            '/api/pages/deploy': { max: 10, window: 600000 },
            '/api/pages/upload': { max: 5, window: 300000 },
            '/api/dns': { max: 20, window: 300000 },
            '/api/dns/records': { max: 30, window: 300000 },
            '/health': { max: 100, window: 60000 },
            '/api/test': { max: 50, window: 60000 },
            'default': { max: 60, window: 300000 }
        };
        return endpointLimits[endpoint] || endpointLimits['default'];
    }
    async checkMultipleRateLimits(key, checks) {
        const results = {};
        for (const check of checks) {
            results[check.name] = await this.checkRateLimit(key, check.config);
        }
        return results;
    }
    async getRateLimitStatus(key, endpoint) {
        const [global, strict, api, burst] = await Promise.all([
            this.globalRateLimit(key),
            this.strictRateLimit(key),
            this.apiRateLimit(key, endpoint),
            this.burstRateLimit(key)
        ]);
        return {
            global,
            strict,
            api,
            burst,
            allowed: global.allowed && strict.allowed && api.allowed && burst.allowed
        };
    }
    resetRateLimit(key, prefix) {
        const rateLimitKey = prefix ? `${prefix}:${key}` : key;
        this.store.delete(rateLimitKey);
    }
    resetAllRateLimits(key) {
        const keysToDelete = [];
        for (const storeKey of this.store.keys()) {
            if (storeKey.endsWith(`:${key}`) || storeKey === key) {
                keysToDelete.push(storeKey);
            }
        }
        keysToDelete.forEach(k => this.store.delete(k));
    }
    getRateLimitStats() {
        const now = Date.now();
        let activeKeys = 0;
        for (const state of this.store.values()) {
            if (state.resetTime > now) {
                activeKeys++;
            }
        }
        return {
            totalKeys: this.store.size,
            activeKeys,
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        for (const [key, state] of this.store.entries()) {
            if (state.resetTime <= now) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.store.delete(key));
        if (keysToDelete.length > 0) {
            console.log(`[RateLimiter] Cleaned up ${keysToDelete.length} expired entries`);
        }
    }
    estimateMemoryUsage() {
        return this.store.size * 100;
    }
    setCleanupInterval(interval) {
        this.cleanupInterval = interval;
    }
    manualCleanup() {
        const sizeBefore = this.store.size;
        this.cleanup();
        return sizeBefore - this.store.size;
    }
}
export const workersRateLimiter = new WorkersRateLimiter();
