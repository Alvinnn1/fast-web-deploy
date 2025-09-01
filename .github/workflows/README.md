# GitHub Actions Workflows

本目录包含用于自动化部署到 Cloudflare 平台的 GitHub Actions 工作流。

## 工作流文件

### 1. `deploy-pages.yml`
专门用于 Cloudflare Pages 的前端部署工作流。

**触发条件:**
- 推送到 `main` 分支且修改了 `frontend/` 目录
- 针对 `main` 分支的 Pull Request

**功能:**
- 安装依赖并运行前端测试
- 构建前端应用
- 部署到 Cloudflare Pages
- 执行部署后健康检查

### 2. `cloudflare-deploy.yml`
完整的静态网站部署流程，包含测试、构建和部署。

**触发条件:**
- 推送到 `main` 分支
- 针对 `main` 分支的 Pull Request

**功能:**
- 运行前端和后端测试
- 代码质量检查 (linting)
- 构建前端应用
- 部署到 Cloudflare Pages
- 可选的 Workers 部署
- 部署后健康检查和通知

## 必需的 Secrets 配置

在 GitHub 仓库设置中配置以下 Secrets:

### Cloudflare 相关
- `CLOUDFLARE_API_TOKEN`: Cloudflare API 令牌
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账户 ID

### 应用配置
- `VITE_API_BASE_URL`: 前端 API 基础 URL
- `FRONTEND_URL`: 前端部署后的 URL (用于健康检查)
- `API_URL`: 后端 API URL (如果使用 Workers)

### GitHub
- `GITHUB_TOKEN`: 自动提供，无需手动配置

## 可选的 Variables 配置

在 GitHub 仓库设置中配置以下 Variables:

- `DEPLOY_WORKERS`: 设置为 `true` 启用 Workers 部署

## 设置步骤

### 1. 获取 Cloudflare API 令牌

1. 登录 Cloudflare 控制台
2. 转到 "My Profile" > "API Tokens"
3. 创建自定义令牌，权限包括:
   - Zone:Zone:Read
   - Zone:DNS:Edit
   - Account:Cloudflare Pages:Edit

### 2. 获取账户 ID

1. 在 Cloudflare 控制台右侧边栏找到账户 ID
2. 复制账户 ID

### 3. 配置 GitHub Secrets

1. 转到 GitHub 仓库 > Settings > Secrets and variables > Actions
2. 添加上述必需的 secrets

### 4. 配置 Cloudflare Pages 项目

1. 在 Cloudflare 控制台创建 Pages 项目
2. 项目名称设置为 `cloudflare-static-deployer`
3. 或修改工作流���的 `projectName` 参数

## 工作流执行流程

### Pull Request 流程
1. 运行测试和代码检查
2. 构建应用验证
3. 不执行实际部署

### Main 分支推送流程
1. 运行完整测试套件
2. 构建前端应用
3. 部署到 Cloudflare Pages
4. 可选部署到 Cloudflare Workers
5. 执行健康检查
6. 发送部署状态通知

## 故障排除

### 常见问题

1. **API 令牌权限不足**
   - 确保令牌包含所有必需权限
   - 检查令牌是否已过期

2. **构建失败**
   - 检查依赖版本兼容性
   - 验证环境变量配置

3. **部署失败**
   - 确认 Cloudflare 项目名称正确
   - 检查账户 ID 是否正确

4. **健康检查失败**
   - 确认部署 URL 正确
   - 检查应用是否正确启动

### 调试技巧

1. 查看 GitHub Actions 日志
2. 检查 Cloudflare 控制台部署状态
3. 验证环境变量和 secrets 配置
4. 测试本地构建是否成功

## 自定义配置

### 修改触发条件
```yaml
on:
  push:
    branches: [main, develop]  # 添加其他分支
    paths:
      - 'frontend/**'
      - 'backend/**'           # 添加其他路径
```

### 添加环境变量
```yaml
env:
  CUSTOM_VAR: ${{ secrets.CUSTOM_VAR }}
```

### 修改健康检查
```yaml
- name: Custom health check
  run: |
    curl -f ${{ secrets.FRONTEND_URL }}/api/status
    # 添加其他检查
```