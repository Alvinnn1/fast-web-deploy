import { describe, it, expect } from 'vitest';
import { ResponseFormatter } from '../utils/response-formatter.js';

describe('ResponseFormatter', () => {
  describe('success', () => {
    it('should create successful response with data', () => {
      const data = { id: 1, name: 'test' };
      const result = ResponseFormatter.success(data, 'Success message');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.message).toBe('Success message');
      expect(result.error).toBeUndefined();
    });

    it('should create successful response without data', () => {
      const result = ResponseFormatter.success();

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.message).toBeUndefined();
    });
  });

  describe('error', () => {
    it('should create error response', () => {
      const result = ResponseFormatter.error('Error message', 'ERROR_CODE', { field: 'name' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error message');
      expect(result.error?.code).toBe('ERROR_CODE');
      expect(result.error?.details).toEqual({ field: 'name' });
    });

    it('should create error response with default error code', () => {
      const result = ResponseFormatter.error('Error message');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error message');
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('created', () => {
    it('should create created response', () => {
      const data = { id: 1, name: 'new item' };
      const result = ResponseFormatter.created(data, 'Item created');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.message).toBe('Item created');
    });

    it('should create created response with default message', () => {
      const data = { id: 1 };
      const result = ResponseFormatter.created(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.message).toBe('Resource created successfully');
    });
  });

  describe('paginated', () => {
    it('should create paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = ResponseFormatter.paginated(items, 10, 1, 5, 'Paginated data');

      expect(result.success).toBe(true);
      expect(result.data?.items).toEqual(items);
      expect(result.data?.pagination).toEqual({
        total: 10,
        page: 1,
        limit: 5,
        totalPages: 2
      });
      expect(result.message).toBe('Paginated data');
    });
  });

  describe('updated', () => {
    it('should create updated response', () => {
      const data = { id: 1, name: 'updated' };
      const result = ResponseFormatter.updated(data, 'Item updated');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.message).toBe('Item updated');
    });
  });

  describe('deleted', () => {
    it('should create deleted response', () => {
      const result = ResponseFormatter.deleted('Item deleted');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Item deleted');
    });
  });

  describe('noContent', () => {
    it('should create no content response', () => {
      const result = ResponseFormatter.noContent('Operation completed');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Operation completed');
    });
  });
});