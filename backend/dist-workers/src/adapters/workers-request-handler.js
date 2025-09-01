export class WorkersRequestHandler {
    static async getJsonBody(request) {
        try {
            const body = await request.json();
            return body;
        }
        catch (error) {
            throw new Error('Invalid JSON in request body');
        }
    }
    static async getTextBody(request) {
        try {
            return await request.text();
        }
        catch (error) {
            throw new Error('Unable to read request body');
        }
    }
    static async getFormData(request) {
        try {
            return await request.formData();
        }
        catch (error) {
            throw new Error('Invalid FormData in request body');
        }
    }
    static getQueryParams(request) {
        const url = new URL(request.url);
        return url.searchParams;
    }
    static getPathParams(pathname, pattern) {
        const pathParts = pathname.split('/').filter(Boolean);
        const patternParts = pattern.split('/').filter(Boolean);
        const params = {};
        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            if (patternPart.startsWith(':')) {
                const paramName = patternPart.slice(1);
                params[paramName] = pathParts[i] || '';
            }
        }
        return params;
    }
    static matchesPattern(pathname, pattern) {
        const pathParts = pathname.split('/').filter(Boolean);
        const patternParts = pattern.split('/').filter(Boolean);
        if (pathParts.length !== patternParts.length) {
            return false;
        }
        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];
            if (!patternPart.startsWith(':') && patternPart !== pathPart) {
                return false;
            }
        }
        return true;
    }
    static validateMethod(request, allowedMethods) {
        return allowedMethods.includes(request.method.toUpperCase());
    }
    static getHeaders(request) {
        const headers = {};
        request.headers.forEach((value, key) => {
            headers[key] = value;
        });
        return headers;
    }
    static hasHeader(request, headerName) {
        return request.headers.has(headerName.toLowerCase());
    }
    static getHeader(request, headerName) {
        return request.headers.get(headerName.toLowerCase());
    }
    static isJsonRequest(request) {
        const contentType = this.getHeader(request, 'content-type');
        return contentType?.includes('application/json') || false;
    }
    static isFormDataRequest(request) {
        const contentType = this.getHeader(request, 'content-type');
        return contentType?.includes('multipart/form-data') || false;
    }
    static getClientIP(request) {
        const cfConnectingIP = this.getHeader(request, 'cf-connecting-ip');
        const xForwardedFor = this.getHeader(request, 'x-forwarded-for');
        const xRealIP = this.getHeader(request, 'x-real-ip');
        return cfConnectingIP || xForwardedFor?.split(',')[0]?.trim() || xRealIP || null;
    }
    static getUserAgent(request) {
        return this.getHeader(request, 'user-agent');
    }
    static isMobileRequest(request) {
        const userAgent = this.getUserAgent(request);
        if (!userAgent)
            return false;
        const mobileRegex = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        return mobileRegex.test(userAgent);
    }
    static getOrigin(request) {
        return this.getHeader(request, 'origin');
    }
    static getReferer(request) {
        return this.getHeader(request, 'referer');
    }
    static getCookies(request) {
        const cookieHeader = this.getHeader(request, 'cookie');
        if (!cookieHeader)
            return {};
        const cookies = {};
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = decodeURIComponent(value);
            }
        });
        return cookies;
    }
    static getCookie(request, name) {
        const cookies = this.getCookies(request);
        return cookies[name] || null;
    }
}
