// Page-related types and interfaces

import type { FormField } from './common';

// Page status types
export type PageStatus = 'created' | 'deploying' | 'deployed' | 'failed';

// Deployment status types
export type DeploymentStatus = 'queued' | 'building' | 'deploying' | 'success' | 'failure';

// Page model
export interface Page {
  id: string;
  name: string;
  project_name?: string; // Cloudflare project name for API calls
  status: PageStatus;
  url?: string;
  domains?: string[];
  deploymentId?: string;
  createdAt: string;
  lastDeployedAt?: string;
}

// Deployment result model
export interface DeploymentResult {
  id: string;
  status: DeploymentStatus;
  url?: string;
  errorMessage?: string;
}

// Deployment status detail model
export interface DeploymentStatusDetail {
  status: DeploymentStatus;
  progress?: number;
  logs?: string[];
  url?: string;
  errorMessage?: string;
}

// Page creation request
export interface CreatePageRequest {
  name: string;
}

// Upload URL response
export interface UploadUrlResponse {
  jwt: string;
}

// File upload data
export interface FileUploadData {
  file: File;
  pageId: string;
}

// Component props for page-related components
export interface PagesListProps {
  pages: Page[];
  loading?: boolean;
  onRefresh?: () => void;
  onAddPage?: () => void;
  onPageClick?: (page: Page) => void;
}

export interface PageItemProps {
  page: Page;
  onClick?: (page: Page) => void;
  onUpload?: (page: Page) => void;
}

export interface AddPageModalProps {
  isOpen: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePageRequest) => void;
}

export interface UploadModalProps {
  isOpen: boolean;
  page?: Page;
  loading?: boolean;
  uploadProgress?: number;
  onClose: () => void;
  onUpload: (file: File) => void;
}

export interface DeploymentStatusProps {
  deployment: DeploymentStatusDetail;
  onRetry?: () => void;
}

// Form data for page creation
export interface PageFormData {
  name: FormField;
}

// File upload state
export interface FileUploadState {
  file?: File;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

// Deployment progress
export interface DeploymentProgress {
  stage: 'uploading' | 'building' | 'deploying' | 'complete';
  progress: number;
  message?: string;
}

export interface UploadPayload {
  base64: boolean;
  key: string;
  metadata: { contentType: string };
  value: string;
  fileName: string
}