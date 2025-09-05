# Fast Web MCP Server

这是一个Model Context Protocol (MCP) 服务器，用于部署项目到Fast Web平台。

## 功能特性

- 🚀 **自动项目创建**: 如果项目不存在，会自动创建
- 📁 **文件夹处理**: 支持递归读取文件夹内容
- 🔍 **智能上传**: 只上传缺失的资源，避免重复上传
- 📊 **部署统计**: 提供详细的文件统计信息
- 🛡️ **文件过滤**: 自动忽略不需要的文件（如node_modules、.git等）

## 安装

### 使用npx（推荐）

无需安装，直接使用：

```bash
# 运行MCP服务器
npx fast-web-deploy-mcp

# 查看帮助
npx fast-web-deploy-mcp --help
```

### 本地开发安装

```bash
cd mcp
npm install
```

## 构建

```bash
npm run build
```

## 使用方法

### 使用npx运行（推荐）

```bash
# 直接运行MCP服务器
npx fast-web-deploy-mcp

# 或者指定版本
npx fast-web-deploy-mcp@latest
```

### 作为MCP服务器运行

```bash
npm start
```

### 开发模式

```bash
npm run dev
```

## MCP工具

### deploy

部署项目到Fast Web平台。

**参数:**
- `projectName` (string): 项目名称，如果不存在会自动创建
- `folderPath` (string): 包含项目文件的文件夹的绝对路径

**示例:**
```json
{
  "projectName": "my-website",
  "folderPath": "/Users/username/projects/my-website"
}
```
需要安装nodejs环境
[click to download nodejs](https://nodejs.org/en/download)

### 在MCP客户端中配置(例如Cursor)

```json
{
  "mcpServers": {
    "fast-web": {
      "command": "npx",
      "args": [
        "-y",
        "fast-web-deploy-mcp"
      ]
    }
  }
}
```

## 工作流程

1. **验证文件夹**: 检查指定的文件夹是否存在且可访问
2. **项目检查**: 检查项目是否存在，如果不存在则创建
3. **获取JWT**: 获取上传认证令牌
4. **检查缺失资源**: 确定哪些文件需要上传
5. **上传资源**: 上传缺失的文件
6. **部署项目**: 使用manifest部署项目

## 文件过滤

以下文件和文件夹会被自动忽略：
- `_worker.js`
- `_routes.json`
- `functions`
- `.DS_Store`
- `node_modules`
- `.git`
- `Thumbs.db`
- `.vscode`
- `.idea`

## API端点

服务器使用以下API端点：
- 基础URL: `https://api.luckyjingwen.top`
- 项目检查: `GET /api/pages/{projectName}`
- 创建项目: `POST /api/pages`
- 获取上传URL: `GET /api/pages/{projectName}/upload-url`
- 检查缺失资源: `POST /api/pages/check-missing-assets`
- 上传资源: `POST /api/pages/assets-upload`
- 部署项目: `POST /api/pages/{projectName}/deploy`

## 错误处理

服务器包含完善的错误处理机制：
- 文件夹验证错误
- API调用失败
- 网络连接问题
- 文件处理错误

## 开发

### 项目结构

```
src/
├── index.ts              # MCP服务器主文件
├── types.ts              # 类型定义
├── api-client.ts         # API客户端
├── file-processor.ts     # 文件处理工具
└── deployment-service.ts # 部署服务
```

### 添加新工具

在`src/index.ts`中添加新的工具定义和处理逻辑。


## 许可证

MIT
