# Cloudflare Static Deployer - 简化版

一个专为生产环境优化的 Cloudflare 静态网站部署工具，采用简化配置，快速部署。

## ✨ 特性

- 🚀 **一键部署**: 推送代码自动部署到 Cloudflare Pages
- 🔒 **安全优化**: 内置 CORS、CSP、速率限制等安全配置
- ⚡ **高性能**: Cloudflare CDN 全球加速
- 💰 **成本优化**: 使用免费服务，无额外存储成本
- 🎯 **生产就绪**: 专注生产环境，配置简单

## 🏗️ 架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Repo   │───▶│  GitHub Actions  │───▶│ Cloudflare Pages│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │Cloudflare Workers│
                       └─────────────────┘
```

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/cloudflare-static-deployer.git
cd cloudflare-static-deployer
```

### 2. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

```
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id  
VITE_API_BASE_URL=https://luckyjingwen.top
```

### 3. 推送代码

```bash
git push origin main
```

就是这么简单！GitHub Actions 会自动构建并部署到 Cloudflare Pages。

## 📁 项目结构

```
cloudflare-static-deployer/
├── frontend/                 # Vue.js 前端应用
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/                  # Cloudflare Workers API (可选)
│   ├── src/
│   ├── worker.ts
│   └── wrangler.toml
├── .github/workflows/        # GitHub Actions 配置
└── package.json
```

## 🛠️ 本地开发

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

### 后端开发 (可选)

```bash
cd backend
npm install
npm run wrangler:dev
```

## 📦 部署

### 自动部署

推送到 `main` 分支会自动触发部署：

1. 构建前端应用
2. 部署到 Cloudflare Pages
3. 部署 Workers API
4. 运行健康检查

### 手动部署

```bash
# 部署前端
npm run deploy:pages

# 部署后端 (可选)
npm run deploy:workers

# 部署全部
npm run deploy:all
```

## ⚙️ 配置

### 环境变量

#### 前端 (.env.production)
```bash
VITE_API_BASE_URL=https://luckyjingwen.top
```

#### 后端 (wrangler.toml)
```toml
[vars]
NODE_ENV = "production"
CORS_ORIGINS = "https://luckyjingwen.top,https://www.luckyjingwen.top"
ENABLE_SECURITY_HEADERS = "true"
ENABLE_CSP = "true"
ENABLE_RATE_LIMITING = "true"
```

### 域名配置

- **主域名**: luckyjingwen.top
- **API 域名**: api.luckyjingwen.top

## 🔒 安全特性

- **CORS 策略**: 限制跨域访问
- **CSP 头**: 防止 XSS 攻击
- **速率限制**: API 请求频率控制
- **安全头**: 完整的安全 HTTP 头配置

## 📊 监控

- **Cloudflare Analytics**: 自动收集访问统计
- **Workers Analytics**: API 使用监控
- **健康检查**: 自动验证服务状态

## 💰 成本

- **Cloudflare Pages**: 免费 (每月 500 次构建)
- **Cloudflare Workers**: 免费 (每天 100,000 请求)
- **域名**: 需要自行购买
- **总成本**: 基本免费使用

## 🔧 故障排除

### 常见问题

1. **部署失败**
   - 检查 GitHub Secrets 配置
   - 确认 Cloudflare API Token 权限

2. **网站无法访问**
   - 检查域名 DNS 设置
   - 确认 Cloudflare Pages 项目配置


### 日志查看

```bash
# 查看 Workers 实时日志
cd backend
npm run wrangler:tail
```

## 📚 文档

- [部署指南](./DEPLOYMENT_SIMPLIFIED.md)
- [安全配置](./backend/SECURITY.md)
- [API 文档](./backend/API.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---
