// Domain-related types and interfaces

import type { FormField } from './common';

// Domain status types
export type DomainStatus = 'active' | 'pending' | 'moved' | 'deleted';

// DNS record types
export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';

// SSL certificate status
export type SSLCertificateStatus = 'active' | 'pending' | 'expired';

// Domain model
export interface Domain {
  id: string;
  name: string;
  status: DomainStatus;
  nameservers: string[];
  createdAt: string;
  modifiedAt: string;
}

// DNS record model
export interface DNSRecord {
  id: string;
  type: DNSRecordType;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

// SSL certificate model
export interface SSLCertificate {
  id: string;
  status: SSLCertificateStatus;
  issuer: string;
  expiresAt: string;
}

// Domain detail model (extends Domain with additional info)
export interface DomainDetail extends Domain {
  dnsRecords: DNSRecord[];
  sslCertificate?: SSLCertificate;
}

// Domain creation request
export interface CreateDomainRequest {
  name: string;
  nameservers?: string[];
}

// DNS record update request
export interface UpdateDNSRecordRequest {
  type: DNSRecordType;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}

// DNS record creation request
export interface CreateDNSRecordRequest {
  type: DNSRecordType;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

// Component props for domain-related components
export interface DomainListProps {
  domains: Domain[];
  loading?: boolean;
  onRefresh?: () => void;
  onAddDomain?: () => void;
}

export interface DomainItemProps {
  domain: Domain;
  onClick?: (domain: Domain) => void;
}

export interface AddDomainModalProps {
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDomainRequest) => void;
}

export interface DomainDetailProps {
  domain: DomainDetail;
  loading?: boolean;
  onUpdateDNS?: (recordId: string, data: UpdateDNSRecordRequest) => void;
  onRequestSSL?: () => void;
}

// Form data for domain creation
export interface DomainFormData {
  name: FormField;
  nameservers: FormField;
}

// DNS record form data
export interface DNSRecordFormData {
  type: FormField;
  name: FormField;
  content: FormField;
  ttl: FormField;
  proxied: boolean;
}