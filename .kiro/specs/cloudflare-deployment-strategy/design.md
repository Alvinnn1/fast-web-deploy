# Design Document

## Overview

本设计文档为 Cloudflare Static Deployer 项目制定了完整的 Cloudflare 平台部署策略。项目是一个全栈应用，包含 Vue.js 前端和 Node.js Fastify 后端，用于管理 Cloudflare 静态网站部署。

基于项目特性和 Cloudflare 平台能力分析，推荐采用**混合部署架构**：
- **前端**: Cloudflare Pages (静态托管 + CDN)
- **后端**: Cloudflare Workers (Serverless API) 或 外部容器服务

## Architecture

### 部署架构选择

#### 方案一：完全 Cloudflare 原生 (推荐)
```
用户请求 → Cloudflare CDN → Pages (前端) + Workers (后端API)
```

**优势:**
- 完全利用 Cloudflare 生态系统
- 全球 CDN 加速
- 自动 HTTPS 和 DDoS 防护
- 成本效益高（免费额度充足）
- 零冷启动时间（Pages）

**限制:**
- Workers 运行时限制（CPU 时间、内存）
- 需要适配 Workers 运行环境
- 文件上传需要特殊处理

#### 方案二：混合部署
```
用户请求 → Cloudflare CDN → Pages (前端) + 外部服务 (后端API)
```

**适用场景:**
- 后端逻辑复杂，不适合 Workers
- 需要长时间运行的任务
- 需要特定的 Node.js 功能

**外部服务选项:**
- Railway (推荐，简单易用)
- Render (免费层可用)
- DigitalOcean App Platform
- 自建 VPS + Docker

## Components and Interfaces

### 前端部署 (Cloudflare Pages)

#### 构建配置
```yaml
# wrangler.toml 或 Pages 设置
[build]
command = "npm run build"
publish = "frontend/dist"

[build.environment_variables]
VITE_API_BASE_URL = "https://api.yourdomain.com"
```

#### 环境变量配置
- `VITE_API_BASE_URL`: 后端 API 基础 URL
- `VITE_CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账户 ID（如需要）

#### 路由配置
```javascript
// _routes.json (Pages Functions 路由)
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": ["/*"]
}
```

### 后端部署

#### 选项 A: Cloudflare Workers

**适配要求:**
1. 将 Fastify 应用转换为 Workers 兼容格式
2. 使用 Workers 兼容的存储方案
3. 处理文件上传限制

**Workers 入口文件结构:**
```typescript
// worker.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 路由处理逻辑
    return handleRequest(request, env)
  }
}
```

**存储方案:**
- Cloudflare KV (键值存储)
- Cloudflare D1 (SQLite 数据库)
- Cloudflare R2 (对象存储，用于文件)

#### 选项 B: 外部容器服务

**Docker 部署配置:**
```dockerfile
# 使用现有 Dockerfile，优化构建
FROM node:18-alpine
# ... 现有配置
```

**环境变量:**
- `CLOUDFLARE_API_TOKEN`: Cloudflare API 令牌
- `NODE_ENV=production`
- `PORT=3000`
- `CORS_ORIGINS`: 前端域名

## Data Models

### 配置数据结构

#### 部署配置
```typescript
interface DeploymentConfig {
  frontend: {
    platform: 'cloudflare-pages'
    domain?: string
    buildCommand: string
    publishDir: string
    environmentVariables: Record<string, string>
  }
  backend: {
    platform: 'cloudflare-workers' | 'railway' | 'render' | 'docker'
    domain?: string
    environmentVariables: Record<string, string>
    scaling?: {
      minInstances: number
      maxInstances: number
    }
  }
}
```

#### 环境配置
```typescript
interface EnvironmentConfig {
  development: DeploymentConfig
  staging: DeploymentConfig
  production: DeploymentConfig
}
```

### API 接口适配

#### Workers 适配的 API 结构
```typescript
// 路由处理器适配
interface WorkersRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  handler: (request: Request, env: Env) => Promise<Response>
}
```

## Error Handling

### 部署错误处理

#### 构建失败处理
1. **前端构建失败**
   - 检查依赖安装
   - 验证环境变量
   - 检查 TypeScript 类型错误

2. **后端部署失败**
   - Workers: 检查运行时兼容性
   - 容器: 检查 Docker 构建和端口配置

#### 运行时错误处理
1. **API 连接失败**
   - 实现重试机制
   - 提供降级方案
   - 监控和告警

2. **跨域问题**
   - 配置正确的 CORS 策略
   - 验证域名配置

### 监控和日志

#### Cloudflare Analytics
- Pages 访问统计
- Workers 执行统计
- 错误率监控

#### 外部监控
- Uptime 监控 (UptimeRobot)
- 性能监控 (Web Vitals)
- 错误追踪 (Sentry)

## Testing Strategy

### 部署前测试

#### 本地测试
```bash
# 前端测试
cd frontend && npm run test && npm run build

# 后端测试
cd backend && npm run test && npm run build

# 集成测试
npm run test
```

#### 预部署验证
1. **构建验证**
   - 确保所有依赖正确安装
   - 验证构建产物完整性
   - 检查环境变量配置

2. **功能测试**
   - API 端点测试
   - 前后端集成测试
   - 文件上传功能测试

### 部署后测试

#### 自动化测试
```typescript
// 部署后健康检查
const healthChecks = [
  { url: 'https://app.yourdomain.com', expected: 200 },
  { url: 'https://api.yourdomain.com/health', expected: 200 },
  { url: 'https://api.yourdomain.com/api/test', expected: 200 }
]
```

#### 性能测试
- Lighthouse 性能评分
- API 响应时间测试
- 负载测试（如需要）

## 部署流程设计

### CI/CD 流程

#### GitHub Actions 工作流
```yaml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Workers/Railway
        # 根据选择的后端方案配置
```

### 手动部署流程

#### 前端部署步骤
1. 构建前端应用
2. 配置 Cloudflare Pages
3. 连接 Git 仓库
4. 设置构建配置
5. 配置自定义域名

#### 后端部署步骤
1. 选择部署平台
2. 配置环境变量
3. 部署应用
4. 配置域名和 SSL
5. 设置监控

## 成本分析

### Cloudflare Pages (前端)
- **免费额度**: 500 次构建/月，100GB 带宽/月
- **付费计划**: $20/月 (5000 次构建，无限带宽)

### Cloudflare Workers (后端)
- **免费额度**: 100,000 请求/天
- **付费计划**: $5/月 (10M 请求)

### 外部服务 (后端备选)
- **Railway**: $5/月起 (512MB RAM)
- **Render**: 免费层可用，$7/月起
- **DigitalOcean**: $5/月起

### 总成本估算
- **完全免费方案**: $0/月 (适合小型项目)
- **基础付费方案**: $5-10/月
- **生产环境方案**: $20-30/月

## 安全考虑

### 环境变量安全
- 使用平台提供的环境变量管理
- 敏感信息加密存储
- 定期轮换 API 密钥

### 网络安全
- 启用 HTTPS (自动)
- 配置 CSP 头
- 实施 CORS 策略
- 启用 DDoS 防护

### API 安全
- 实施速率限制
- 输入验证和清理
- 错误信息脱敏
- 访问日志记录