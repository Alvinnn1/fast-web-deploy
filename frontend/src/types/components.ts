// Component-specific prop types and interfaces

import type {
  Domain,
  DomainDetail,
  Page,
  DeploymentStatusDetail,
  CreateDomainRequest,
  CreatePageRequest,
  TabType
} from './index';

// App component props
export interface AppProps {
  title?: string;
}

// Layout component props
export interface LayoutComponentProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

// Domain management component props
export interface DomainManagementProps {
  domains: Domain[];
  loading: boolean;
  error?: string;
  onRefresh: () => void;
  onAddDomain: (data: CreateDomainRequest) => Promise<void>;
  onDomainClick: (domain: Domain) => void;
}

// Page management component props
export interface PageManagementProps {
  pages: Page[];
  loading: boolean;
  error?: string;
  onRefresh: () => void;
  onAddPage: (data: CreatePageRequest) => Promise<void>;
  onPageClick: (page: Page) => void;
  onUploadFile: (pageId: string, file: File) => Promise<void>;
}

// Domain detail component props
export interface DomainDetailComponentProps {
  domainId: string;
  domain?: DomainDetail;
  loading: boolean;
  error?: string;
  onBack: () => void;
  onUpdateDNS: (recordId: string, data: any) => Promise<void>;
  onRequestSSL: () => Promise<void>;
}

// File upload component props
export interface FileUploadComponentProps {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  loading?: boolean;
  progress?: number;
  onFileSelect: (files: File[]) => void;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: Error) => void;
}

// Deployment status component props
export interface DeploymentStatusComponentProps {
  pageId: string;
  deployment?: DeploymentStatusDetail;
  loading: boolean;
  onRefresh: () => void;
  onRetry?: () => void;
}

// Error boundary props
export interface ErrorBoundaryProps {
  fallback?: (error: Error) => React.ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

// Global loading overlay props
export interface GlobalLoadingProps {
  isVisible: boolean;
  message?: string;
}

// Toast notification props
export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
  onDismiss?: (id: string) => void;
}

// Toast container props
export interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

// Search component props
export interface SearchComponentProps {
  placeholder?: string;
  value?: string;
  loading?: boolean;
  debounceMs?: number;
  onSearch: (query: string) => void;
  onClear?: () => void;
}

// Empty state component props
export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Data table component props
export interface DataTableProps<T = any> {
  data: T[];
  columns: any[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    field: keyof T;
    direction: 'asc' | 'desc';
    onSort: (field: keyof T, direction: 'asc' | 'desc') => void;
  };
  selection?: {
    selectedRows: T[];
    onSelectionChange: (rows: T[]) => void;
  };
}

// Form wrapper component props
export interface FormWrapperProps {
  onSubmit: (data: any) => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  resetOnSubmit?: boolean;
  validateOnChange?: boolean;
}

// Status indicator component props
export interface StatusIndicatorProps {
  status: string;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}