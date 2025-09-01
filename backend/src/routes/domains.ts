import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { cloudflareClient } from '../services/cloudflare-client.js'
import { ResponseFormatter, ErrorHandler } from '../utils/index.js'
import { CreateDomainRequest, UpdateDNSRecordRequest, CreateDNSRecordRequest, Domain, DomainDetail, DNSRecord, SSLCertificate } from '../types.js'

// Transform Cloudflare zone to our Domain interface
function transformZoneToDomain(zone: any): Domain {
  return {
    id: zone.id,
    name: zone.name,
    status: zone.status,
    nameservers: zone.name_servers || [],
    createdAt: zone.created_on,
    modifiedAt: zone.modified_on
  }
}

// Transform Cloudflare DNS record to our DNSRecord interface
function transformDNSRecord(record: any): DNSRecord {
  return {
    id: record.id,
    type: record.type,
    name: record.name,
    content: record.content,
    ttl: record.ttl,
    proxied: record.proxied
  }
}

// Transform Cloudflare SSL certificate to our SSLCertificate interface
function transformSSLCertificate(cert: any): SSLCertificate {
  return {
    id: cert.id,
    status: cert.status,
    issuer: cert.issuer || 'Cloudflare',
    expiresAt: cert.expires_on
  }
}

export async function domainsRoutes(fastify: FastifyInstance) {
  // GET /api/domains - Get all domains
  fastify.get('/api/domains', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const zones = await cloudflareClient.getZones()
      const domains = zones.map(transformZoneToDomain)

      return ResponseFormatter.success(
        domains,
        'Domains retrieved successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // POST /api/domains - Create new domain
  fastify.post<{ Body: CreateDomainRequest }>('/api/domains', async (request: FastifyRequest<{ Body: CreateDomainRequest }>, reply: FastifyReply) => {
    try {
      const { name, nameservers } = request.body

      // Validate domain name
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw ErrorHandler.createValidationError('Domain name is required')
      }

      // Basic domain name format validation
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
      if (!domainRegex.test(name.trim())) {
        throw ErrorHandler.createValidationError('Invalid domain name format')
      }

      // Validate nameservers if provided
      if (nameservers && Array.isArray(nameservers)) {
        for (const ns of nameservers) {
          if (typeof ns !== 'string' || ns.trim().length === 0) {
            throw ErrorHandler.createValidationError('Invalid nameserver format')
          }
        }
      }

      const zone = await cloudflareClient.createZone(name.trim(), nameservers)
      const domain = transformZoneToDomain(zone)

      return ResponseFormatter.success(
        domain,
        'Domain created successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // GET /api/domains/:id - Get domain details
  fastify.get<{ Params: { id: string } }>('/api/domains/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params

      if (!id || typeof id !== 'string') {
        throw ErrorHandler.createValidationError('Domain ID is required')
      }

      // Get zone details
      const zone = await cloudflareClient.getZone(id)

      // Get DNS records
      const dnsRecords = await cloudflareClient.getDNSRecords(id)

      // Try to get SSL certificate (may not exist)
      let sslCertificate: SSLCertificate | undefined
      try {
        const cert = await cloudflareClient.getSSLCertificate(id)
        sslCertificate = transformSSLCertificate(cert)
      } catch (error) {
        // SSL certificate may not exist, that's okay
        sslCertificate = undefined
      }

      const domainDetail: DomainDetail = {
        ...transformZoneToDomain(zone),
        dnsRecords: dnsRecords.map(transformDNSRecord),
        ...(sslCertificate && { sslCertificate })
      }

      return ResponseFormatter.success(
        domainDetail,
        'Domain details retrieved successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // GET /api/domains/:id/dns-records - Get DNS records for a domain
  fastify.get<{ Params: { id: string } }>('/api/domains/:id/dns-records', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params

      if (!id || typeof id !== 'string') {
        throw ErrorHandler.createValidationError('Domain ID is required')
      }

      const dnsRecords = await cloudflareClient.getDNSRecords(id)
      const transformedRecords = dnsRecords.map(transformDNSRecord)

      return ResponseFormatter.success(
        transformedRecords,
        'DNS records retrieved successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // POST /api/domains/:id/dns-records - Create DNS record
  fastify.post<{
    Params: { id: string };
    Body: CreateDNSRecordRequest
  }>('/api/domains/:id/dns-records', async (request: FastifyRequest<{
    Params: { id: string };
    Body: CreateDNSRecordRequest
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      const { type, name, content, ttl, proxied } = request.body

      if (!id || typeof id !== 'string') {
        throw ErrorHandler.createValidationError('Domain ID is required')
      }

      // Validate required fields
      if (!type || !name || !content) {
        throw ErrorHandler.createValidationError('DNS record type, name, and content are required')
      }

      // Validate DNS record type
      const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']
      if (!validTypes.includes(type.toUpperCase())) {
        throw ErrorHandler.createValidationError('Invalid DNS record type')
      }

      // Validate name field
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw ErrorHandler.createValidationError('DNS record name must be a non-empty string')
      }

      // Validate content field
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw ErrorHandler.createValidationError('DNS record content must be a non-empty string')
      }

      // Validate TTL if provided
      if (ttl !== undefined && (typeof ttl !== 'number' || ttl < 1)) {
        throw ErrorHandler.createValidationError('TTL must be a positive number')
      }

      // Validate proxied setting (only applicable for A and AAAA records)
      if (proxied !== undefined && typeof proxied !== 'boolean') {
        throw ErrorHandler.createValidationError('Proxied setting must be a boolean')
      }

      const recordData: any = {
        type: type.toUpperCase(),
        name: name.trim(),
        content: content.trim(),
        ttl: ttl || 1 // Default TTL
      }

      // Only add proxied setting for A and AAAA records
      if (proxied !== undefined && ['A', 'AAAA'].includes(type.toUpperCase())) {
        recordData.proxied = proxied
      }

      const createdRecord = await cloudflareClient.createDNSRecord(id, recordData)
      const transformedRecord = transformDNSRecord(createdRecord)

      return ResponseFormatter.success(
        transformedRecord,
        'DNS record created successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // PUT /api/domains/:id/dns-records/:recordId - Update DNS record
  fastify.put<{
    Params: { id: string; recordId: string };
    Body: UpdateDNSRecordRequest
  }>('/api/domains/:id/dns-records/:recordId', async (request: FastifyRequest<{
    Params: { id: string; recordId: string };
    Body: UpdateDNSRecordRequest
  }>, reply: FastifyReply) => {
    try {
      const { id, recordId } = request.params
      const { type, name, content, ttl } = request.body

      if (!id || typeof id !== 'string') {
        throw ErrorHandler.createValidationError('Domain ID is required')
      }

      if (!recordId || typeof recordId !== 'string') {
        throw ErrorHandler.createValidationError('DNS record ID is required')
      }

      // Validate required fields
      if (!type || !name || !content) {
        throw ErrorHandler.createValidationError('DNS record type, name, and content are required')
      }

      // Validate DNS record type
      const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']
      if (!validTypes.includes(type.toUpperCase())) {
        throw ErrorHandler.createValidationError('Invalid DNS record type')
      }

      const updatedRecord = await cloudflareClient.updateDNSRecord(id, recordId, {
        type: type.toUpperCase(),
        name: name.trim(),
        content: content.trim(),
        ttl: ttl || 1 // Default TTL
      })

      const transformedRecord = transformDNSRecord(updatedRecord)

      return ResponseFormatter.success(
        transformedRecord,
        'DNS record updated successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // DELETE /api/domains/:id/dns-records/:recordId - Delete DNS record
  fastify.delete<{
    Params: { id: string; recordId: string }
  }>('/api/domains/:id/dns-records/:recordId', async (request: FastifyRequest<{
    Params: { id: string; recordId: string }
  }>, reply: FastifyReply) => {
    try {
      const { id, recordId } = request.params

      if (!id || typeof id !== 'string') {
        throw ErrorHandler.createValidationError('Domain ID is required')
      }

      if (!recordId || typeof recordId !== 'string') {
        throw ErrorHandler.createValidationError('DNS record ID is required')
      }

      await cloudflareClient.deleteDNSRecord(id, recordId)

      return ResponseFormatter.success(
        { id: recordId },
        'DNS record deleted successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })

  // POST /api/domains/:id/ssl-certificate - Request SSL certificate
  fastify.post<{ Params: { id: string } }>('/api/domains/:id/ssl-certificate', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params

      if (!id || typeof id !== 'string') {
        throw ErrorHandler.createValidationError('Domain ID is required')
      }

      const certificate = await cloudflareClient.requestSSLCertificate(id)
      const transformedCertificate = transformSSLCertificate(certificate)

      return ResponseFormatter.success(
        transformedCertificate,
        'SSL certificate requested successfully'
      )
    } catch (error) {
      return ErrorHandler.handleRouteError(reply, error)
    }
  })
}