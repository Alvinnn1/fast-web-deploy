// API-related types and interfaces

import type {
  Domain,
  DomainDetail,
  DNSRecord,
  SSLCertificate,
  CreateDomainRequest,
  UpdateDNSRecordRequest
} from './domain';

import type {
  Page,
  DeploymentResult,
  DeploymentStatusDetail,
  CreatePageRequest
} from './page';

import type { ApiResponse } from './common';

// API Client configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Request options
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

// Domain API endpoints
export interface DomainAPI {
  // GET /api/domains
  getDomains(): Promise<ApiResponse<Domain[]>>;

  // POST /api/domains
  createDomain(data: CreateDomainRequest): Promise<ApiResponse<Domain>>;

  // GET /api/domains/:id
  getDomainDetail(id: string): Promise<ApiResponse<DomainDetail>>;

  // GET /api/domains/:id/dns-records
  getDNSRecords(domainId: string): Promise<ApiResponse<DNSRecord[]>>;

  // PUT /api/domains/:id/dns-records/:recordId
  updateDNSRecord(
    domainId: string,
    recordId: string,
    data: UpdateDNSRecordRequest
  ): Promise<ApiResponse<DNSRecord>>;

  // POST /api/domains/:id/ssl-certificate
  requestSSLCertificate(domainId: string): Promise<ApiResponse<SSLCertificate>>;
}

// Page API endpoints
export interface PageAPI {
  // GET /api/pages
  getPages(): Promise<ApiResponse<Page[]>>;

  // POST /api/pages
  createPage(data: CreatePageRequest): Promise<ApiResponse<Page>>;

  // POST /api/pages/:id/deploy
  deployPage(pageId: string, file: File): Promise<ApiResponse<DeploymentResult>>;

  // GET /api/pages/:id/deployment-status
  getDeploymentStatus(pageId: string): Promise<ApiResponse<DeploymentStatusDetail>>;
}

// Combined API interface
export interface API extends DomainAPI, PageAPI { }

// API Error response
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

// Request interceptor
export type RequestInterceptor = (config: RequestOptions) => RequestOptions | Promise<RequestOptions>;

// Response interceptor
export type ResponseInterceptor = (response: any) => any | Promise<any>;

// API Client interface
export interface ApiClient {
  // Configuration
  config: ApiClientConfig;

  // Interceptors
  addRequestInterceptor(interceptor: RequestInterceptor): void;
  addResponseInterceptor(interceptor: ResponseInterceptor): void;

  // HTTP methods
  get<T = any>(url: string, options?: RequestOptions): Promise<T>;
  post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;
  put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T>;
  delete<T = any>(url: string, options?: RequestOptions): Promise<T>;

  // File upload
  upload<T = any>(url: string, file: File, options?: RequestOptions): Promise<T>;
}

// Loading manager interface
export interface LoadingManager {
  startLoading(): void;
  stopLoading(): void;
  subscribe(callback: (loading: boolean) => void): () => void;
  isLoading(): boolean;
}

// API service configuration
export interface ApiServiceConfig {
  client: ApiClient;
  loadingManager?: LoadingManager;
  errorHandler?: (error: ApiError) => void;
}

// File upload configuration
export interface FileUploadConfig {
  maxSize: number;
  allowedTypes: string[];
  chunkSize?: number;
  timeout?: number;
}

// API endpoints configuration
export interface ApiEndpoints {
  domains: string;
  pages: string;
  upload: string;
}

// Request retry configuration
export interface RequestRetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: ApiError) => boolean;
}

// API client factory
export interface ApiClientFactory {
  create(config: ApiClientConfig): ApiClient;
}