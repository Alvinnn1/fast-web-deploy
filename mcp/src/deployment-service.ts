import { ApiClient } from './api-client.js';
import { FileProcessor } from './file-processor.js';
import { FileInfo, DeployOptions } from './types.js';

export class DeploymentService {
  private apiClient: ApiClient;

  constructor(apiBaseUrl: string = 'https://api.luckyjingwen.top') {
    this.apiClient = new ApiClient(apiBaseUrl);
  }

  // 主要的部署方法
  async deploy(options: DeployOptions): Promise<{
    success: boolean;
    projectName: string;
    deploymentId?: string;
    deploymentUrl?: string;
    message: string;
    stats?: {
      totalFiles: number;
      totalSize: number;
      fileTypes: Record<string, number>;
    };
  }> {
    try {
      const { projectName, folderPath } = options;

      // 1. 处理文件夹
      console.log(`Processing folder: ${folderPath}`);
      const fileProcessor = new FileProcessor(projectName, folderPath);
      const { files, manifest } = await fileProcessor.processFolder();
      const stats = await fileProcessor.getFolderStats();

      console.log(`Found ${files.length} files, total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);

      // 2. 检查项目是否存在，如果不存在则创建
      console.log(`Checking if project '${projectName}' exists...`);
      let projectExists = await this.apiClient.checkProject(projectName);

      if (!projectExists) {
        console.log(`Project '${projectName}' does not exist, creating...`);
        const createResult = await this.apiClient.createProject(projectName);
        if (!createResult?.id) {
          throw new Error(`Failed to create project: ${createResult?.name}`);
        }
        console.log(`Project '${projectName}' created successfully`);
      } else {
        console.log(`Project '${projectName}' already exists`);
      }

      // 3. 获取上传URL和JWT
      console.log(`Getting upload URL for project '${projectName}'...`);
      const uploadUrlResponse = await this.apiClient.getUploadUrl(projectName);
      if (!uploadUrlResponse.jwt) {
        throw new Error(`Failed to get upload URL: ${uploadUrlResponse.jwt}`);
      }

      const jwt = uploadUrlResponse.jwt;
      console.log('JWT obtained successfully');

      // 4. 检查缺失的资源
      console.log('Checking for missing assets...');
      const checkResponse = await this.apiClient.checkMissingAssets(jwt, files);
      if (!checkResponse?.success) {
        throw new Error(`Failed to check missing assets: ${checkResponse?.result}`);
      }

      const missingKeys = checkResponse?.result || [];
      const filesToUpload = files.filter(f => missingKeys.includes(f.key));

      console.log(`Found ${filesToUpload.length} files to upload out of ${files.length} total files`);

      // 5. 上传资源（如果有需要上传的）
      console.log({ filesToUpload })
      if (filesToUpload.length > 0) {
        console.log('Uploading assets...');
        const uploadResponse = await this.apiClient.uploadAssets(jwt, filesToUpload);
        if (!uploadResponse?.success) {
          throw new Error(`Failed to upload assets: ${uploadResponse?.message}`);
        }
        console.log('Assets uploaded successfully');
      } else {
        console.log('No new assets to upload');
      }

      console.log({ manifest })
      // 6. 部署项目
      console.log('Deploying project...');
      const deployResponse = await this.apiClient.deployProject(projectName, manifest);
      if (!deployResponse.id) {
        throw new Error(`Failed to deploy project: ${deployResponse.status}`);
      }

      console.log('Project deployed successfully');

      return {
        success: true,
        projectName,
        deploymentId: deployResponse.id,
        deploymentUrl: deployResponse.url,
        message: 'Project deployed successfully',
        stats
      };

    } catch (error: any) {
      console.error('Deployment failed:', error);
      return {
        success: false,
        projectName: options.projectName,
        message: error.message || 'Deployment failed with unknown error'
      };
    }
  }

  // 获取部署状态
  async getDeploymentStatus(projectName: string, deploymentId: string): Promise<any> {
    try {
      // 这里可以添加获取部署状态的逻辑
      // 目前返回基本信息
      return {
        success: true,
        data: {
          id: deploymentId,
          status: 'deployed',
          projectName
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

const deploymentService = new DeploymentService();
deploymentService.deploy({
  projectName: 'ai-girl-demo',
  folderPath: '/Users/dengjingwen/Documents/projects/fast-web/test-folder'
}); 