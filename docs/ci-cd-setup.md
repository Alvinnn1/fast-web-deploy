# CI/CD 设置指南

本指南将帮助您设置 GitHub Actions 自动部署到 Cloudflare 平台。

## 快速开始

### 1. 准备 Cloudflare 账户

1. 注册或登录 [Cloudflare](https://cloudflare.com)
2. 获取账户 ID（在控制台右侧边栏）
3. 创建 API 令牌

### 2. 创建 API 令牌

1. 转到 Cloudflare 控制台 > "My Profile" > "API Tokens"
2. 点击 "Create Token"
3. 使用 "Custom token" 模板
4. 设置以下权限：
   - **Zone:Zone:Read** (所有区域)
   - **Zone:DNS:Edit** (所有区域)
   - **Account:Cloudflare Pages:Edit** (所有账户)
5. 可选添加 IP 限制以提高安全性
6. 创建并复制令牌

### 3. 设置 GitHub Secrets

转到 GitHub 仓库 > Settings > Secrets and variables > Actions

#### 必需的 Secrets
```
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
VITE_API_BASE_URL=https://your-api-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

#### 可选的 Secrets
```
API_URL=https://your-workers-api.your-subdomain.workers.dev
```

#### 可选的 Variables
```
DEPLOY_WORKERS=true  # 启用 Workers 部署
```

### 4. 创建 Cloudflare Pages 项目

1. 在 Cloudflare 控制台转到 "Pages"
2. 点击 "Create a project"
3. 选择 "Connect to Git" 或 "Direct Upload"
4. 项目名称设置为 `cloudflare-static-deployer`
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `frontend`

### 5. 测试部署

1. 推送代码到 `main` 分支
2. 查看 GitHub Actions 执行状态
3. 检查 Cloudflare Pages 部署状态

## 工作流说明

### `deploy-pages.yml`
- 专门用于前端部署
- 触发条件：`frontend/` 目录变更
- 包含测试、构建、部署和健康检查

### `cloudflare-deploy.yml`
- 完整的部署流程
- 包含前后端测试和部署
- 支持可选的 Workers 部署
- 包含部署后验证

## 自定义配置

### 修改项目名称
如果您的 Cloudflare Pages 项目名称不是 `cloudflare-static-deployer`，请修改工作流文件中的 `projectName` 参数：

```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    projectName: your-project-name  # 修改这里
```

### 添加环境变量
在工作流文件中添加环境变量：

```yaml
- name: Build application
  run: |
    cd frontend
    npm run build
  env:
    VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
    VITE_CUSTOM_VAR: ${{ secrets.VITE_CUSTOM_VAR }}  # 添加新变量
```

### 修改触发条件
```yaml
on:
  push:
    branches: [main, develop]  # 添加其他分支
    paths:
      - 'frontend/**'
      - 'backend/**'           # 监听后端变更
```

## 故障排除

### 常见错误

#### 1. API 令牌权限不足
```
Error: Authentication error
```
**解决方案**: 检查 API 令牌权限，确保包含所有必需权限。

#### 2. 项目名称不匹配
```
Error: Project not found
```
**解决方案**: 确认 Cloudflare Pages 项目名称与工作流配置一致。

#### 3. 构建失败
```
Error: Build failed
```
**解决方案**: 
- 检查 `package.json` 脚本
- 验证环境变量配置
- 查看构建日志详细信息

#### 4. 健康检查失败
```
Error: Health check failed
```
**解决方案**:
- 确认部署 URL 正确
- 检查应用是否包含 `/health` 端点
- 增加等待时间

### 调试步骤

1. **查看 GitHub Actions 日志**
   - 转到 Actions 标签页
   - 点击失败的工作流
   - 查看详细日志

2. **检查 Cloudflare 控制台**
   - 查看 Pages 部署状态
   - 检查构建日志
   - 验证环境变量配置

3. **本地测试**
   ```bash
   # 测试构建
   cd frontend
   npm run build
   
   # 测试脚本
   npm run test
   npm run lint
   ```

4. **验证配置**
   ```bash
   # 运行验证脚本
   node scripts/validate-workflows.js
   ```

## 高级配置

### 多环境部署
```yaml
# 添加 staging 环境
- name: Deploy to Staging
  if: github.ref == 'refs/heads/develop'
  uses: cloudflare/pages-action@v1
  with:
    projectName: cloudflare-static-deployer-staging
```

### 条件部署
```yaml
# 仅在特定条件下部署
- name: Deploy to Production
  if: github.ref == 'refs/heads/main' && !contains(github.event.head_commit.message, '[skip-deploy]')
```

### 通知集成
```yaml
# 添加 Slack 通知
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 安全最佳实践

1. **最小权限原则**: API 令牌仅授予必需权限
2. **IP 限制**: 为 API 令牌添加 IP 限制
3. **定期轮换**: 定期更新 API 令牌
4. **环境隔离**: 使用不同的令牌用于不同环境
5. **审计日志**: 定期检查 Cloudflare 审计日志

## 监控和维护

### 设置监控
1. 启用 Cloudflare Analytics
2. 配置 Uptime 监控
3. 设置错误告警

### 定期维护
1. 更新依赖版本
2. 检查工作流性能
3. 优化构建时间
4. 清理旧的部署

## 支持

如果遇到问题，请：
1. 查看本指南的故障排除部分
2. 检查 GitHub Actions 和 Cloudflare 文档
3. 在项目仓库创建 Issue