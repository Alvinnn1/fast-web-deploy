<template>
  <Card title="SSL 证书管理">
    <!-- Loading State -->
    <div v-if="loading && actionType === 'fetch'" class="text-center py-8">
      <LoadingSpinner size="lg" class="mx-auto mb-4" />
      <p class="text-gray-500">正在获取SSL证书...</p>
    </div>

    <!-- Certificates List -->
    <div v-else-if="hasCertificates" class="space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-lg font-medium text-gray-900">SSL证书列表</h4>
        <Button @click="fetchSSLCertificates" :disabled="loading" variant="outline" size="sm">
          <LoadingSpinner v-if="loading && actionType === 'fetch'" size="sm" class="mr-2" />
          {{ loading && actionType === 'fetch' ? '刷新中...' : '刷新' }}
        </Button>
      </div>

      <!-- Certificate Cards -->
      <div v-for="certificate in certificates" :key="certificate.id" class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h5 class="text-sm font-medium text-gray-900">证书信息</h5>
          <span :class="getStatusClasses(certificate)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
            <span :class="getStatusDotClasses(certificate)" class="w-1.5 h-1.5 rounded-full mr-1.5"></span>
            {{ getStatusText(certificate) }}
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
        <div v-if="isExpiringSoon(certificate) || isExpired(certificate)" class="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div class="flex items-center">
            <svg class="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm text-green-800">
              {{ isExpired(certificate) ? 'Cloudflare 正在自动更新您的SSL证书' : `证书将在 ${getDaysUntilExpiry(certificate)} 天后自动续期` }}
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
import { ref, computed, onMounted } from 'vue'
import { Button, LoadingSpinner, Alert, Card } from '@/components/ui'
import { api } from '@/services/api'
import type { SSLCertificate, SSLCertificateStatus } from '@/types'

interface Props {
  domainId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  certificatesUpdated: [certificates: SSLCertificate[]]
}>()

// Reactive state
const certificates = ref<SSLCertificate[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const actionType = ref<'request' | 'fetch' | null>(null)

// Computed properties
const hasCertificates = computed(() => certificates.value.length > 0)

// Helper functions for certificate display
const getStatusClasses = (certificate: SSLCertificate) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'

  switch (certificate.status) {
    case 'active':
      return `${baseClasses} bg-green-100 text-green-800`
    case 'pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    case 'expired':
      return `${baseClasses} bg-red-100 text-red-800`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
}

const getStatusDotClasses = (certificate: SSLCertificate) => {
  switch (certificate.status) {
    case 'active':
      return 'bg-green-400'
    case 'pending':
      return 'bg-yellow-400'
    case 'expired':
      return 'bg-red-400'
    default:
      return 'bg-gray-400'
  }
}

const getStatusText = (certificate: SSLCertificate) => {
  const statusMap: Record<SSLCertificateStatus, string> = {
    active: '有效',
    pending: '申请中',
    expired: '已过期'
  }
  return statusMap[certificate.status] || '未知'
}

const getDaysUntilExpiry = (certificate: SSLCertificate) => {
  const expiryDate = new Date(certificate.expiresAt)
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

const isExpiringSoon = (certificate: SSLCertificate) => {
  const daysUntilExpiry = getDaysUntilExpiry(certificate)
  return certificate.status === 'active' && daysUntilExpiry <= 30 && daysUntilExpiry > 0
}

const isExpired = (certificate: SSLCertificate) => {
  const daysUntilExpiry = getDaysUntilExpiry(certificate)
  return certificate.status === 'expired' || daysUntilExpiry <= 0
}

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

// Fetch SSL certificates
const fetchSSLCertificates = async () => {
  try {
    loading.value = true
    actionType.value = 'fetch'
    clearMessages()

    console.log('Fetching SSL certificates for domain:', props.domainId)
    const response = await api.domains.getSSLCertificates(props.domainId)
    console.log('SSL certificates response:', response)

    if (response.success && response.data) {
      console.log('Setting certificates:', response.data)
      certificates.value = response.data
      emit('certificatesUpdated', response.data)
    } else {
      console.log('No certificates found or response failed:', response)
      certificates.value = []
      emit('certificatesUpdated', [])
    }
  } catch (err: any) {
    console.error('Failed to fetch SSL certificates:', err)
    certificates.value = []
    emit('certificatesUpdated', [])
    // Don't show error for empty certificate list
    if (!err.message?.includes('No SSL certificates found')) {
      error.value = err.message || 'SSL证书获取失败，请稍后重试'
    }
  } finally {
    loading.value = false
    actionType.value = null
  }
}

// Initialize component
onMounted(() => {
  fetchSSLCertificates()
})


</script>