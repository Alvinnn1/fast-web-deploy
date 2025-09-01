import { WorkersResponseFormatter } from '../workers-response-formatter.js';
import { WorkersErrorHandler } from '../workers-error-handler.js';
function transformZoneToDomain(zone) {
    return {
        id: zone.id,
        name: zone.name,
        status: zone.status,
        nameservers: zone.name_servers || [],
        createdAt: zone.created_on,
        modifiedAt: zone.modified_on
    };
}
function transformDNSRecord(record) {
    return {
        id: record.id,
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl,
        proxied: record.proxied
    };
}
function transformSSLCertificate(cert) {
    return {
        id: cert.id,
        status: cert.status,
        issuer: cert.issuer || 'Cloudflare',
        expiresAt: cert.expires_on
    };
}
export class DomainsHandler {
    cloudflareClient;
    constructor(cloudflareClient) {
        this.cloudflareClient = cloudflareClient;
    }
    async handle(request, pathname, method) {
        try {
            const pathParts = pathname.split('/').filter(Boolean);
            if (pathParts.length === 2 && pathParts[1] === 'domains' && method === 'GET') {
                return this.getAllDomains();
            }
            if (pathParts.length === 2 && pathParts[1] === 'domains' && method === 'POST') {
                return this.createDomain(request);
            }
            if (pathParts.length === 3 && pathParts[1] === 'domains' && method === 'GET') {
                const domainId = pathParts[2];
                return this.getDomainDetails(domainId);
            }
            if (pathParts.length === 4 && pathParts[1] === 'domains' && pathParts[3] === 'dns-records' && method === 'GET') {
                const domainId = pathParts[2];
                return this.getDNSRecords(domainId);
            }
            if (pathParts.length === 4 && pathParts[1] === 'domains' && pathParts[3] === 'dns-records' && method === 'POST') {
                const domainId = pathParts[2];
                return this.createDNSRecord(request, domainId);
            }
            if (pathParts.length === 5 && pathParts[1] === 'domains' && pathParts[3] === 'dns-records' && method === 'PUT') {
                const domainId = pathParts[2];
                const recordId = pathParts[4];
                return this.updateDNSRecord(request, domainId, recordId);
            }
            if (pathParts.length === 5 && pathParts[1] === 'domains' && pathParts[3] === 'dns-records' && method === 'DELETE') {
                const domainId = pathParts[2];
                const recordId = pathParts[4];
                return this.deleteDNSRecord(domainId, recordId);
            }
            if (pathParts.length === 4 && pathParts[1] === 'domains' && pathParts[3] === 'ssl-certificate' && method === 'POST') {
                const domainId = pathParts[2];
                return this.requestSSLCertificate(domainId);
            }
            return WorkersResponseFormatter.notFound('Domain endpoint not found');
        }
        catch (error) {
            return WorkersErrorHandler.createErrorResponse(error);
        }
    }
    async getAllDomains() {
        const zones = await this.cloudflareClient.getZones();
        const domains = zones.map(transformZoneToDomain);
        return WorkersResponseFormatter.success(domains, 'Domains retrieved successfully');
    }
    async createDomain(request) {
        const body = await request.json();
        const { name, nameservers } = body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw WorkersErrorHandler.createValidationError('Domain name is required');
        }
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(name.trim())) {
            throw WorkersErrorHandler.createValidationError('Invalid domain name format');
        }
        if (nameservers && Array.isArray(nameservers)) {
            for (const ns of nameservers) {
                if (typeof ns !== 'string' || ns.trim().length === 0) {
                    throw WorkersErrorHandler.createValidationError('Invalid nameserver format');
                }
            }
        }
        const zone = await this.cloudflareClient.createZone(name.trim(), nameservers);
        const domain = transformZoneToDomain(zone);
        return WorkersResponseFormatter.success(domain, 'Domain created successfully');
    }
    async getDomainDetails(domainId) {
        if (!domainId || typeof domainId !== 'string') {
            throw WorkersErrorHandler.createValidationError('Domain ID is required');
        }
        const zone = await this.cloudflareClient.getZone(domainId);
        const dnsRecords = await this.cloudflareClient.getDNSRecords(domainId);
        let sslCertificate;
        try {
            const cert = await this.cloudflareClient.getSSLCertificate(domainId);
            sslCertificate = transformSSLCertificate(cert);
        }
        catch (error) {
            sslCertificate = undefined;
        }
        const domainDetail = {
            ...transformZoneToDomain(zone),
            dnsRecords: dnsRecords.map(transformDNSRecord),
            ...(sslCertificate && { sslCertificate })
        };
        return WorkersResponseFormatter.success(domainDetail, 'Domain details retrieved successfully');
    }
    async getDNSRecords(domainId) {
        if (!domainId || typeof domainId !== 'string') {
            throw WorkersErrorHandler.createValidationError('Domain ID is required');
        }
        const dnsRecords = await this.cloudflareClient.getDNSRecords(domainId);
        const transformedRecords = dnsRecords.map(transformDNSRecord);
        return WorkersResponseFormatter.success(transformedRecords, 'DNS records retrieved successfully');
    }
    async createDNSRecord(request, domainId) {
        if (!domainId || typeof domainId !== 'string') {
            throw WorkersErrorHandler.createValidationError('Domain ID is required');
        }
        const body = await request.json();
        const { type, name, content, ttl, proxied } = body;
        if (!type || !name || !content) {
            throw WorkersErrorHandler.createValidationError('DNS record type, name, and content are required');
        }
        const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];
        if (!validTypes.includes(type.toUpperCase())) {
            throw WorkersErrorHandler.createValidationError('Invalid DNS record type');
        }
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw WorkersErrorHandler.createValidationError('DNS record name must be a non-empty string');
        }
        if (typeof content !== 'string' || content.trim().length === 0) {
            throw WorkersErrorHandler.createValidationError('DNS record content must be a non-empty string');
        }
        if (ttl !== undefined && (typeof ttl !== 'number' || ttl < 1)) {
            throw WorkersErrorHandler.createValidationError('TTL must be a positive number');
        }
        if (proxied !== undefined && typeof proxied !== 'boolean') {
            throw WorkersErrorHandler.createValidationError('Proxied setting must be a boolean');
        }
        const recordData = {
            type: type.toUpperCase(),
            name: name.trim(),
            content: content.trim(),
            ttl: ttl || 1
        };
        if (proxied !== undefined && ['A', 'AAAA'].includes(type.toUpperCase())) {
            recordData.proxied = proxied;
        }
        const createdRecord = await this.cloudflareClient.createDNSRecord(domainId, recordData);
        const transformedRecord = transformDNSRecord(createdRecord);
        return WorkersResponseFormatter.success(transformedRecord, 'DNS record created successfully');
    }
    async updateDNSRecord(request, domainId, recordId) {
        if (!domainId || typeof domainId !== 'string') {
            throw WorkersErrorHandler.createValidationError('Domain ID is required');
        }
        if (!recordId || typeof recordId !== 'string') {
            throw WorkersErrorHandler.createValidationError('DNS record ID is required');
        }
        const body = await request.json();
        const { type, name, content, ttl } = body;
        if (!type || !name || !content) {
            throw WorkersErrorHandler.createValidationError('DNS record type, name, and content are required');
        }
        const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];
        if (!validTypes.includes(type.toUpperCase())) {
            throw WorkersErrorHandler.createValidationError('Invalid DNS record type');
        }
        const updatedRecord = await this.cloudflareClient.updateDNSRecord(domainId, recordId, {
            type: type.toUpperCase(),
            name: name.trim(),
            content: content.trim(),
            ttl: ttl || 1
        });
        const transformedRecord = transformDNSRecord(updatedRecord);
        return WorkersResponseFormatter.success(transformedRecord, 'DNS record updated successfully');
    }
    async deleteDNSRecord(domainId, recordId) {
        if (!domainId || typeof domainId !== 'string') {
            throw WorkersErrorHandler.createValidationError('Domain ID is required');
        }
        if (!recordId || typeof recordId !== 'string') {
            throw WorkersErrorHandler.createValidationError('DNS record ID is required');
        }
        await this.cloudflareClient.deleteDNSRecord(domainId, recordId);
        return WorkersResponseFormatter.success({ id: recordId }, 'DNS record deleted successfully');
    }
    async requestSSLCertificate(domainId) {
        if (!domainId || typeof domainId !== 'string') {
            throw WorkersErrorHandler.createValidationError('Domain ID is required');
        }
        const certificate = await this.cloudflareClient.requestSSLCertificate(domainId);
        const transformedCertificate = transformSSLCertificate(certificate);
        return WorkersResponseFormatter.success(transformedCertificate, 'SSL certificate requested successfully');
    }
}
