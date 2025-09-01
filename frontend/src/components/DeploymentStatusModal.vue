<template>
  <Modal :open="isOpen" :title="modalTitle" size="lg" @close="handleClose">
    <div class="space-y-6">
      <!-- Page Info -->
      <div v-if="page" class="bg-gray-50 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-900 mb-2">页面项目</h3>
        <p class="text-lg font-medium text-gray-900">{{ page.name }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <LoadingSpinner />
        <p class="mt-2 text-gray-500">正在获取部署状态...</p>
      </div>

      <!-- Error State -->
      <Alert v-else-if="error" variant="error" title="获取状态失败">
        {{ error }}
      </Alert>

      <!-- Deployment Status -->
      <DeploymentStatus v-else-if="deploymentStatus" :deployment="deploymentStatus" :loading="refreshing"
        @retry="handleRetry" />
    </div>

    <template #footer>
      <Button variant="outline" @click="handleClose">
        关闭
      </Button>
      <Button v-if="deploymentStatus && isInProgress" @click="refreshStatus" :disabled="refreshing">
        <LoadingSpinner v-if="refreshing" size="sm" class="mr-2" />
        刷新状态
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import DeploymentStatus from './DeploymentStatus.vue'
import { api } from '@/services/api'
import type { Page, DeploymentStatusDetail } from '@/types'

interface Props {
  isOpen: boolean
  page?: Page
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  retry: [page: Page]
}>()

// Component state
const deploymentStatus = ref<DeploymentStatusDetail | null>(null)
const loading = ref(false)
const refreshing = ref(false)
const error = ref<string | null>(null)
const autoRefreshInterval = ref<number | null>(null)

// Computed properties
const modalTitle = computed(() => {
  return props.page ? `${props.page.name} - 部署状态` : '部署状态'
})

const isInProgress = computed(() => {
  if (!deploymentStatus.value) return false
  return ['queued', 'building', 'deploying'].includes(deploymentStatus.value.status)
})

// Methods
const fetchDeploymentStatus = async (showLoading = true) => {
  if (!props.page) return

  try {
    if (showLoading) {
      loading.value = true
    } else {
      refreshing.value = true
    }
    error.value = null

    const response = await api.pages.getDeploymentStatus(props.page.id)

    if (response.success && response.data) {
      // Ensure the response data matches the expected structure
      const statusData: DeploymentStatusDetail = {
        status: response.data.status || 'queued',
        progress: response.data.progress,
        logs: response.data.logs,
        url: response.data.url,
        errorMessage: response.data.errorMessage
      }
      deploymentStatus.value = statusData
    } else {
      throw new Error(response.message || '获取部署状态失败')
    }
  } catch (err: any) {
    console.error('Failed to fetch deployment status:', err)
    error.value = err.message || '获取部署状态失败，请稍后重试'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const refreshStatus = () => {
  fetchDeploymentStatus(false)
}

const handleRetry = () => {
  if (props.page) {
    emit('retry', props.page)
  }
}

const handleClose = () => {
  emit('close')
}

const startAutoRefresh = () => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
  }

  // Auto-refresh every 5 seconds when deployment is in progress
  if (isInProgress.value) {
    autoRefreshInterval.value = window.setInterval(() => {
      if (isInProgress.value && props.isOpen) {
        fetchDeploymentStatus(false)
      } else {
        stopAutoRefresh()
      }
    }, 5000)
  }
}

const stopAutoRefresh = () => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
    autoRefreshInterval.value = null
  }
}

// Watch for modal open/close
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.page) {
    // Reset state and fetch status when opening
    deploymentStatus.value = null
    error.value = null
    fetchDeploymentStatus()
  } else {
    // Stop auto-refresh when closing
    stopAutoRefresh()
  }
})

// Watch for deployment status changes to manage auto-refresh
watch(deploymentStatus, () => {
  if (props.isOpen) {
    if (isInProgress.value) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }
}, { deep: true })

// Cleanup on unmount
onUnmounted(() => {
  stopAutoRefresh()
})
</script>