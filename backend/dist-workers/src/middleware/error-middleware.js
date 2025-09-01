import { ErrorHandler } from '../utils/error-handler.js';
import { AppError, ErrorType } from '../types.js';
export async function errorMiddleware(fastify) {
    fastify.setErrorHandler(async (error, request, reply) => {
        fastify.log.error({
            error: error.message,
            stack: error.stack,
            url: request.url,
            method: request.method,
            headers: request.headers,
            body: request.body
        }, 'Request error occurred');
        if (error.validation) {
            const validationError = new AppError(ErrorType.VALIDATION_ERROR, 'Invalid request data', 400, error.validation);
            ErrorHandler.handleRouteError(reply, validationError);
            return;
        }
        if (error.statusCode === 413) {
            const fileError = new AppError(ErrorType.FILE_UPLOAD_ERROR, 'File size exceeds the maximum limit (10MB)', 413);
            ErrorHandler.handleRouteError(reply, fileError);
            return;
        }
        if (error.statusCode === 415) {
            const fileError = new AppError(ErrorType.FILE_UPLOAD_ERROR, 'Unsupported file type', 415);
            ErrorHandler.handleRouteError(reply, fileError);
            return;
        }
        if (error instanceof AppError) {
            ErrorHandler.handleRouteError(reply, error);
            return;
        }
        const unknownError = new AppError(ErrorType.SERVER_ERROR, 'Internal server error', 500);
        ErrorHandler.handleRouteError(reply, unknownError);
    });
    fastify.setNotFoundHandler(async (request, reply) => {
        const notFoundError = new AppError(ErrorType.NOT_FOUND_ERROR, `Route ${request.method} ${request.url} not found`, 404);
        ErrorHandler.handleRouteError(reply, notFoundError);
    });
}
export function asyncHandler(handler) {
    return async (request, reply) => {
        try {
            return await handler(request, reply);
        }
        catch (error) {
            ErrorHandler.handleRouteError(reply, error);
        }
    };
}
export class RequestValidator {
    static validateRequiredFields(body, requiredFields) {
        const missingFields = [];
        for (const field of requiredFields) {
            if (!body || body[field] === undefined || body[field] === null || body[field] === '') {
                missingFields.push(field);
            }
        }
        if (missingFields.length > 0) {
            throw ErrorHandler.createValidationError(`Missing required fields: ${missingFields.join(', ')}`, { missingFields });
        }
    }
    static validateDomainName(domain) {
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            throw ErrorHandler.createValidationError('Invalid domain name format', { domain });
        }
    }
    static validateProjectName(name) {
        const nameRegex = /^[a-zA-Z0-9-_]+$/;
        if (!nameRegex.test(name)) {
            throw ErrorHandler.createValidationError('Project name can only contain letters, numbers, hyphens, and underscores', { name });
        }
        if (name.length < 3 || name.length > 50) {
            throw ErrorHandler.createValidationError('Project name must be between 3 and 50 characters', { name, length: name.length });
        }
    }
    static validateFileUpload(file) {
        if (!file) {
            throw ErrorHandler.createFileUploadError('No file provided');
        }
        const maxSize = 10 * 1024 * 1024;
        if (file.file && file.file.bytesRead > maxSize) {
            throw ErrorHandler.createFileUploadError('File size exceeds the maximum limit of 10MB');
        }
        const allowedMimeTypes = ['application/zip', 'application/x-zip-compressed'];
        if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
            throw ErrorHandler.createFileUploadError('Only ZIP files are allowed');
        }
    }
}
