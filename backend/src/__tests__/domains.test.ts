import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { domainsRoutes } from '../routes/domains.js'
import { cloudflareClient } from '../services/cloudflare-client.js'

// Mock the cloudflare client
vi.mock('../services/cloudflare-client.js', () => ({
  cloudflareClient: {
    getZones: vi.fn(),
    createZone: vi.fn(),
    getZone: vi.fn(),
    getDNSRecords: vi.fn(),
    createDNSRecord: vi.fn(),
    updateDNSRecord: vi.fn(),
    deleteDNSRecord: vi.fn(),
    getSSLCertificate: vi.fn(),
    requestSSLCertificate: vi.fn()
  }
}))

describe('Domains API Routes', () => {
  let fastify: any

  beforeEach(async () => {
    fastify = Fastify()
    await fastify.register(domainsRoutes)
    vi.clearAllMocks()
  })

  describe('GET /api/domains', () => {
    it('should return list of domains successfully', async () => {
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

      vi.mocked(cloudflareClient.getZones).mockResolvedValue(mockZones)

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/domains'
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.data[0]).toEqual({
        id: 'zone1',
        name: 'example.com',
        status: 'active',
        nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
        createdAt: '2023-01-01T00:00:00Z',
        modifiedAt: '2023-01-01T00:00:00Z'
      })
    })

    it('should handle cloudflare API errors', async () => {
      vi.mocked(cloudflareClient.getZones).mockRejectedValue(new Error('API Error'))

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/domains'
      })

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toBeDefined()
    })
  })

  describe('POST /api/domains', () => {
    it('should create domain successfully', async () => {
      const mockZone = {
        id: 'zone1',
        name: 'newdomain.com',
        status: 'pending',
        name_servers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
        created_on: '2023-01-01T00:00:00Z',
        modified_on: '2023-01-01T00:00:00Z'
      }

      vi.mocked(cloudflareClient.createZone).mockResolvedValue(mockZone)

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains',
        payload: {
          name: 'newdomain.com',
          nameservers: ['ns1.example.com', 'ns2.example.com']
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('newdomain.com')
      expect(cloudflareClient.createZone).toHaveBeenCalledWith('newdomain.com', ['ns1.example.com', 'ns2.example.com'])
    })

    it('should validate domain name format', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains',
        payload: {
          name: 'invalid-domain'
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('Invalid domain name format')
    })

    it('should require domain name', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains',
        payload: {}
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('Domain name is required')
    })
  })

  describe('GET /api/domains/:id', () => {
    it('should return domain details successfully', async () => {
      const mockZone = {
        id: 'zone1',
        name: 'example.com',
        status: 'active',
        name_servers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
        created_on: '2023-01-01T00:00:00Z',
        modified_on: '2023-01-01T00:00:00Z'
      }

      const mockDNSRecords = [
        {
          id: 'record1',
          type: 'A',
          name: 'example.com',
          content: '192.168.1.1',
          ttl: 300,
          proxied: true
        }
      ]

      vi.mocked(cloudflareClient.getZone).mockResolvedValue(mockZone)
      vi.mocked(cloudflareClient.getDNSRecords).mockResolvedValue(mockDNSRecords)
      vi.mocked(cloudflareClient.getSSLCertificate).mockRejectedValue(new Error('No SSL cert'))

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/domains/zone1'
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('example.com')
      expect(body.data.dnsRecords).toHaveLength(1)
      expect(body.data.sslCertificate).toBeUndefined()
    })
  })

  describe('POST /api/domains/:id/dns-records', () => {
    it('should create DNS record successfully', async () => {
      const mockCreatedRecord = {
        id: 'record2',
        type: 'A',
        name: 'subdomain.example.com',
        content: '192.168.1.3',
        ttl: 300,
        proxied: true
      }

      vi.mocked(cloudflareClient.createDNSRecord).mockResolvedValue(mockCreatedRecord)

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains/zone1/dns-records',
        payload: {
          type: 'A',
          name: 'subdomain.example.com',
          content: '192.168.1.3',
          ttl: 300,
          proxied: true
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('subdomain.example.com')
      expect(body.data.content).toBe('192.168.1.3')
      expect(cloudflareClient.createDNSRecord).toHaveBeenCalledWith('zone1', {
        type: 'A',
        name: 'subdomain.example.com',
        content: '192.168.1.3',
        ttl: 300,
        proxied: true
      })
    })

    it('should validate required fields', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains/zone1/dns-records',
        payload: {
          type: 'A',
          name: 'subdomain.example.com'
          // missing content
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('DNS record type, name, and content are required')
    })

    it('should validate DNS record type', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains/zone1/dns-records',
        payload: {
          type: 'INVALID',
          name: 'subdomain.example.com',
          content: '192.168.1.3'
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('Invalid DNS record type')
    })

    it('should validate name field', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains/zone1/dns-records',
        payload: {
          type: 'A',
          name: '',
          content: '192.168.1.3'
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('DNS record name must be a non-empty string')
    })

    it('should validate content field', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains/zone1/dns-records',
        payload: {
          type: 'A',
          name: 'subdomain.example.com',
          content: ''
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('DNS record content must be a non-empty string')
    })

    it('should validate TTL field', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains/zone1/dns-records',
        payload: {
          type: 'A',
          name: 'subdomain.example.com',
          content: '192.168.1.3',
          ttl: -1
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('TTL must be a positive number')
    })

    it('should validate proxied field', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains/zone1/dns-records',
        payload: {
          type: 'A',
          name: 'subdomain.example.com',
          content: '192.168.1.3',
          proxied: 'invalid'
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('Proxied setting must be a boolean')
    })

    it('should only apply proxied setting for A and AAAA records', async () => {
      const mockCreatedRecord = {
        id: 'record3',
        type: 'CNAME',
        name: 'cname.example.com',
        content: 'target.example.com',
        ttl: 300
      }

      vi.mocked(cloudflareClient.createDNSRecord).mockResolvedValue(mockCreatedRecord)

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains/zone1/dns-records',
        payload: {
          type: 'CNAME',
          name: 'cname.example.com',
          content: 'target.example.com',
          ttl: 300,
          proxied: true // Should be ignored for CNAME
        }
      })

      expect(response.statusCode).toBe(200)
      expect(cloudflareClient.createDNSRecord).toHaveBeenCalledWith('zone1', {
        type: 'CNAME',
        name: 'cname.example.com',
        content: 'target.example.com',
        ttl: 300
        // proxied should not be included
      })
    })
  })

  describe('PUT /api/domains/:id/dns-records/:recordId', () => {
    it('should update DNS record successfully', async () => {
      const mockUpdatedRecord = {
        id: 'record1',
        type: 'A',
        name: 'example.com',
        content: '192.168.1.2',
        ttl: 300,
        proxied: true
      }

      vi.mocked(cloudflareClient.updateDNSRecord).mockResolvedValue(mockUpdatedRecord)

      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/domains/zone1/dns-records/record1',
        payload: {
          type: 'A',
          name: 'example.com',
          content: '192.168.1.2',
          ttl: 300
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.content).toBe('192.168.1.2')
    })

    it('should validate DNS record type', async () => {
      const response = await fastify.inject({
        method: 'PUT',
        url: '/api/domains/zone1/dns-records/record1',
        payload: {
          type: 'INVALID',
          name: 'example.com',
          content: '192.168.1.2'
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toContain('Invalid DNS record type')
    })
  })

  describe('DELETE /api/domains/:id/dns-records/:recordId', () => {
    it('should delete DNS record successfully', async () => {
      vi.mocked(cloudflareClient.deleteDNSRecord).mockResolvedValue({ id: 'record1' })

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/domains/zone1/dns-records/record1'
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('record1')
      expect(body.message).toBe('DNS record deleted successfully')
      expect(cloudflareClient.deleteDNSRecord).toHaveBeenCalledWith('zone1', 'record1')
    })

    it('should validate domain ID', async () => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/domains//dns-records/record1'
      })

      expect(response.statusCode).toBe(404)
    })

    it('should validate record ID', async () => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/domains/zone1/dns-records/'
      })

      expect(response.statusCode).toBe(404)
    })

    it('should handle cloudflare API errors', async () => {
      vi.mocked(cloudflareClient.deleteDNSRecord).mockRejectedValue(new Error('Record not found'))

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/domains/zone1/dns-records/record1'
      })

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.message).toBeDefined()
    })
  })

  describe('POST /api/domains/:id/ssl-certificate', () => {
    it('should request SSL certificate successfully', async () => {
      const mockCertificate = {
        id: 'cert1',
        status: 'pending',
        issuer: 'Cloudflare',
        expires_on: '2024-01-01T00:00:00Z'
      }

      vi.mocked(cloudflareClient.requestSSLCertificate).mockResolvedValue(mockCertificate)

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/domains/zone1/ssl-certificate'
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('pending')
    })
  })
})