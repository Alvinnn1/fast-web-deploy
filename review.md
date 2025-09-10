# 🚀 Fast Web Deploy

> 一站式静态网站快速部署解决方案，让你的项目秒速上线！


## 🎯 项目背景

把项目发布到公网很麻烦，需要找多个人协调：买域名、申请证书、配置CI/CD部署构建、设置CDN、管理DNS等，整个流程复杂且耗时。本项目旨在解决这些痛点，提供一站式的快速部署解决方案。

## 🌟 适用场景

- 🎪 **演示项目(Demo)**: 快速展示开发成果
- 📊 **数据展示**: 静态数据可视化页面  
- 🎯 **引流页面**: 营销活动着陆页
- 🔍 **SEO验证**: 快速搭建测试页面进行SEO实验
- 🧪 **原型验证**: 产品原型快速上线验证


## 🏗️ 系统架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   📁 本地项目   │───▶│  🤖 MCP服务器    │───▶│ ☁️ Cloudflare   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  🎯 AI代理      │    │ 🌐 全球CDN     │
                       │  (Cursor等)     │    │ (秒级访问)      │
                       └─────────────────┘    └─────────────────┘
```

## 🔄 工作流程

1. 📂 **上传项目** → 2. 🔍 **智能分析** → 3. ☁️ **云端部署** → 4. 🌐 **全球访问**

## 🛠️ 项目技术栈

### 💻 前端
- 🟢 **Vue 3**: 现代响应式框架，使用Composition API
- 🔷 **TypeScript**: 类型安全，提升开发体验
- 🎨 **Tailwind CSS**: 原子化CSS框架，快速构建UI
- ⚡ **Vite**: 快速构建工具和开发服务器
- 🧩 **Radix Vue**: 无障碍UI组件库

### ⚙️ 后端
- ☁️ **Cloudflare Workers**: 提供nodejs运行时
- 🔷 **TypeScript**: 全栈类型安全
- 🔧 **Wrangler**: Workers开发部署工具
- 🔗 **Cloudflare API**: 直接集成Cloudflare服务

### 🤖 MCP (Model Context Protocol)
- 🎯 **MCP服务器**: 支持AI代理自动化部署
- 📁 **文件处理**: 递归文件夹处理和智能上传
- 🔌 **API集成**: 与Fast Web平台无缝对接

### 🏗️ 基础设施
- 🌐 **Cloudflare Pages**: 静态网站托管
- 🚀 **Cloudflare CDN**: 全球内容分发网络
- 🔄 **GitHub Actions**: 自动化CI/CD部署

## ✨ 核心功能

### 🚀 1. 快速页面部署
- 📤 一键上传静态文件到Cloudflare Pages
- 🔗 自动生成访问URL
- 📊 支持实时部署状态监控
- 🔒 自动域名绑定和SSL证书配置

### 🌐 2. 域名管理
- 📋 域名导入和管理
- ✏️ DNS记录可视化编辑
- 🔐 SSL证书自动申请和续期
- 👁️ 域名状态实时监控

### 📁 3. 文件上传系统
- 🧠 智能文件过滤（自动忽略node_modules等）
- 🔄 断点续传和增量更新
- ✅ 文件大小和类型校验

### 🤖 4. MCP自动化部署
🎯 **提供一条指令快速MCP部署/更新（无需GUI界面）**
- 🤖 支持AI代理自动化操作
- ⌨️ 命令行一键部署
- 🆕 项目自动创建和更新
- 🧩 智能资源管理

## 📚 MCP使用指南

### 🔧 步骤1: 环境准备
安装Node.js环境（>=18.0.0）
```bash
# 下载并安装 Node.js
# 🔗 https://nodejs.org/en/download
```

### 🎯 步骤2: Cursor IDE配置
在Cursor的MCP配置中添加：
```json
{
  "mcpServers": {
    "fast-web-deploy": {
      "command": "npx",
      "args": [
        "-y",
        "fast-web-deploy-mcp"
      ]
    }
  }
}
```

配置完成后，可以直接在Cursor中使用自然语言指令进行部署：
- 🔄 "用mcp（fast-web-deploy）部署我的网站（projectName: ai-girl-demo）@web-folder"

### 📊 步骤3: 项目管理
- 🆕 如果项目不存在，系统会自动创建
- 🔄 支持增量更新，只上传变更文件
- 🔗 自动生成项目访问链接

## 🏆 项目优势

- 🎛️ **零配置部署**: 无需复杂的服务器配置
- 🌍 **全球加速**: Cloudflare CDN全球节点
- 🛡️ **安全可靠**: 内置安全头和CORS策略
- 🤖 **AI友好**: 支持MCP协议，AI代理可直接操作

---

## 具体场景示例

- 落地页(SEO) [LiveMe 1v1chat](https://1v1chathot.com/)
- Demo [ai-girl-demo](https://ai-girl-demo.pages.dev/)
- 数据展示 [ai-characters爬虫](https://ai-characters.pages.dev/)
- 主站拓展 [LiveMe official](https://qa.liveme.com/)


## 地址
- 项目地址 [luckyjingwen.top](https://luckyjingwen.top)
- 仓库地址 [Github](https://github.com/Alvinnn1/fast-web-deploy)
- MCP地址 [npm](https://www.npmjs.com/package/fast-web-deploy-mcp)
