# 简化部署指南

本项目采用简化的生产环境部署策略，移除了测试步骤和多环境配置，专注于快速部署到生产环境。

## 部署架构

- **前端**: Cloudflare Pages (静态网站托管)
- **后端**: Cloudflare Workers (可选，API 服务)
- **域名**: luckyjingwen.top
- **环境**: 仅生产环境

## 自动部署

### GitHub Actions 自动部署

当代码推送到 `main` 分支时，会自动触发部署：

1. **前端部署**: 自动构建并部署到 Cloudflare Pages
2. **后端部署**: 如果启用 Workers，自动部署 API 服务
3. **健康检查**: 验证部署是否成功

### 所需的 GitHub Secrets

在 GitHub 仓库设置中配置以下 Secrets：

```bash
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
VITE_API_BASE_URL=https://luckyjingwen.top
```

### 可选的 GitHub Variables

```bash
DEPLOY_WORKERS=true  # 如果需要部署后端 API
```

## 手动部署

### 前端部署

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm ci

# 构建项目
npm run build

# 部署到 Cloudflare Pages
npm run pages:deploy
```

### 后端部署 (可选)

```bash
# 进入后端目录
cd backend

# 安装依赖
npm ci

# 构建 Workers
npm run build:workers

# 部署到 Cloudflare Workers
npm run wrangler:deploy
```

## 配置说明

### 前端配置

- **构建输出**: `frontend/dist/`
- **Cloudflare Pages 项目**: `cloudflare-static-deployer`
- **域名**: `luckyjingwen.top`

### 后端配置 (可选)

- **Workers 名称**: `cloudflare-static-deployer-api`
- **API 域名**: `api.luckyjingwen.top`
- **安全配置**: 启用 CORS、CSP、速率限制

### 环境变量

#### 前端环境变量
```bash
VITE_API_BASE_URL=https://luckyjingwen.top
```

#### 后端环境变量 (Workers)
```bash
NODE_ENV=production
CORS_ORIGINS=https://luckyjingwen.top,https://www.luckyjingwen.top,https://cloudflare-static-deployer.pages.dev
ENABLE_SECURITY_HEADERS=true
ENABLE_CSP=true
ENABLE_RATE_LIMITING=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
MAX_FILE_SIZE=10485760
```

## 部署验证

部署完成后，访问以下 URL 验证：

- **前端**: https://luckyjingwen.top
- **API 健康检查**: https://api.luckyjingwen.top/health

## 故障排除

### 常见问题

1. **部署失败**
   - 检查 GitHub Secrets 是否正确配置
   - 确认 Cloudflare API Token 有足够权限

2. **前端无法访问**
   - 检查 Cloudflare Pages 项目配置
   - 确认域名 DNS 设置正确

3. **API 无法访问** (如果启用 Workers)
   - 检查 Workers 部署状态
   - 确认路由配置正确

### 日志查看

```bash
# 查看 Workers 日志
cd backend
npm run wrangler:tail
```

## 安全配置

生产环境已启用以下安全功能：

- **CORS**: 限制跨域访问
- **CSP**: 内容安全策略
- **速率限制**: API 请求频率限制
- **安全头**: 各种安全相关的 HTTP 头

## 性能优化

- **静态资源缓存**: Cloudflare CDN 自动缓存
- **代码分割**: 前端代码自动分割优化
- **压缩**: 自动启用 Gzip/Brotli 压缩

## 监控

- **Cloudflare Analytics**: 自动收集访问统计
- **Workers Analytics**: API 使用情况监控 (如果启用)
- **健康检查**: 自动验证服务可用性

## 成本优化

- **Cloudflare Pages**: 免费额度通常足够使用
- **Cloudflare Workers**: 按请求计费，免费额度 100,000 请求/天
- **无额外存储成本**: 不使用 KV、D1、R2 等付费服务

## 快速开始

1. Fork 本仓库
2. 配置 GitHub Secrets
3. 推送代码到 `main` 分支
4. 等待自动部署完成
5. 访问 https://luckyjingwen.top 查看结果

就是这么简单！🚀