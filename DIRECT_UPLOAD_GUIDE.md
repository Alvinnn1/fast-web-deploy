# 直接上传到 Cloudflare Pages 指南

## 概述

为了节省带宽和提高上传速度，我们实现了直接从前端上传ZIP文件到Cloudflare Pages的功能，而不需要通过我们的服务器中转。

## 工作原理

1. **获取上传URL**: 前端向我们的API请求一个临时的上传URL
2. **直接上传**: 前端使用这个URL直接上传文件到Cloudflare
3. **安全性**: 你的API token不会暴露给前端，只有临时的上传URL

## API变更

### 新增后端路由

```http
POST /api/pages/:id/upload-url
```

**响应:**
```json
{
  "success": true,
  "data": {
    "deploymentId": "deployment-id",
    "uploadUrl": "https://api.cloudflare.com/client/v4/accounts/.../deployments/.../files",
    "jwt": "temporary-jwt-token"
  }
}
```

### 新增前端API方法

```typescript
// 获取直接上传URL
const uploadInfo = await api.pages.getUploadUrl(pageId)

// 直接上传到Cloudflare
const result = await api.pages.deployDirect(
  uploadInfo.data.uploadUrl,
  uploadInfo.data.jwt,
  zipFile
)
```

## 使用示例

### 在Vue组件中使用

```vue
<template>
  <div>
    <input type="file" @change="handleFileUpload" accept=".zip" />
    <div v-if="deploymentStatus">{{ deploymentStatus }}</div>
  </div>
</template>

<script setup>
import { usePageManagement } from '@/examples/api-usage'

const { deployPage, deploymentStatus, error } = usePageManagement()

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (file && file.name.endsWith('.zip')) {
    const success = await deployPage('your-page-id', file)
    if (success) {
      console.log('部署成功!')
    }
  }
}
</script>
```

### 手动使用API

```typescript
import { api } from '@/services/api'

async function deployPageManually(pageId: string, zipFile: File) {
  try {
    // 1. 获取上传URL
    const uploadResponse = await api.pages.getUploadUrl(pageId)
    if (!uploadResponse.success) {
      throw new Error('获取上传URL失败')
    }

    const { uploadUrl, jwt } = uploadResponse.data

    // 2. 直接上传到Cloudflare
    const deployResponse = await api.pages.deployDirect(uploadUrl, jwt, zipFile)
    if (deployResponse.success) {
      console.log('上传成功!')
      
      // 3. 轮询部署状态
      const checkStatus = async () => {
        const status = await api.pages.getDeploymentStatus(pageId)
        console.log('部署状态:', status.data?.status)
      }
      
      setInterval(checkStatus, 2000)
    }
  } catch (error) {
    console.error('部署失败:', error)
  }
}
```

## 优势

1. **节省带宽**: 文件不需要通过你的服务器中转
2. **提高速度**: 直接上传到Cloudflare的CDN网络
3. **降低成本**: 减少服务器的带宽使用
4. **安全性**: API token不会暴露给前端
5. **可靠性**: 如果直接上传失败，会自动回退到传统上传方式

## 向后兼容

原有的上传方式仍然保留，可以作为备选方案：

```typescript
// 传统上传方式 (通过服务器)
const result = await api.pages.deploy(pageId, zipFile)

// 或者显式使用传统方式
const { deployPageTraditional } = usePageManagement()
await deployPageTraditional(pageId, zipFile)
```

## 注意事项

1. 直接上传需要Cloudflare Pages API支持
2. 如果直接上传失败，系统会自动回退到传统上传方式
3. 上传URL是临时的，有时间限制
4. 确保ZIP文件大小不超过Cloudflare的限制 (通常是25MB)