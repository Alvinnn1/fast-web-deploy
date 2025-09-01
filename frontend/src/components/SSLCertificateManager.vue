<template>
  <Card title="SSL 证书管理">
    <!-- Certificate Status -->
    <div v-if="certificate" class="space-y-4">
      <!-- Certificate Info -->
      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-gray-900">证书信息</h4>
          <span :class="statusClasses" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
            <span :class="statusDotClasses" class="w-1.5 h-1.5 rounded-full mr-1.5"></span>
            {{ statusText }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label class="font-medium text-gray-500">证书 ID</label>
            <p class="text-gray-900 font-mono text-xs">{{ certificate.id }}</p>
          </div>
          <div>
            <label class="font-medium text-gray-500">证书类型</label>
            <p class="text-gray-900">{{ certificate.type?.toUpperCase() || 'UNIVERSAL' }}</p>
          </div>
          <div>
            <label class="font-medium text-gray-500">颁发机构</label>
            <p class="text-gray-900">{{ certificate.issuer }}</p>
          </div>
          <div>
            <label class="font-medium text-gray-500">验证方法</label>
            <p class="text-gray-900">{{ certificate.validationMethod?.toUpperCase() || 'TXT' }}</p>
          </div>
          <div>
            <label class="font-medium text-gray-500">有效期</label>
            <p class="text-gray-900">{{ certificate.validityDays || 90 }} 天</p>
          </div>
          <div>
            <label class="font-medium text-gray-500">过期时间</label>
            <p class="text-gray-900">{{ formatDate(certificate.expiresAt) }}</p>
          </div>
        </div>

        <!-- Covered Domains -->
        <div v-if="certificate.hosts && certificate.hosts.length > 0" class="mt-4">
          <label class="font-medium text-gray-500 text-sm">覆盖域名</label>
          <div class="mt-2 flex flex-wrap gap-2">
            <span v-for="host in certificate.hosts" :key="host"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {{ host }}
            </span>
          </div>
        </div>

        <!-- Auto-renewal Info -->
        <div v-if="isExpiringSoon || isExpired" class="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div class="flex items-center">
            <svg class="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm text-green-800">
              {{ isExpired ? 'Cloudflare 正在自动更新您的SSL证书' : `证书将在 ${daysUntilExpiry} 天后自动续期` }}
            </span>
          </div>
        </div>
      </div>

      <!-- Certificate Info Note -->
      <div class="bg-blue-50 rounded-lg p-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="text-sm text-blue-800">
            <p class="font-medium">自动管理</p>
            <p>Cloudflare 会自动续期和管理您的SSL证书，无需手动操作。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- No Certificate State -->
    <div v-else class="text-center py-8">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">未配置SSL证书</h3>
      <p class="text-gray-500 mb-6">为您的域名申请免费的SSL证书，确保网站安全访问</p>

      <!-- SSL Benefits -->
      <div class="bg-blue-50 rounded-lg p-4 mb-6 text-left">
        <h4 class="text-sm font-medium text-blue-900 mb-2">SSL证书的好处：</h4>
        <ul class="text-sm text-blue-800 space-y-1">
          <li class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            数据传输加密保护
          </li>
          <li class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            提升搜索引擎排名
          </li>
          <li class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            增强用户信任度
          </li>
          <li class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            免费自动续期
          </li>
        </ul>
      </div>

      <Button @click="handleRequestCertificate" :disabled="loading" size="lg">
        <LoadingSpinner v-if="loading && actionType === 'request'" size="sm" class="mr-2" />
        {{ loading && actionType === 'request' ? '申请中...' : '申请SSL证书' }}
      </Button>
    </div>

    <!-- Error Display -->
    <Alert v-if="error" variant="error" title="操作失败" class="mt-4">
      {{ error }}
    </Alert>

    <!-- Success Display -->
    <Alert v-if="successMessage" variant="success" title="操作成功" class="mt-4">
      {{ successMessage }}
    </Alert>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button, LoadingSpinner, Alert, Card } from '@/components/ui'
import { api } from '@/services/api'
import type { SSLCertificate, SSLCertificateStatus } from '@/types'

interface Props {
  domainId: string
  certificate?: SSLCertificate
}

const props = defineProps<Props>()

const emit = defineEmits<{
  certificateUpdated: [certificate: SSLCertificate | null]
}>()

// Reactive state
const loading = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const actionType = ref<'request' | null>(null)

// Computed properties
const statusClasses = computed(() => {
  if (!props.certificate) return ''

  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'

  switch (props.certificate.status) {
    case 'active':
      return `${baseClasses} bg-green-100 text-green-800`
    case 'pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    case 'expired':
      return `${baseClasses} bg-red-100 text-red-800`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
})

const statusDotClasses = computed(() => {
  if (!props.certificate) return ''

  switch (props.certificate.status) {
    case 'active':
      return 'bg-green-400'
    case 'pending':
      return 'bg-yellow-400'
    case 'expired':
      return 'bg-red-400'
    default:
      return 'bg-gray-400'
  }
})

const statusText = computed(() => {
  if (!props.certificate) return ''

  const statusMap: Record<SSLCertificateStatus, string> = {
    active: '有效',
    pending: '申请中',
    expired: '已过期'
  }
  return statusMap[props.certificate.status] || '未知'
})

const daysUntilExpiry = computed(() => {
  if (!props.certificate) return 0

  const expiryDate = new Date(props.certificate.expiresAt)
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
})

const isExpiringSoon = computed(() => {
  return props.certificate?.status === 'active' && daysUntilExpiry.value <= 30 && daysUntilExpiry.value > 0
})

const isExpired = computed(() => {
  return props.certificate?.status === 'expired' || daysUntilExpiry.value <= 0
})

// Format date helper
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

// Clear messages
const clearMessages = () => {
  error.value = null
  successMessage.value = null
}

// Handle certificate request
const handleRequestCertificate = async () => {
  try {
    loading.value = true
    actionType.value = 'request'
    clearMessages()

    const response = await api.domains.requestSSL(props.domainId)

    if (response.success && response.data) {
      successMessage.value = 'SSL证书申请成功！证书将在几分钟内生效。'
      emit('certificateUpdated', response.data)
    } else {
      throw new Error(response.message || 'SSL证书申请失败')
    }
  } catch (err: any) {
    console.error('Failed to request SSL certificate:', err)
    error.value = err.message || 'SSL证书申请失败，请稍后重试'
  } finally {
    loading.value = false
    actionType.value = null
  }
}


</script>