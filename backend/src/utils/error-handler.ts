import { FastifyReply } from 'fastify';
import { AppError, ErrorType, ApiResponse, UserFriendlyError } from '../types.js';

export class ErrorHandler {
  /**
   * Convert various error types to user-friendly errors
   */
  static toUserFriendlyError(error: any): UserFriendlyError {
    if (error instanceof AppError) {
      switch (error.type) {
        case ErrorType.NETWORK_ERROR:
          return {
            title: '网络连接错误',
            message: '请检查网络连接后重试',
            action: 'retry'
          };
        case ErrorType.CLOUDFLARE_API_ERROR:
          return {
            title: 'Cloudflare服务错误',
            message: error.message || '服务暂时不可用，请稍后重试',
            action: 'retry'
          };
        case ErrorType.FILE_UPLOAD_ERROR:
          return {
            title: '文件上传失败',
            message: '请检查文件格式和大小（需小于10MB）',
            action: 'retry'
          };
        case ErrorType.VALIDATION_ERROR:
          return {
            title: '输入验证失败',
            message: error.message || '请检查输入信息是否正确',
            action: 'none'
          };
        case ErrorType.AUTHENTICATION_ERROR:
          return {
            title: 'API认证错误',
            message: 'Cloudflare API连接失败，请联系管理员',
            action: 'contact_support'
          };
        case ErrorType.DATABASE_ERROR:
          return {
            title: '数据库错误',
            message: '数据保存失败，请重试',
            action: 'retry'
          };
        case ErrorType.NOT_FOUND_ERROR:
          return {
            title: '资源未找到',
            message: error.message || '请求的资源不存在',
            action: 'none'
          };
        default:
          return {
            title: '操作失败',
            message: '发生未知错误，请重试',
            action: 'retry'
          };
      }
    }

    // Handle other error types
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        title: '网络连接错误',
        message: '无法连接到服务器，请检查网络连接',
        action: 'retry'
      };
    }

    return {
      title: '系统错误',
      message: '发生未知错误，请重试或联系支持',
      action: 'contact_support'
    };
  }

  /**
   * Handle errors in Fastify routes
   */
  static handleRouteError(reply: FastifyReply, error: any): void {
    const userFriendlyError = this.toUserFriendlyError(error);

    let statusCode = 500;
    let errorCode = ErrorType.SERVER_ERROR;

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      errorCode = error.type;
    }

    const response: ApiResponse = {
      success: false,
      message: userFriendlyError.message,
      error: {
        code: errorCode,
        details: error instanceof AppError ? error.details : undefined
      }
    };

    reply.status(statusCode).send(response);
  }

  /**
   * Create validation error
   */
  static createValidationError(message: string, details?: any): AppError {
    return new AppError(ErrorType.VALIDATION_ERROR, message, 400, details);
  }

  /**
   * Create not found error
   */
  static createNotFoundError(resource: string): AppError {
    return new AppError(
      ErrorType.NOT_FOUND_ERROR,
      `${resource} not found`,
      404
    );
  }

  /**
   * Create Cloudflare API error
   */
  static createCloudflareError(message: string, details?: any): AppError {
    return new AppError(
      ErrorType.CLOUDFLARE_API_ERROR,
      message,
      502,
      details
    );
  }

  /**
   * Create file upload error
   */
  static createFileUploadError(message: string): AppError {
    return new AppError(ErrorType.FILE_UPLOAD_ERROR, message, 400);
  }

  /**
   * Create database error
   */
  static createDatabaseError(message: string, details?: any): AppError {
    return new AppError(ErrorType.DATABASE_ERROR, message, 500, details);
  }
}