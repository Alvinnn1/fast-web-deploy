/**
 * Domains Handler - Handles domain-related requests in Workers environment
 */

import { WorkersCloudflareClient } from '../workers-cloudflare-client.js'
import { WorkersResponseFormatter } from '../workers-response-formatter.js'
import { WorkersErrorHandler } from '../workers-error-handler.js'
import { CreateDomainRequest, UpdateDNSRecordRequest, CreateDNSRecordRequest, Domain, DomainDetail, DNSRecord, SSLCertificate } from '../../types.js'

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

export class DomainsHandler {
  constructor(private cloudflareClient: WorkersCloudflareClient) { }

  async handle(request: Request, pathname: string, method: string): Promise<Response> {
    try {
      // Parse URL path
      const pathParts = pathname.split('/').filter(Boolean)

      // GET /api/domains - Get all domains
      if (pathParts.length === 2 && pathParts[1] === 'domains' && method === 'GET') {
        return this.getAllDomains()
      }

      // POST /api/domains - Create new domain
      if (pathParts.length === 2 && pathParts[1] === 'domains' && method === 'POST') {
        return this.createDomain(request)
      }

      // GET /api/domains/:id - Get domain details
      if (pathParts.length === 3 && pathParts[1] === 'domains' && method === 'GET') {
        const domainId = pathParts[2]
        return this.getDomainDetails(domainId)
      }

      // GET /api/domains/:id/dns-records - Get DNS records for a domain
      if (pathParts.length === 4 && pathParts[1] === 'domains' && pathParts[3] === 'dns-records' && method === 'GET') {
        const domainId = pathParts[2]
        return this.getDNSRecords(domainId)
      }

      // POST /api/domains/:id/dns-records - Create DNS record
      if (pathParts.length === 4 && pathParts[1] === 'domains' && pathParts[3] === 'dns-records' && method === 'POST') {
        const domainId = pathParts[2]
        return this.createDNSRecord(request, domainId)
      }

      // PUT /api/domains/:id/dns-records/:recordId - Update DNS record
      if (pathParts.length === 5 && pathParts[1] === 'domains' && pathParts[3] === 'dns-records' && method === 'PUT') {
        const domainId = pathParts[2]
        const recordId = pathParts[4]
        return this.updateDNSRecord(request, domainId, recordId)
      }

      // DELETE /api/domains/:id/dns-records/:recordId - Delete DNS record
      if (pathParts.length === 5 && pathParts[1] === 'domains' && pathParts[3] === 'dns-records' && method === 'DELETE') {
        const domainId = pathParts[2]
        const recordId = pathParts[4]
        return this.deleteDNSRecord(domainId, recordId)
      }

      // POST /api/domains/:id/ssl-certificate - Request SSL certificate
      if (pathParts.length === 4 && pathParts[1] === 'domains' && pathParts[3] === 'ssl-certificate' && method === 'POST') {
        const domainId = pathParts[2]
        return this.requestSSLCertificate(domainId)
      }

      return WorkersResponseFormatter.notFound('Domain endpoint not found')
    } catch (error) {
      return WorkersErrorHandler.createErrorResponse(error)
    }
  }

  private async getAllDomains(): Promise<Response> {
    const zones = await this.cloudflareClient.getZones()
    const domains = zones.map(transformZoneToDomain)

    return WorkersResponseFormatter.success(
      domains,
      'Domains retrieved successfully'
    )
  }

  private async createDomain(request: Request): Promise<Response> {
    const body: CreateDomainRequest = await request.json()
    const { name, nameservers } = body

    // Validate domain name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw WorkersErrorHandler.createValidationError('Domain name is required')
    }

