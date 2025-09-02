<template>
  <Card class="hover:bg-gray-50 transition-shadow duration-200 cursor-pointer pt-6" @click="handleClick">
    <div class="flex items-center justify-between">
      <!-- Page info -->
      <div class="flex-1">
        <div class="flex items-center space-x-3">
          <h3 class="text-lg font-medium text-gray-900">{{ page.name }}</h3>
          <span :class="statusClasses">
            {{ statusText }}
          </span>
        </div>

        <div class="mt-2 space-y-1">
          <p class="text-sm text-gray-600">
            创建时间: {{ formatDate(page.createdAt) }}
          </p>
          <p v-if="page.lastDeployedAt" class="text-sm text-gray-600">
            最后部署: {{ formatDate(page.lastDeployedAt) }}
          </p>

          <!-- Enhanced deployment progress display -->
          <p v-if="showDeploymentProgress && deploymentStatusText" class="text-sm text-blue-600 font-medium">
            <svg class="w-4 h-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            {{ deploymentStatusText }}
          </p>

          <!-- Error message display for failed deployments -->
          <div v-if="showErrorDetails && errorMessage"
            class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2 mt-2">
            <div class="flex items-start">
              <svg class="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd" />
              </svg>
              <div>
                <p class="font-medium">部署失败</p>
                <p class="text-xs mt-1">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          
          <div>
            <a v-for="domain in page.domains" :key="domain" rel="noopener noreferrer"
              class="text-purple-600 hover:text-purple-800 underline block" :href="`https://${domain}`" target="_blank">
              {{ domain }} <svg class="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg></a>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-3">
        <!-- Enhanced upload button with error state handling -->
        <Button v-if="canUpload" @click.stop="handleUpload" :variant="page.status === 'failed' ? 'primary' : 'outline'"
          size="sm" :class="page.status === 'failed' ? 'bg-red-600 hover:bg-red-700 text-white' : ''">
          <svg v-if="page.status === 'failed'" class="w-4 h-4 mr-2" fill="none" stroke="currentColor"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {{ getUploadButtonText() }}
        </Button>

        <!-- View Status button for deploying pages -->
        <Button v-if="page.status === 'deploying'" variant="outline" size="sm">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          部署中...
        </Button>

        <!-- Enhanced status icon with deployment progress -->
        <div class="flex-shrink-0">
          <!-- Deployed status with enhanced visual feedback -->
          <div v-if="page.status === 'deployed'" class="relative">
            <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd" />
            </svg>
            <!-- Success pulse animation for recently deployed -->
            <div v-if="page.url" class="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>

          <!-- Enhanced deploying status with progress indicator -->
          <div v-else-if="page.status === 'deploying'" class="relative">
            <svg class="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            <!-- Deployment progress indicator -->
            <div class="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          </div>

          <!-- Enhanced failed status with error indicator -->
          <div v-else-if="page.status === 'failed'" class="relative">
            <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd" />
            </svg>
            <!-- Error indicator with warning triangle -->
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd" />
              </svg>
            </div>
          </div>

          <!-- Default status -->
          <svg v-else class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Card, Button } from '@/components/ui'
import type { Page } from '@/types'

// Props
interface Props {
  page: Page
}

const props = defineProps<Props>()

// Events
const emit = defineEmits<{
  click: [page: Page]
  upload: [page: Page]
  viewStatus: [page: Page]
}>()

// Computed properties
const statusText = computed(() => {
  switch (props.page.status) {
    case 'created':
      return '已创建'
    case 'deploying':
      // Enhanced deployment status text with more detail
      if (props.page.deploymentId) {
        return '正在部署...'
      }
      return '部署中'
    case 'deployed':
      return '已部署'
    case 'failed':
      return '部署失败'
    default:
      return '未知状态'
  }
})

// Enhanced status display with deployment progress indicators
const deploymentStatusText = computed(() => {
  if (props.page.status === 'deploying') {
    // Show more detailed deployment progress if available
    return '正在处理部署请求，请稍候...'
  }
  return null
})

// Show deployment progress indicator
const showDeploymentProgress = computed(() => {
  return props.page.status === 'deploying'
})

const statusClasses = computed(() => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'

  switch (props.page.status) {
    case 'created':
      return `${baseClasses} bg-gray-100 text-gray-800`
    case 'deploying':
      return `${baseClasses} bg-blue-100 text-blue-800 animate-pulse`
    case 'deployed':
      return `${baseClasses} bg-green-100 text-green-800`
    case 'failed':
      // Enhanced error state styling
      return `${baseClasses} bg-red-100 text-red-800 border border-red-200`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
})

// Error message display for failed deployments
const errorMessage = computed(() => {
  if (props.page.status === 'failed') {
    // Return a user-friendly error message
    return '部署过程中发生错误，请重试或检查文件格式'
  }
  return null
})

// Show error details
const showErrorDetails = computed(() => {
  return props.page.status === 'failed'
})

const canUpload = computed(() => {
  return ['created', 'deployed', 'failed'].includes(props.page.status)
})

// Event handlers
const handleClick = () => {
  emit('click', props.page)
}

const handleUpload = () => {
  emit('upload', props.page)
}

const handleViewStatus = () => {
  emit('viewStatus', props.page)
}

// Utility functions
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getUploadButtonText = () => {
  switch (props.page.status) {
    case 'created':
      return '上传资源'
    case 'failed':
      return '重新部署'
    case 'deployed':
      return '更新页面'
    default:
      return '更新页面'
  }
}
</script>