import { ApiResponse } from '../types.js';

export class ResponseFormatter {
  /**
   * Create a successful response
   */
  static success<T>(data?: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message })
    };
  }

  /**
   * Create an error response
   */
  static error(message: string, errorCode?: string, details?: any): ApiResponse {
    return {
      success: false,
      message,
      error: {
        code: errorCode || 'UNKNOWN_ERROR',
        details
      }
    };
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): ApiResponse<{
    items: T[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    return {
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
    };
  }

  /**
   * Create a response for created resources
   */
  static created<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message: message || 'Resource created successfully'
    };
  }

  /**
   * Create a response for updated resources
   */
  static updated<T>(data: T, message?: string): ApiResponse<T>;
  static updated(message?: string): ApiResponse;
  static updated<T>(dataOrMessage?: T | string, message?: string): ApiResponse<T> | ApiResponse {
    if (typeof dataOrMessage === 'string') {
      return {
        success: true,
        message: dataOrMessage || 'Resource updated successfully'
      };
    }

    return {
      success: true,
      data: dataOrMessage as T,
      message: message || 'Resource updated successfully'
    };
  }

  /**
   * Create a response for deleted resources
   */
  static deleted(message?: string): ApiResponse {
    return {
      success: true,
      message: message || 'Resource deleted successfully'
    };
  }

  /**
   * Create a response with no content
   */
  static noContent(message?: string): ApiResponse {
    return {
      success: true,
      message: message || 'Operation completed successfully'
    };
  }
}