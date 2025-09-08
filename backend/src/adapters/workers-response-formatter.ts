/**
 * Workers Response Formatter - Adapts ResponseFormatter for Workers Response objects
 */

import { ApiResponse } from '../types.js'

export class WorkersResponseFormatter {
  /**
   * Create a successful response
   */
  static success<T>(data?: T, message?: string, status: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message })
    }

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * Create an error response
   */
  static error(message: string, errorCode?: string, status: number = 500, details?: any): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: {
        code: errorCode || 'UNKNOWN_ERROR',
        details
      }
    }

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * Create a bad request response (400)
   */
  static badRequest(message: string, details?: any): Response {
    return this.error(message, 'VALIDATION_ERROR', 400, details)
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
    status: number = 200
  ): Response {
    const response: ApiResponse<{
      items: T[]
      pagination: {
        total: number
        page: number
        limit: number
        totalPages: number
      }
    }> = {
      success: true,
      data: {
        items: data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      },
      ...(message && { message })
    }

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * Create a response for created resources
   */
  static created<T>(data: T, message?: string): Response {
    return this.success(data, message || 'Resource created successfully', 201)
  }

  /**
   * Create a response for updated resources
   */
  static updated<T>(data?: T, message?: string): Response {
    if (data !== undefined) {
      return this.success(data, message || 'Resource updated successfully', 200)
    }
    return this.success(undefined, message || 'Resource updated successfully', 200)
  }

  /**
   * Create a response for deleted resources
   */
  static deleted(message?: string): Response {
    return this.success(undefined, message || 'Resource deleted successfully', 200)
  }

  /**
   * Create a response with no content
   */
  static noContent(message?: string): Response {
    return this.success(undefined, message || 'Operation completed successfully', 204)
  }

  /**
   * Create a validation error response
   */
  static validationError(message: string, details?: any): Response {
    return this.error(message, 'VALIDATION_ERROR', 400, details)
  }

  /**
   * Create a not found error response
   */
  static notFound(message: string = 'Resource not found'): Response {
    return this.error(message, 'NOT_FOUND', 404)
  }

  /**
   * Create an unauthorized error response
   */
  static unauthorized(message: string = 'Unauthorized'): Response {
    return this.error(message, 'UNAUTHORIZED', 401)
  }

  /**
   * Create a forbidden error response
   */
  static forbidden(message: string = 'Forbidden'): Response {
    return this.error(message, 'FORBIDDEN', 403)
  }
}