export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface UploadUrlResponse {
  jwt: string;
}

export interface CheckMissingResponse {
  result: string[];
  success: boolean;
}

export type PageStatus = 'created' | 'deploying' | 'deployed' | 'failed';
export interface Page {
  id: string;
  name: string;
  project_name: string; // Cloudflare project name for API calls
  status: PageStatus;
  url?: string;
  domains?: string[];
  deploymentId?: string;
  createdAt: string;
  lastDeployedAt?: string;
}

export interface UploadResponse {
  success: boolean;
  message?: string;
}

export interface DeployResponse {
  id: string;
  url?: string;
  status: string;
}

export interface ProjectInfo {
  name: string;
  status: string;
  url?: string;
}

export interface FileInfo {
  fileName: string;
  base64: boolean;
  key: string;
  metadata: {
    contentType: string;
  };
  value: string;
}

export interface DeployOptions {
  projectName: string;
  folderPath: string;
}
