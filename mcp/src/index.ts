#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DeploymentService } from './deployment-service.js';
import path from 'path';

// 创建MCP服务器
const server = new Server(
  {
    name: 'fast-web-mcp',
    version: '1.0.0',
  }
);

// 创建部署服务实例
const deploymentService = new DeploymentService();

// 定义deploy工具
const deployTool: Tool = {
  name: 'deploy',
  description: 'Deploy a project to Fast Web. If the project does not exist, it will be created automatically. The tool will process the specified folder, upload missing assets, and deploy the project.',
  inputSchema: {
    type: 'object',
    properties: {
      projectName: {
        type: 'string',
        description: 'The name of the project to deploy. If it does not exist, it will be created.',
        minLength: 1,
        maxLength: 100
      },
      folderPath: {
        type: 'string',
        description: 'The absolute path to the folder containing the project files to deploy.',
        minLength: 1
      }
    },
    required: ['projectName', 'folderPath']
  }
};

// 处理工具列表请求
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [deployTool],
  };
});

// 处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'deploy') {
    try {
      const { projectName, folderPath } = args as { projectName: string; folderPath: string };

      // 验证参数
      if (!projectName || !folderPath) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Both projectName and folderPath are required.',
            },
          ],
        };
      }

      // 验证文件夹路径
      if (!path.isAbsolute(folderPath)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: folderPath must be an absolute path. Received: ${folderPath}`,
            },
          ],
        };
      }

      // 执行部署
      const result = await deploymentService.deploy({
        projectName,
        folderPath,
      });

      if (result.success) {
        const stats = result.stats;
        const statsText = stats
          ? `\n\n📊 Deployment Statistics:\n` +
          `• Total Files: ${stats.totalFiles}\n` +
          `• Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB\n` +
          `• File Types: ${Object.entries(stats.fileTypes).map(([ext, count]) => `${ext}: ${count}`).join(', ')}`
          : '';

        return {
          content: [
            {
              type: 'text',
              text: `✅ Deployment successful!\n\n` +
                `🎯 Project: ${result.projectName}\n` +
                `🆔 Deployment ID: ${result.deploymentId || 'N/A'}\n` +
                `🌐 Deployment URL: ${result.deploymentUrl || 'N/A'}\n` +
                `💬 Message: ${result.message}` +
                statsText,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Deployment failed!\n\n` +
                `🎯 Project: ${result.projectName}\n` +
                `💬 Error: ${result.message}`,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Deployment failed with unexpected error:\n\n${error.message || 'Unknown error occurred'}`,
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`,
      },
    ],
  };
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Fast Web MCP server started');
}

main().catch(console.error);
