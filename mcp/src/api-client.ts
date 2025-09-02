import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ApiResponse,
  UploadUrlResponse,
  CheckMissingResponse,
  UploadResponse,
  DeployResponse,
  ProjectInfo,
  FileInfo,
  Page
} from './types.js';

export class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = 'https://api.luckyjingwen.top') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // 检查项目是否存在
  async checkProject(projectName: string): Promise<Page | null> {
    try {
      const response = await this.client.get<ApiResponse<Page[]>>(`/api/pages`);
      const pages = response.data.data || [];

      // 检查响应是否成功
      if (!pages || !pages.length) {
        return null;
      }

      // 在pages数组中查找匹配的项目
      const existingProject = pages.find((page: Page) =>
        page.name === projectName || page.id === projectName
      );

      if (existingProject) {
        return {
          id: existingProject.id,
          name: existingProject.name,
          project_name: existingProject.project_name,
          createdAt: existingProject.createdAt,
          status: existingProject.status || 'active',
          url: existingProject.url
        };
      } else {
        return null;
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw new Error(`Failed to check project: ${error.message}`);
    }
  }

  // 创建项目
  async createProject(projectName: string): Promise<Page | null> {
    try {
      const response = await this.client.post<ApiResponse<Page>>('/api/pages', {
        name: projectName
      });
      return response.data.data || null;
    } catch (error: any) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  // 获取上传URL和JWT
  async getUploadUrl(projectName: string): Promise<UploadUrlResponse> {
    try {
      const response = await this.client.get<ApiResponse<UploadUrlResponse>>(`/api/pages/${projectName}/upload-url`);
      return {
        jwt: response.data.data?.jwt || '',
      };
    } catch (error: any) {
      throw new Error(`Failed to get upload URL: ${error.message}`);
    }
  }

  // 检查缺失的资源
  async checkMissingAssets(jwt: string, files: FileInfo[]): Promise<CheckMissingResponse | null> {
    try {
      const response = await this.client.request<ApiResponse<CheckMissingResponse>>({
        url: '/api/pages/assets/check-missing',
        method: 'POST',
        data: JSON.stringify({
          jwt,
          hashes: files.map(f => f.key)
        })
      });
      return response.data.data || null;
    } catch (error: any) {
      throw new Error(`Failed to check missing assets: ${error.message}`);
    }
  }

  // 上传资源
  async uploadAssets(jwt: string, files: FileInfo[]): Promise<UploadResponse | null> {
    try {
      const r = await this.client.request<ApiResponse<UploadResponse>>({
        method: 'POST',
        url: '/api/pages/assets/upload',
        data: JSON.stringify({
          jwt,
          payload: files
        })
      })
      return r.data.data || null;
    } catch (error: any) {
      throw new Error(`Failed to upload assets: ${error.message}`);
    }
  }

  // 部署项目
  async deployProject(projectName: string, manifest: Record<string, string>): Promise<DeployResponse> {
    try {
      const response = await this.client.post<ApiResponse<DeployResponse>>(`/api/pages/${projectName}/deploy`, {
        manifest
      });
      return {
        id: response.data.data?.id || '',
        url: response.data.data?.url || '',
        status: response.data.data?.status || ''
      };
    } catch (error: any) {
      throw new Error(`Failed to deploy project: ${error.message}`);
    }
  }
}
