import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ErrorHandler } from '../utils/error-handler.js';
import { AppError, ErrorType } from '../types.js';

/**
 * Global error handler middleware for Fastify
 */
export async function errorMiddleware(fastify: FastifyInstance) {
  // Set error handler
  fastify.setErrorHandler(async (error: any, request: FastifyRequest, reply: FastifyReply) => {
    // Log the error
    fastify.log.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body
    }, 'Request error occurred');

    // Handle different types of errors
    if (error.validation) {
      // Fastify validation errors
      const validationError = new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid request data',
        400,
        error.validation
      );
      ErrorHandler.handleRouteError(reply, validationError);
      return;
    }

    if (error.statusCode === 413) {
      // File too large error
      const fileError = new AppError(
        ErrorType.FILE_UPLOAD_ERROR,
        'File size exceeds the maximum limit (10MB)',
        413
      );
      ErrorHandler.handleRouteError(reply, fileError);
      return;
    }

    if (error.statusCode === 415) {
      // Unsupported media type
      const fileError = new AppError(
        ErrorType.FILE_UPLOAD_ERROR,
        'Unsupported file type',
        415
      );
      ErrorHandler.handleRouteError(reply, fileError);
      return;
    }

    // Handle custom AppError instances
    if (error instanceof AppError) {
      ErrorHandler.handleRouteError(reply, error);
      return;
    }

    // Handle unknown errors
    const unknownError = new AppError(
      ErrorType.SERVER_ERROR,
      'Internal server error',
      500
    );
    ErrorHandler.handleRouteError(reply, unknownError);
  });

  // Add not found handler
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const notFoundError = new AppError(
      ErrorType.NOT_FOUND_ERROR,
      `Route ${request.method} ${request.url} not found`,
      404
    );
    ErrorHandler.handleRouteError(reply, notFoundError);
  });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(request, reply);
    } catch (error) {
      ErrorHandler.handleRouteError(reply, error);
    }
  };
}

/**
 * Validation helper for request data
 */
export class RequestValidator {
  /**
   * Validate required fields in request body
   */
  static validateRequiredFields(body: any, requiredFields: string[]): void {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!body || body[field] === undefined || body[field] === null || body[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw ErrorHandler.createValidationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        { missingFields }
      );
    }
  }

  /**
   * Validate domain name format
   */
  static validateDomainName(domain: string): void {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!domainRegex.test(domain)) {
      throw ErrorHandler.createValidationError(
        'Invalid domain name format',
        { domain }
      );
    }
  }

  /**
   * Validate project name format
   */
  static validateProjectName(name: string): void {
    const nameRegex = /^[a-zA-Z0-9-_]+$/;

    if (!nameRegex.test(name)) {
      throw ErrorHandler.createValidationError(
        'Project name can only contain letters, numbers, hyphens, and underscores',
        { name }
      );
    }

    if (name.length < 3 || name.length > 50) {
      throw ErrorHandler.createValidationError(
        'Project name must be between 3 and 50 characters',
        { name, length: name.length }
      );
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: any): void {
    if (!file) {
      throw ErrorHandler.createFileUploadError('No file provided');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.file && file.file.bytesRead > maxSize) {
      throw ErrorHandler.createFileUploadError(
        'File size exceeds the maximum limit of 10MB'
      );
    }

    // Check file type (should be ZIP)
    const allowedMimeTypes = ['application/zip', 'application/x-zip-compressed'];
    if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
      throw ErrorHandler.createFileUploadError(
        'Only ZIP files are allowed'
      );
    }
  }
}