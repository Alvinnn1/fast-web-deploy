# 工具函数使用指南

本目录包含了应用的工具函数和管理器，主要提供Loading状态管理和错误处理功能。

## 文件结构

```
utils/
├── loading.ts      # Loading管理器和错误处理
├── index.ts        # 导出文件
└── README.md       # 本文档
```

## Loading管理器 (LoadingManager)

### 基本概念

LoadingManager是一个单例类，用于管理应用的全局Loading状态。它支持多个并发请求，只有当所有请求完成时才会隐藏Loading状态。

### 在Vue组件中使用

```typescript
import { useLoading } from '@/utils'

export default {
  setup() {
    const { isLoading, startLoading, stopLoading, reset } = useLoading()
    
    const handleAsyncOperation = async () => {
      startLoading()
      try {
        await someAsyncOperation()
      } finally {
        stopLoading()
      }
    }
    
    return {
      isLoading,
      handleAsyncOperation
    }
  }
}
```

### 直接使用LoadingManager

```typescript
import { LoadingManager } from '@/utils'

const loadingManager = LoadingManager.getInstance()

// 开始Loading
loadingManager.startLoading()

// 结束Loading
loadingManager.stopLoading()

// 检查Loading状态
const isLoading = loadingManager.isLoading()

// 订阅状态变化
const unsubscribe = loadingManager.subscribe((loading) => {
  console.log('Loading state changed:', loading)
})

// 重置状态（用于错误恢复）
loadingManager.reset()
```

### 多个并发请求

LoadingManager会自动处理多个并发请求：

```typescript
// 开始三个并发请求
loadingManager.startLoading() // count: 1, isLoading: true
loadingManager.startLoading() // count: 2, isLoading: true
loadingManager.startLoading() // count: 3, isLoading: true

// 完成请求
loadingManager.stopLoading()  // count: 2, isLoading: true
loadingManager.stopLoading()  // count: 1, isLoading: true
loadingManager.stopLoading()  // count: 0, isLoading: false
```

## 错误处理 (ErrorHandler)

### 基本使用

```typescript
import { ErrorHandler } from '@/utils'

try {
  await someApiCall()
} catch (error) {
  const userError = ErrorHandler.handle(error)
  
  console.log(userError.title)    // "网络连接错误"
  console.log(userError.message)  // "请检查网络连接后重试"
  console.log(userError.action)   // "retry"
}
```

### 支持的错误类型

ErrorHandler会根据错误类型返回用户友好的错误信息：

1. **网络错误** (`TypeError: Failed to fetch`)
   - 标题: "网络连接错误"
   - 建议操作: "retry"

2. **Cloudflare API错误** (`CLOUDFLARE_API_ERROR`)
   - 标题: "Cloudflare服务错误"
   - 建议操作: "retry"

3. **文件上传错误** (`UPLOAD_FAILED`)
   - 标题: "文件上传失败"
   - 建议操作: "retry"

4. **验证错误** (`VALIDATION_ERROR`)
   - 标题: "输入验证失败"
   - 建议操作: "dismiss"

5. **认证错误** (`AUTHENTICATION_ERROR`)
   - 标题: "API认证失败"
   - 建议操作: "redirect"

### 显示错误信息

```typescript
import { ErrorHandler } from '@/utils'

// 自定义错误显示函数
const showErrorToUser = (error) => {
  // 集成到你的UI组件中
  showToast(error.title, error.message, error.action)
}

// 处理并显示错误
ErrorHandler.showError(apiError, showErrorToUser)
```

## 异步操作包装器 (withLoading)

`withLoading`函数可以自动处理Loading状态和错误：

```typescript
import { withLoading } from '@/utils'

const fetchData = async () => {
  return await withLoading(
    async () => {
      const response = await api.domains.list()
      return response.data
    },
    (error) => {
      // 自定义错误处理
      console.error('Failed to fetch domains:', error)
    }
  )
}

// 使用
const domains = await fetchData()
if (domains) {
  // 成功获取数据
  console.log(domains)
} else {
  // 发生错误，已经被处理
}
```

## 在Vue组件中的完整示例

```vue
<template>
  <div>
    <!-- 全局Loading遮罩 -->
    <div v-if="isLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg">
        <LoadingSpinner />
        <p class="mt-2 text-gray-600">加载中...</p>
      </div>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <strong class="font-bold">{{ error.title }}</strong>
      <span class="block sm:inline">{{ error.message }}</span>
      <button 
        v-if="error.action === 'retry'"
        @click="retryOperation"
        class="ml-2 bg-red-500 text-white px-3 py-1 rounded text-sm"
      >
        重试
      </button>
      <button 
        @click="dismissError"
        class="ml-2 bg-gray-500 text-white px-3 py-1 rounded text-sm"
      >
        关闭
      </button>
    </div>
    
    <!-- 内容区域 -->
    <div class="content">
      <!-- 你的组件内容 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLoading, ErrorHandler, withLoading } from '@/utils'
import { api } from '@/services'

const { isLoading } = useLoading()
const error = ref(null)
const data = ref([])

const fetchData = async () => {
  const result = await withLoading(
    async () => {
      const response = await api.domains.list()
      return response.data
    },
    (err) => {
      error.value = ErrorHandler.handle(err)
    }
  )
  
  if (result) {
    data.value = result
  }
}

const retryOperation = () => {
  error.value = null
  fetchData()
}

const dismissError = () => {
  error.value = null
}

// 初始化时获取数据
fetchData()
</script>
```

## 最佳实践

1. **使用useLoading Hook**: 在Vue组件中优先使用`useLoading()`而不是直接操作LoadingManager

2. **统一错误处理**: 使用ErrorHandler.handle()确保错误信息的一致性

3. **避免手动管理Loading**: API客户端会自动管理Loading状态，避免手动调用

4. **错误恢复**: 在必要时使用`loadingManager.reset()`来恢复Loading状态

5. **类型安全**: 利用TypeScript的类型检查确保代码质量

6. **用户体验**: 为不同类型的错误提供合适的用户操作选项