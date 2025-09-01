/**
 * Workers Request Handler - Handles HTTP request/response conversion for Workers
 */

export class WorkersRequestHandler {
  /**
   * Extract JSON body from Request
   */
  static async getJsonBody<T = any>(request: Request): Promise<T> {
    try {
      const body = await request.json()
      return body as T
    } catch (error) {
      throw new Error('Invalid JSON in request body')
    }
  }

  /**
   * Extract text body from Request
   */
  static async getTextBody(request: Request): Promise<string> {
    try {
      return await request.text()
    } catch (error) {
      throw new Error('Unable to read request body')
    }
  }

  /**
   * Extract FormData from Request
   */
  static async getFormData(request: Request): Promise<FormData> {
    try {
      return await request.formData()
    } catch (error) {
      throw new Error('Invalid FormData in request body')
    }
  }

  /**
   * Get query parameters from URL
   */
  static getQueryParams(request: Request): URLSearchParams {
    const url = new URL(request.url)
    return url.searchParams
  }

  /**
   * Get path parameters from URL pattern
   */
  static getPathParams(pathname: string, pattern: string): Record<string, string> {
    const pathParts = pathname.split('/').filter(Boolean)
    const patternParts = pattern.split('/').filter(Boolean)
    const params: Record<string, string> = {}

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i]!
      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1)
        params[paramName] = pathParts[i] || ''
      }
    }

    return params
  }

  /**
   * Check if pathname matches pattern
   */
  static matchesPattern(pathname: string, pattern: string): boolean {
    const pathParts = pathname.split('/').filter(Boolean)
    const patternParts = pattern.split('/').filter(Boolean)

    if (pathParts.length !== patternParts.length) {
      return false
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i]!
      const pathPart = pathParts[i]

      if (!patternPart.startsWith(':') && patternPart !== pathPart) {
        return false
      }
    }

    return true
  }

  /**
   * Validate request method
   */
  static validateMethod(request: Request, allowedMethods: string[]): boolean {
    return allowedMethods.includes(request.method.toUpperCase())
  }

  /**
   * Get request headers as object
   */
  static getHeaders(request: Request): Record<string, string> {
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  }

  /**
   * Check if request has specific header
   */
  static hasHeader(request: Request, headerName: string): boolean {
    return request.headers.has(headerName.toLowerCase())
  }

  /**
   * Get specific header value
   */
  static getHeader(request: Request, headerName: string): string | null {
    return request.headers.get(headerName.toLowerCase())
  }

  /**
   * Check if request is JSON
   */
  static isJsonRequest(request: Request): boolean {
    const contentType = this.getHeader(request, 'content-type')
    return contentType?.includes('application/json') || false
  }

  /**
   * Check if request is form data
   */
  static isFormDataRequest(request: Request): boolean {
    const contentType = this.getHeader(request, 'content-type')
    return contentType?.includes('multipart/form-data') || false
  }

  /**
   * Get client IP address (in Workers environment)
   */
  static getClientIP(request: Request): string | null {
    // In Cloudflare Workers, the client IP is available in the CF object
    const cfConnectingIP = this.getHeader(request, 'cf-connecting-ip')
    const xForwardedFor = this.getHeader(request, 'x-forwarded-for')
    const xRealIP = this.getHeader(request, 'x-real-ip')

    return cfConnectingIP || xForwardedFor?.split(',')[0]?.trim() || xRealIP || null
  }

  /**
   * Get user agent
   */
  static getUserAgent(request: Request): string | null {
    return this.getHeader(request, 'user-agent')
  }

  /**
   * Check if request is from mobile device
   */
  static isMobileRequest(request: Request): boolean {
    const userAgent = this.getUserAgent(request)
    if (!userAgent) return false

    const mobileRegex = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    return mobileRegex.test(userAgent)
  }

  /**
   * Get request origin
   */
  static getOrigin(request: Request): string | null {
    return this.getHeader(request, 'origin')
  }

  /**
   * Get referer
   */
  static getReferer(request: Request): string | null {
    return this.getHeader(request, 'referer')
  }

  /**
   * Parse cookies from request
   */
  static getCookies(request: Request): Record<string, string> {
    const cookieHeader = this.getHeader(request, 'cookie')
    if (!cookieHeader) return {}

    const cookies: Record<string, string> = {}
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookies[name] = decodeURIComponent(value)
      }
    })

    return cookies
  }

  /**
   * Get specific cookie value
   */
  static getCookie(request: Request, name: string): string | null {
    const cookies = this.getCookies(request)
    return cookies[name] || null
  }
}