// API Response Types and Error Handling

// Unified API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    details?: any;
  };
}

// Error Types
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CLOUDFLARE_API_ERROR = 'CLOUDFLARE_API_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

// Custom Error Class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

// Domain Models
export interface Domain {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'moved' | 'deleted';
  nameservers: string[];
  createdAt: string;
  modifiedAt: string;
}

export interface DomainDetail extends Domain {
  dnsRecords: DNSRecord[];
  sslCertificate?: SSLCertificate;
}

export interface DNSRecord {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

export interface SSLCertificate {
  id: string;
  status: 'active' | 'pending' | 'expired';
  issuer: string;
  expiresAt: string;
  hosts?: string[];
  type?: string;
  validationMethod?: string;
  validityDays?: number;
}

// Page Models
export interface Page {
  id: string;
  name: string;
  status: 'created' | 'deploying' | 'deployed' | 'failed';
  url?: string;
  domains?: string[];
  deploymentId?: string;
  createdAt: string;
  lastDeployedAt?: string;
}

export interface DeploymentResult {
  id: string;
  status: 'queued' | 'building' | 'deploying' | 'success' | 'failure';
  url?: string;
  errorMessage?: string;
}

export interface DeploymentStatus {
  status: 'queued' | 'building' | 'deploying' | 'success' | 'failure';
  progress?: number;
  logs?: string[];
  url?: string;
  errorMessage?: string;
}

// Note: All data is now sourced directly from Cloudflare API
// No local database storage needed

// Request/Response Types for API endpoints
export interface CreateDomainRequest {
  name: string;
  nameservers?: string[];
}

export interface UpdateDNSRecordRequest {
  type: string;
  name: string;
  content: string;
  ttl?: number;
}

export interface CreateDNSRecordRequest {
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}

export interface CreatePageRequest {
  name: string;
}

export interface DeployPageRequest {
  manifest: Record<string, string>;
}

// Validation Error Details
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

// User-friendly error for frontend
export interface UserFriendlyError {
  title: string;
  message: string;
  action: 'retry' | 'contact_support' | 'none';
}

// Asset Upload Proxy Types
export interface UploadPayload {
  base64: boolean;
  key: string;
  metadata: { contentType: string };
  value: string;
}

export interface CheckMissingAssetsRequest {
  jwt: string;
  hashes: string[];
}

export interface AssetsUploadRequest {
  jwt: string;
  payload: UploadPayload[];
}

export interface CheckMissingAssetsResponse {
  result: string[];
  success: boolean;
}

export interface AssetsUploadResponse {
  result: {
    successful_key_count: number;
    unsuccessful_keys: string[];
  };
  success: boolean;
}