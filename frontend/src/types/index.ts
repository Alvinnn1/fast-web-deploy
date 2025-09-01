// Main types export file
export * from './api';
export * from './domain';
export * from './page';
export * from './common';
export * from './navigation';
export * from './ui';
export * from './utils';
export * from './components';

// Re-export commonly used types for convenience
export type {
  ApiResponse,
  UserFriendlyError,
  LoadingState,
  FormField,
  ValidationRule
} from './common';

export type {
  Domain,
  DomainDetail,
  DNSRecord,
  SSLCertificate,
  DomainStatus,
  DNSRecordType
} from './domain';

export type {
  Page,
  DeploymentResult,
  DeploymentStatusDetail,
  PageStatus,
  DeploymentStatus
} from './page';

export type {
  TabType,
  Tab
} from './navigation';

export type {
  AlertType,
  TableColumn
} from './ui';

export type {
  FileValidation,
  UploadProgress,
  RetryConfig,
  CacheConfig,
  AppConfig
} from './utils';

export type {
  ApiClient,
  LoadingManager,
  FileUploadConfig,
  ApiEndpoints
} from './api';