    // Basic domain name format validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(name.trim())) {
      throw WorkersErrorHandler.createValidationError('Invalid domain name format')
    }

    // Validate nameservers if provided
    if (nameservers && Array.isArray(nameservers)) {
      for (const ns of nameservers) {
        if (typeof ns !== 'string' || ns.trim().length === 0) {
          throw WorkersErrorHandler.createValidationError('Invalid nameserver format')
        }
      }
    }

    const zone = await this.cloudflareClient.createZone(name.trim(), nameservers)
    const domain = transformZoneToDomain(zone)

    return WorkersResponseFormatter.success(
      domain,
      'Domain created successfully'
    )
  }

  private async getDomainDetails(domainId: string): Promise<Response> {
    if (!domainId || typeof domainId !== 'string') {
      throw WorkersErrorHandler.createValidationError('Domain ID is required')
    }

    // Get zone details
    const zone = await this.cloudflareClient.getZone(domainId)

    // Get DNS records
    const dnsRecords = await this.cloudflareClient.getDNSRecords(domainId)

    // Try to get SSL certificate (may not exist)
    let sslCertificate: SSLCertificate | undefined
    try {
      const cert = await this.cloudflareClient.getSSLCertificate(domainId)
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

    return WorkersResponseFormatter.success(
      domainDetail,
      'Domain details retrieved successfully'
    )
  }

  private async getDNSRecords(domainId: string): Promise<Response> {
    if (!domainId || typeof domainId !== 'string') {
      throw WorkersErrorHandler.createValidationError('Domain ID is required')
    }

    const dnsRecords = await this.cloudflareClient.getDNSRecords(domainId)
    const transformedRecords = dnsRecords.map(transformDNSRecord)

    return WorkersResponseFormatter.success(
      transformedRecords,
      'DNS records retrieved successfully'
    )
  }

  private async createDNSRecord(request: Request, domainId: string): Promise<Response> {
    if (!domainId || typeof domainId !== 'string') {
      throw WorkersErrorHandler.createValidationError('Domain ID is required')
    }

    const body: CreateDNSRecordRequest = await request.json()
    const { type, name, content, ttl, proxied } = body

    // Validate required fields
    if (!type || !name || !content) {
      throw WorkersErrorHandler.createValidationError('DNS record type, name, and content are required')
    }

    // Validate DNS record type
    const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']
    if (!validTypes.includes(type.toUpperCase())) {
      throw WorkersErrorHandler.createValidationError('Invalid DNS record type')
    }

    // Validate name field
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw WorkersErrorHandler.createValidationError('DNS record name must be a non-empty string')
    }

    // Validate content field
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw WorkersErrorHandler.createValidationError('DNS record content must be a non-empty string')
    }

    // Validate TTL if provided
    if (ttl !== undefined && (typeof ttl !== 'number' || ttl < 1)) {
      throw WorkersErrorHandler.createValidationError('TTL must be a positive number')
    }

    // Validate proxied setting (only applicable for A and AAAA records)
    if (proxied !== undefined && typeof proxied !== 'boolean') {
      throw WorkersErrorHandler.createValidationError('Proxied setting must be a boolean')
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

    const createdRecord = await this.cloudflareClient.createDNSRecord(domainId, recordData)
    const transformedRecord = transformDNSRecord(createdRecord)

    return WorkersResponseFormatter.success(
      transformedRecord,
      'DNS record created successfully'
    )
  }

  private async updateDNSRecord(request: Request, domainId: string, recordId: string): Promise<Response> {
    if (!domainId || typeof domainId !== 'string') {
      throw WorkersErrorHandler.createValidationError('Domain ID is required')
    }

    if (!recordId || typeof recordId !== 'string') {
      throw WorkersErrorHandler.createValidationError('DNS record ID is required')
    }

    const body: UpdateDNSRecordRequest = await request.json()
    const { type, name, content, ttl } = body

    // Validate required fields
    if (!type || !name || !content) {
      throw WorkersErrorHandler.createValidationError('DNS record type, name, and content are required')
    }

    // Validate DNS record type
    const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']
    if (!validTypes.includes(type.toUpperCase())) {
      throw WorkersErrorHandler.createValidationError('Invalid DNS record type')
    }

    const updatedRecord = await this.cloudflareClient.updateDNSRecord(domainId, recordId, {
      type: type.toUpperCase(),
      name: name.trim(),
      content: content.trim(),
      ttl: ttl || 1 // Default TTL
    })

    const transformedRecord = transformDNSRecord(updatedRecord)

    return WorkersResponseFormatter.success(
      transformedRecord,
      'DNS record updated successfully'
    )
  }

  private async deleteDNSRecord(domainId: string, recordId: string): Promise<Response> {
    if (!domainId || typeof domainId !== 'string') {
      throw WorkersErrorHandler.createValidationError('Domain ID is required')
    }

    if (!recordId || typeof recordId !== 'string') {
      throw WorkersErrorHandler.createValidationError('DNS record ID is required')
    }

    await this.cloudflareClient.deleteDNSRecord(domainId, recordId)

    return WorkersResponseFormatter.success(
      { id: recordId },
      'DNS record deleted successfully'
    )
  }

  private async requestSSLCertificate(domainId: string): Promise<Response> {
    if (!domainId || typeof domainId !== 'string') {
      throw WorkersErrorHandler.createValidationError('Domain ID is required')
    }

    const certificate = await this.cloudflareClient.requestSSLCertificate(domainId)
    const transformedCertificate = transformSSLCertificate(certificate)

    return WorkersResponseFormatter.success(
      transformedCertificate,
      'SSL certificate requested successfully'
    )
  }
}