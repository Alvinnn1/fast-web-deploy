# API客户端使用指南

本目录包含了与后端API通信的客户端代码，提供统一的HTTP请求处理和全局Loading状态管理。

## 文件结构

```
services/
├── api.ts          # API客户端类和便捷方法
├── index.ts        # 导出文件
└── README.md       # 本文档
```

## API客户端 (ApiClient)

### 基本使用

```typescript
import { api } from '@/services'

// 获取域名列表
const response = await api.domains.list()
if (response.success) {
  console.log(response.data) // Domain[]
}

// 创建新域名
const newDomain = await api.domains.create({
  name: 'example.com',
  nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com']
})
```

### 可用的API方法

#### 域名相关
- `api.domains.list()` - 获取域名列表
- `api.domains.create(data)` - 创建新域名
- `api.domains.getDetail(id)` - 获取域名详情
- `api.domains.getDnsRecords(id)` - 获取DNS记录
- `api.domains.updateDnsRecord(domainId, recordId, data)` - 更新DNS记录
- `api.domains.requestSSL(id)` - 申请SSL证书

#### 页面相关
- `api.pages.list()` - 获取页面列表
- `api.pages.create(data)` - 创建新页面
- `api.pages.deploy(id, zipFile)` - 部署页面
- `api.pages.getDeploymentStatus(id)` - 获取部署状态

### 错误处理

API客户端会自动处理错误并抛出统一格式的错误对象：

```typescript
try {
  const response = await api.domains.list()
} catch (error) {
  // error 是 ApiResponse 格式
  console.error(error.message)
  console.error(error.error?.code)
}
```

### 自定义API客户端

如果需要自定义配置，可以创建新的ApiClient实例：

```typescript
import { ApiClient } from '@/services'

const customClient = new ApiClient('https://api.example.com')
const response = await customClient.get('/custom-endpoint')
```

## 全局Loading管理

API客户端会自动管理全局Loading状态。在Vue组件中使用：

```typescript
import { useLoading } from '@/utils'

export default {
  setup() {
    const { isLoading } = useLoading()
    
    return {
      isLoading
    }
  }
}
```

## 在Vue组件中的完整示例

```vue
<template>
  <div>
    <!-- 全局Loading -->
    <div v-if="isLoading" class="loading-overlay">
      <LoadingSpinner />
    </div>
    
    <!-- 错误提示 -->
    <ErrorMessage v-if="error" :message="error" @dismiss="error = null" />
    
    <!-- 域名列表 -->
    <div v-for="domain in domains" :key="domain.id">
      {{ domain.name }}
    </div>
    
    <button @click="addNewDomain">添加域名</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/services'
import { useLoading, ErrorHandler } from '@/utils'

const { isLoading } = useLoading()
const domains = ref([])
const error = ref(null)

const fetchDomains = async () => {
  try {
    error.value = null
    const response = await api.domains.list()
    if (response.success) {
      domains.value = response.data
    }
  } catch (err) {
    const userError = ErrorHandler.handle(err)
    error.value = userError.message
  }
}

const addNewDomain = async () => {
  try {
    const response = await api.domains.create({
      name: 'new-domain.com'
    })
    if (response.success) {
      await fetchDomains() // 刷新列表
    }
  } catch (err) {
    const userError = ErrorHandler.handle(err)
    error.value = userError.message
  }
}

onMounted(() => {
  fetchDomains()
})
</script>
```

## 类型安全

所有API方法都提供完整的TypeScript类型支持：

```typescript
import type { Domain, CreateDomainRequest } from '@/types/domain'

// 类型安全的API调用
const createData: CreateDomainRequest = {
  name: 'example.com',
  nameservers: ['ns1.cloudflare.com']
}

const response = await api.domains.create(createData)
if (response.success && response.data) {
  const domain: Domain = response.data
  console.log(domain.id, domain.name)
}
```

## 注意事项

1. **自动Loading管理**: API调用会自动显示/隐藏全局Loading状态
2. **错误处理**: 所有错误都会被转换为用户友好的格式
3. **类型安全**: 使用TypeScript确保类型安全
4. **单例模式**: LoadingManager使用单例模式，确保全局状态一致
5. **文件上传**: 支持ZIP文件上传，自动处理FormData格式