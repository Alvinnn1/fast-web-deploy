import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { CloudflareClient } from '../services/cloudflare-client.js'
import { AppError, ErrorType } from '../types.js'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('CloudflareClient', () => {
  let client: CloudflareClient
  let mockAxiosInstance: any

  beforeEach(() => {
    mockAxiosInstance = {
      request: vi.fn(),
      post: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn()
        }
      }
    }

    mockedAxios.create.mockReturnValue(mockAxiosInstance)
    client = new CloudflareClient()
  })

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.cloudflare.com/client/v4',
        headers: {
          'Authorization': 'Bearer F_Ce0FBCmUmaRF0REv11Jt81TgQGMMgEbXKhv37Z',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })
    })

    it('should set up response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })
  })

  describe('getZones', () => {
    it('should return zones on successful response', async () => {
      const mockZones = [
        {
          id: 'zone1',
          name: 'example.com',
          status: 'active',
          name_servers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
          created_on: '2023-01-01T00:00:00Z',
          modified_on: '2023-01-01T00:00:00Z'
        }
      ]

      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          errors: [],
          messages: [],
          result: mockZones
        },
        status: 200
      })

      const result = await client.getZones()

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/zones',
        data: undefined
      })
      expect(result).toEqual(mockZones)
    })

    it('should throw AppError when Cloudflare API returns error', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: false,
          errors: [{ code: 1001, message: 'Invalid API token' }],
          messages: [],
          result: null
        },
        status: 401
      })

      await expect(client.getZones()).rejects.toThrow(AppError)
      await expect(client.getZones()).rejects.toThrow('Invalid API token')
    })
  })

  describe('createZone', () => {
    it('should create zone with name only', async () => {
      const mockZone = {
        id: 'zone1',
        name: 'example.com',
        status: 'pending',
        name_servers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
        created_on: '2023-01-01T00:00:00Z',
        modified_on: '2023-01-01T00:00:00Z'
      }

      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          errors: [],
          messages: [],
          result: mockZone
        },
        status: 200
      })

      const result = await client.createZone('example.com')

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/zones',
        data: { name: 'example.com' }
      })
      expect(result).toEqual(mockZone)
    })

    it('should create zone with custom nameservers', async () => {
      const mockZone = {
        id: 'zone1',
        name: 'example.com',
        status: 'pending',
        name_servers: ['ns1.example.com', 'ns2.example.com'],
        created_on: '2023-01-01T00:00:00Z',
        modified_on: '2023-01-01T00:00:00Z'
      }

      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          errors: [],
          messages: [],
          result: mockZone
        },
        status: 200
      })

      const nameservers = ['ns1.example.com', 'ns2.example.com']
      const result = await client.createZone('example.com', nameservers)

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/zones',
        data: {
          name: 'example.com',
          name_servers: nameservers
        }
      })
      expect(result).toEqual(mockZone)
    })
  })

  describe('getDNSRecords', () => {
    it('should return DNS records for a zone', async () => {
      const mockRecords = [
        {
          id: 'record1',
          type: 'A',
          name: 'example.com',
          content: '192.168.1.1',
          ttl: 300,
          proxied: true,
          created_on: '2023-01-01T00:00:00Z',
          modified_on: '2023-01-01T00:00:00Z'
        }
      ]

      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          errors: [],
          messages: [],
          result: mockRecords
        },
        status: 200
      })

      const result = await client.getDNSRecords('zone1')

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/zones/zone1/dns_records',
        data: undefined
      })
      expect(result).toEqual(mockRecords)
    })
  })

  describe('createDNSRecord', () => {
    it('should create DNS record', async () => {
      const recordData = {
        type: 'A',
        name: 'subdomain.example.com',
        content: '192.168.1.1',
        ttl: 300,
        proxied: false
      }

      const mockRecord = {
        id: 'record1',
        ...recordData,
        created_on: '2023-01-01T00:00:00Z',
        modified_on: '2023-01-01T00:00:00Z'
      }

      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          errors: [],
          messages: [],
          result: mockRecord
        },
        status: 200
      })

      const result = await client.createDNSRecord('zone1', recordData)

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/zones/zone1/dns_records',
        data: recordData
      })
      expect(result).toEqual(mockRecord)
    })
  })

  describe('verifyToken', () => {
    it('should return true for valid token', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          errors: [],
          messages: [],
          result: { status: 'active' }
        },
        status: 200
      })

      const result = await client.verifyToken()

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/user/tokens/verify',
        data: undefined
      })
      expect(result).toBe(true)
    })

    it('should return false for invalid token', async () => {
      mockAxiosInstance.request.mockRejectedValue(new Error('Unauthorized'))

      const result = await client.verifyToken()
      expect(result).toBe(false)
    })
  })

  describe('getAccountId', () => {
    it('should return first account ID', async () => {
      const mockAccounts = [
        { id: 'account1', name: 'My Account' },
        { id: 'account2', name: 'Another Account' }
      ]

      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          errors: [],
          messages: [],
          result: mockAccounts
        },
        status: 200
      })

      const result = await client.getAccountId()

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/accounts',
        data: undefined
      })
      expect(result).toBe('account1')
    })

    it('should throw error when no accounts found', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          errors: [],
          messages: [],
          result: []
        },
        status: 200
      })

      await expect(client.getAccountId()).rejects.toThrow(AppError)
      await expect(client.getAccountId()).rejects.toThrow('No Cloudflare accounts found')
    })
  })

  describe('checkMissingAssets', () => {
    it('should check missing assets with JWT token', async () => {
      const mockResponse = {
        result: ['hash1', 'hash2'],
        success: true
      }

      const mockJwtClient = {
        post: vi.fn().mockResolvedValue({ data: mockResponse })
      }

      mockedAxios.create.mockReturnValueOnce(mockJwtClient as any)

      const result = await client.checkMissingAssets('test-jwt-token', ['hash1', 'hash2', 'hash3'])

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.cloudflare.com/client/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-token'
        },
        timeout: 30000
      })

      expect(mockJwtClient.post).toHaveBeenCalledWith(
        '/client/v4/pages/assets/check-missing',
        { hashes: ['hash1', 'hash2', 'hash3'] }
      )

      expect(result).toEqual(mockResponse)
    })

    it('should handle authentication errors for checkMissingAssets', async () => {
      const mockJwtClient = {
        post: vi.fn().mockRejectedValue({
          isAxiosError: true,
          response: {
            status: 401,
            data: { errors: [{ message: 'Invalid JWT token' }] }
          }
        })
      }

      mockedAxios.create.mockReturnValueOnce(mockJwtClient as any)
      mockedAxios.isAxiosError.mockReturnValue(true)

      await expect(client.checkMissingAssets('invalid-jwt', ['hash1'])).rejects.toThrow(AppError)
      await expect(client.checkMissingAssets('invalid-jwt', ['hash1'])).rejects.toMatchObject({
        type: ErrorType.AUTHENTICATION_ERROR,
        statusCode: 401
      })
    })
  })

  describe('uploadAssets', () => {
    it('should upload assets with JWT token', async () => {
      const mockPayload = [
        {
          base64: true,
          key: 'test-file.txt',
          metadata: { contentType: 'text/plain' },
          value: 'dGVzdCBjb250ZW50'
        }
      ]

      const mockResponse = {
        result: {
          successful_key_count: 1,
          unsuccessful_keys: []
        },
        success: true
      }

      const mockJwtClient = {
        post: vi.fn().mockResolvedValue({ data: mockResponse })
      }

      mockedAxios.create.mockReturnValueOnce(mockJwtClient as any)

      const result = await client.uploadAssets('test-jwt-token', mockPayload)

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.cloudflare.com/client/v4',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-jwt-token'
        },
        timeout: 60000
      })

      expect(mockJwtClient.post).toHaveBeenCalledWith(
        '/client/v4/pages/assets/upload',
        mockPayload
      )

      expect(result).toEqual(mockResponse)
    })

    it('should handle authentication errors for uploadAssets', async () => {
      const mockJwtClient = {
        post: vi.fn().mockRejectedValue({
          isAxiosError: true,
          response: {
            status: 403,
            data: { errors: [{ message: 'Expired JWT token' }] }
          }
        })
      }

      mockedAxios.create.mockReturnValueOnce(mockJwtClient as any)
      mockedAxios.isAxiosError.mockReturnValue(true)

      const mockPayload = [
        {
          base64: true,
          key: 'test.txt',
          metadata: { contentType: 'text/plain' },
          value: 'test'
        }
      ]

      await expect(client.uploadAssets('expired-jwt', mockPayload)).rejects.toThrow(AppError)
      await expect(client.uploadAssets('expired-jwt', mockPayload)).rejects.toMatchObject({
        type: ErrorType.AUTHENTICATION_ERROR,
        statusCode: 403
      })
    })

    it('should handle network errors for uploadAssets', async () => {
      const mockJwtClient = {
        post: vi.fn().mockRejectedValue({
          isAxiosError: true,
          request: {},
          message: 'Network timeout'
        })
      }

      mockedAxios.create.mockReturnValueOnce(mockJwtClient as any)
      mockedAxios.isAxiosError.mockReturnValue(true)

      const mockPayload = [
        {
          base64: true,
          key: 'test.txt',
          metadata: { contentType: 'text/plain' },
          value: 'test'
        }
      ]

      await expect(client.uploadAssets('test-jwt', mockPayload)).rejects.toThrow(AppError)
      await expect(client.uploadAssets('test-jwt', mockPayload)).rejects.toMatchObject({
        type: ErrorType.NETWORK_ERROR,
        statusCode: 0
      })
    })
  })

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      const error = {
        response: {
          status: 401,
          data: {
            success: false,
            errors: [{ code: 10000, message: 'Authentication error' }],
            messages: [],
            result: null
          }
        }
      }

      mockAxiosInstance.request.mockRejectedValue(error)

      await expect(client.getZones()).rejects.toThrow(AppError)
      await expect(client.getZones()).rejects.toMatchObject({
        type: ErrorType.AUTHENTICATION_ERROR,
        statusCode: 401
      })
    })

    it('should handle network errors', async () => {
      const error = {
        request: {},
        message: 'Network Error'
      }

      mockAxiosInstance.request.mockRejectedValue(error)

      await expect(client.getZones()).rejects.toThrow(AppError)
      await expect(client.getZones()).rejects.toMatchObject({
        type: ErrorType.NETWORK_ERROR,
        statusCode: 0
      })
    })

    it('should handle server errors', async () => {
      const error = {
        response: {
          status: 500,
          data: {
            success: false,
            errors: [{ code: 1000, message: 'Internal server error' }],
            messages: [],
            result: null
          }
        }
      }

      mockAxiosInstance.request.mockRejectedValue(error)

      await expect(client.getZones()).rejects.toThrow(AppError)
      await expect(client.getZones()).rejects.toMatchObject({
        type: ErrorType.CLOUDFLARE_API_ERROR,
        statusCode: 500
      })
    })
  })
})