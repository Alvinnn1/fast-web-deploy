<template>
  <div class="space-y-4">
    <!-- Deployment Status Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900">部署状态</h3>
      <Button v-if="canRetry" @click="handleRetry" variant="outline" size="sm" :disabled="loading">
        重新部署
      </Button>
    </div>

    <!-- Status Card -->
    <Card class="p-6">
      <div class="space-y-4">
        <!-- Status Icon and Text -->
        <div class="flex items-center space-x-3">
          <!-- Success -->
          <div v-if="deployment.status === 'success'" class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <p class="text-lg font-medium text-green-900">部署成功</p>
              <p class="text-sm text-green-700">您的网站已成功部署并可以访问</p>
            </div>
          </div>

          <!-- In Progress -->
          <div v-else-if="isInProgress" class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
            </div>
            <div>
              <p class="text-lg font-medium text-blue-900">{{ getStatusText(deployment.status) }}</p>
              <p class="text-sm text-blue-700">请稍候，正在处理您的部署...</p>
            </div>
          </div>

          <!-- Failed -->
          <div v-else-if="deployment.status === 'failure'" class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <p class="text-lg font-medium text-red-900">部署失败</p>
              <p class="text-sm text-red-700">部署过程中发生错误，请查看详细信息</p>
            </div>
          </div>

          <!-- Queued -->
          <div v-else class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <p class="text-lg font-medium text-gray-900">{{ getStatusText(deployment.status) }}</p>
              <p class="text-sm text-gray-700">部署已加入队列，即将开始处理</p>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div v-if="showProgress" class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">进度</span>
            <span class="text-gray-900">{{ progressPercentage }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-500"
              :style="{ width: `${progressPercentage}%` }"></div>
          </div>
        </div>

        <!-- Deployment URL -->
        <div v-if="deployment.url" class="space-y-2">
          <label class="text-sm font-medium text-gray-700">访问地址</label>
          <div class="flex items-center space-x-2">
            <Input :value="deployment.url" readonly class="flex-1" />
            <Button @click="copyUrl" variant="outline" size="sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Button>
            <Button @click="openUrl" variant="outline" size="sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Button>
          </div>
        </div>

        <!-- Error Message -->
        <Alert v-if="deployment.errorMessage" variant="error" title="错误详情">
          {{ deployment.errorMessage }}
        </Alert>

        <!-- Deployment Logs -->
        <div v-if="deployment.logs && deployment.logs.length > 0" class="space-y-2">
          <label class="text-sm font-medium text-gray-700">部署日志</label>
          <div class="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono max-h-64 overflow-y-auto">
            <div v-for="(log, index) in deployment.logs" :key="index" class="mb-1">
              {{ log }}
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Auto-refresh indicator -->
    <div v-if="isInProgress" class="text-center">
      <p class="text-sm text-gray-500">
        <LoadingSpinner size="sm" class="inline mr-2" />
        自动刷新中...
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, Button, Input, Alert, LoadingSpinner } from '@/components/ui'
import type { DeploymentStatusDetail } from '@/types'

interface Props {
  deployment: DeploymentStatusDetail
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  retry: []
}>()

// Component state
const copySuccess = ref(false)

// Computed properties
const isInProgress = computed(() => {
  return ['queued', 'building', 'deploying'].includes(props.deployment.status)
})

const canRetry = computed(() => {
  return props.deployment.status === 'failure'
})

const showProgress = computed(() => {
  return isInProgress.value && typeof props.deployment.progress === 'number'
})

const progressPercentage = computed(() => {
  if (typeof props.deployment.progress === 'number') {
    return Math.round(props.deployment.progress)
  }

  // Default progress based on status
  switch (props.deployment.status) {
    case 'queued':
      return 10
    case 'building':
      return 50
    case 'deploying':
      return 80
    case 'success':
      return 100
    default:
      return 0
  }
})

// Methods
const getStatusText = (status: string): string => {
  switch (status) {
    case 'queued':
      return '排队中'
    case 'building':
      return '构建中'
    case 'deploying':
      return '部署中'
    case 'success':
      return '部署成功'
    case 'failure':
      return '部署失败'
    default:
      return '未知状态'
  }
}

const copyUrl = async () => {
  if (!props.deployment.url) return

  try {
    await navigator.clipboard.writeText(props.deployment.url)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy URL:', error)
  }
}

const openUrl = () => {
  if (props.deployment.url) {
    window.open(props.deployment.url, '_blank', 'noopener,noreferrer')
  }
}

const handleRetry = () => {
  emit('retry')
}
</script>
