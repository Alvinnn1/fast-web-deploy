import { describe, it, expect } from 'vitest';
import { ErrorHandler } from '../utils/error-handler.js';
import { AppError, ErrorType } from '../types.js';

describe('ErrorHandler', () => {
  describe('toUserFriendlyError', () => {
    it('should handle network errors correctly', () => {
      const error = new AppError(ErrorType.NETWORK_ERROR, 'Connection failed');
      const result = ErrorHandler.toUserFriendlyError(error);

      expect(result.title).toBe('网络连接错误');
      expect(result.message).toBe('请检查网络连接后重试');
      expect(result.action).toBe('retry');
    });

    it('should handle Cloudflare API errors correctly', () => {
      const error = new AppError(ErrorType.CLOUDFLARE_API_ERROR, 'API rate limit exceeded');
      const result = ErrorHandler.toUserFriendlyError(error);

      expect(result.title).toBe('Cloudflare服务错误');
      expect(result.message).toBe('API rate limit exceeded');
      expect(result.action).toBe('retry');
    });

    it('should handle file upload errors correctly', () => {
      const error = new AppError(ErrorType.FILE_UPLOAD_ERROR, 'File too large');
      const result = ErrorHandler.toUserFriendlyError(error);

      expect(result.title).toBe('文件上传失败');
      expect(result.message).toBe('请检查文件格式和大小（需小于10MB）');
      expect(result.action).toBe('retry');
    });

    it('should handle validation errors correctly', () => {
      const error = new AppError(ErrorType.VALIDATION_ERROR, 'Invalid domain name');
      const result = ErrorHandler.toUserFriendlyError(error);

      expect(result.title).toBe('输入验证失败');
      expect(result.message).toBe('Invalid domain name');
      expect(result.action).toBe('none');
    });

    it('should handle unknown errors correctly', () => {
      const error = new Error('Unknown error');
      const result = ErrorHandler.toUserFriendlyError(error);

      expect(result.title).toBe('系统错误');
      expect(result.message).toBe('发生未知错误，请重试或联系支持');
      expect(result.action).toBe('contact_support');
    });
  });

  describe('error creation methods', () => {
    it('should create validation error correctly', () => {
      const error = ErrorHandler.createValidationError('Invalid input', { field: 'name' });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'name' });
    });

    it('should create not found error correctly', () => {
      const error = ErrorHandler.createNotFoundError('Domain');

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.NOT_FOUND_ERROR);
      expect(error.message).toBe('Domain not found');
      expect(error.statusCode).toBe(404);
    });

    it('should create Cloudflare error correctly', () => {
      const error = ErrorHandler.createCloudflareError('API error', { code: 1001 });

      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.CLOUDFLARE_API_ERROR);
      expect(error.message).toBe('API error');
      expect(error.statusCode).toBe(502);
      expect(error.details).toEqual({ code: 1001 });
    });
  });
});