<template>
  <div class="space-y-6">
    <!-- Header with Back Button -->
    <div class="flex items-center space-x-4">
      <Button variant="ghost" @click="handleBack">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        返回
      </Button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-gray-900">{{ domainName }}</h1>
        <p class="text-gray-500">域名详情和DNS管理</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !domainDetail" class="text-center py-12">
      <LoadingSpinner />
      <p class="mt-2 text-gray-500">正在加载域名详情...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <Alert variant="error" title="加载失败">
        {{ error }}
      </Alert>
      <Button @click="fetchDomainDetail" variant="outline" class="mt-4">
        重试
      </Button>
    </div>

    <!-- Domain Detail Content -->
    <div v-else-if="domainDetail" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Domain Info Card -->
        <Card title="域名信息">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">域名状态</label>
              <div class="mt-1">
                <span :class="statusClasses"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                  <span :class="statusDotClasses" class="w-1.5 h-1.5 rounded-full mr-1.5"></span>
                  {{ statusText }}
                </span>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">创建时间</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatDate(domainDetail.createdAt) }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">最后修改</label>
              <p class="mt-1 text-sm text-gray-900">{{ formatDate(domainDetail.modifiedAt) }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">DNS记录数量</label>
              <p class="mt-1 text-sm text-gray-900">{{ recordsCount }} 条记录</p>
            </div>
          </div>
        </Card>

        <!-- Nameservers Card -->
        <Card title="Nameservers">
          <div class="space-y-2">
            <div v-for="(ns, index) in domainDetail.nameservers" :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="font-mono text-sm">{{ ns }}</span>
              <Button variant="ghost" size="sm" @click="copyToClipboard(ns)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Button>
            </div>
          </div>
        </Card>

        <!-- DNS Records Card -->
        <Card>
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h3 class="text-lg font-semibold text-gray-900">DNS 记录</h3>
              <div class="flex items-center space-x-2">
                <Button @click="fetchDNSRecords" variant="ghost" size="sm" :disabled="dnsLoading">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  刷新
                </Button>
                <Button @click="handleAddDNSRecord" size="sm">
                  添加记录
                </Button>
              </div>
            </div>
          </template>

          <!-- DNS Records Loading -->
          <div v-if="dnsLoading" class="text-center py-8">
            <LoadingSpinner size="sm" />
            <p class="mt-2 text-sm text-gray-500">正在加载DNS记录...</p>
          </div>

          <!-- DNS Records Error -->
          <div v-else-if="dnsError" class="text-center py-8">
            <Alert variant="error" title="DNS记录加载失败">
              {{ dnsError }}
            </Alert>
          </div>

          <!-- DNS Records List -->
          <div v-if="hasRecords" class="space-y-3">
            <TransitionGroup name="dns-record" tag="div" class="space-y-3">
              <DNSRecordItem v-for="record in memoizedRecords" :key="`record-${record.id}`" :record="record"
                :editing="false" @edit="handleEditDNSRecord" @delete="handleDeleteDNSRecord" />
            </TransitionGroup>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-12">
            <div class="text-gray-400 mb-6">
              <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">暂无DNS记录</h3>
            <p class="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              DNS记录用于将您的域名指向服务器或其他资源。添加第一条记录开始配置您的域名。
            </p>
            <Button @click="handleAddDNSRecord" size="sm" class="inline-flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              添加第一条记录
            </Button>
          </div>
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- SSL Certificate Management -->
        <SSLCertificateManager :domain-id="props.domainId" :certificate="domainDetail.sslCertificate"
          @certificate-updated="handleSSLCertificateUpdated" />

      </div>
    </div>

    <!-- DNS Record Modal -->
    <DNSRecordModal :is-open="showDNSRecordModal" :loading="dnsRecordModalLoading"
      :error="dnsRecordModalError || undefined" :record="editingRecord" @save="handleSaveDNSRecord"
      @cancel="handleCancelDNSRecordModal" />

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog :is-open="showDeleteConfirmation" :title="'删除DNS记录'"
      :message="`确定要删除 ${recordToDelete?.type} 记录 '${recordToDelete?.name}' 吗？此操作无法撤销。`" :confirm-text="'删除'"
      :cancel-text="'取消'" :variant="'danger'" :loading="deleteLoading" :error="deleteRecordError || undefined"
      @confirm="confirmDeleteRecord" @cancel="cancelDeleteRecord" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, shallowRef, markRaw } from 'vue'
import { Button, LoadingSpinner, Alert, Card, ConfirmationDialog } from '@/components/ui'
import DNSRecordItem from '@/components/DNSRecordItem.vue'
import DNSRecordModal from '@/components/DNSRecordModal.vue'
import SSLCertificateManager from '@/components/SSLCertificateManager.vue'
import { api } from '@/services/api'
import { useNotifications } from '@/utils/notifications'
import { ErrorHandler } from '@/utils/loading'
import type { DomainDetail, DNSRecord, DomainStatus, SSLCertificate, CreateDNSRecordRequest } from '@/types'

interface Props {
  domainId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
}>()

// Reactive state
const domainDetail = ref<DomainDetail | null>(null)
const dnsRecords = shallowRef<DNSRecord[]>([]) // Use shallowRef for better performance with arrays
const loading = ref(false)
const dnsLoading = ref(false)
const error = ref<string | null>(null)
const dnsError = ref<string | null>(null)


// DNS record modal state
const showDNSRecordModal = ref(false)
const dnsRecordModalLoading = ref(false)
const dnsRecordModalError = ref<string | null>(null)
const editingRecord = ref<DNSRecord | null>(null)



// DNS record deletion state
const deletingRecordId = ref<string | null>(null)
const deleteLoading = ref(false)
const showDeleteConfirmation = ref(false)
const recordToDelete = ref<DNSRecord | null>(null)
const deleteRecordError = ref<string | null>(null)

// Notifications
const { success, error: showError } = useNotifications()

// Computed properties
const domainName = computed(() => domainDetail.value?.name || '')

// Performance optimized computed properties
const hasRecords = computed(() => dnsRecords.value.length > 0)
const recordsCount = computed(() => dnsRecords.value.length)

// Memoized records list for better performance
const memoizedRecords = computed(() => {
  // Return a shallow copy to prevent unnecessary re-renders
  return markRaw([...dnsRecords.value])
})

const statusClasses = computed(() => {
  if (!domainDetail.value) return ''

  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'

  switch (domainDetail.value.status) {
    case 'active':
      return `${baseClasses} bg-green-100 text-green-800`
    case 'pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    case 'moved':
      return `${baseClasses} bg-blue-100 text-blue-800`
    case 'deleted':
      return `${baseClasses} bg-red-100 text-red-800`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
})

const statusDotClasses = computed(() => {
  if (!domainDetail.value) return ''

  switch (domainDetail.value.status) {
    case 'active':
      return 'bg-green-400'
    case 'pending':
      return 'bg-yellow-400'
    case 'moved':
      return 'bg-blue-400'
    case 'deleted':
      return 'bg-red-400'
    default:
      return 'bg-gray-400'
  }
})

const statusText = computed(() => {
  if (!domainDetail.value) return ''

  const statusMap: Record<DomainStatus, string> = {
    active: '活跃',
    pending: '待处理',
    moved: '已迁移',
    deleted: '已删除'
  }
  return statusMap[domainDetail.value.status] || '未知'
})



// Fetch domain detail
const fetchDomainDetail = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await api.domains.getDetail(props.domainId)

    if (response.success && response.data) {
      domainDetail.value = response.data
      // Use markRaw for better performance with shallowRef
      dnsRecords.value = markRaw(response.data.dnsRecords || [])
    } else {
      throw new Error(response.message || '获取域名详情失败')
    }
  } catch (err: any) {
    console.error('Failed to fetch domain detail:', err)
    error.value = err.message || '获取域名详情失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// Fetch DNS records
const fetchDNSRecords = async () => {
  try {
    dnsLoading.value = true
    dnsError.value = null

    const response = await api.domains.getDnsRecords(props.domainId)

    if (response.success && response.data) {
      // Use markRaw for better performance with shallowRef
      dnsRecords.value = markRaw(response.data)
    } else {
      throw new Error(response.message || '获取DNS记录失败')
    }
  } catch (err: any) {
    console.error('Failed to fetch DNS records:', err)
    dnsError.value = err.message || '获取DNS记录失败，请稍后重试'
  } finally {
    dnsLoading.value = false
  }
}

// DNS Record handlers
const handleAddDNSRecord = () => {
  // Show modal for adding new DNS record
  editingRecord.value = null
  dnsRecordModalError.value = null
  showDNSRecordModal.value = true
}

const handleEditDNSRecord = (recordId: string) => {
  // Find the record to edit
  const record = dnsRecords.value.find(r => r.id === recordId)
  if (record) {
    editingRecord.value = record
    dnsRecordModalError.value = null
    showDNSRecordModal.value = true
  }
}

const handleSaveDNSRecord = async (data: CreateDNSRecordRequest) => {
  try {
    dnsRecordModalLoading.value = true
    dnsRecordModalError.value = null

    if (editingRecord.value) {
      // Update existing record
      const response = await api.domains.updateDnsRecord(props.domainId, editingRecord.value.id, data)

      if (response.success && response.data) {
        // Update the record in the list
        const index = dnsRecords.value.findIndex(r => r.id === editingRecord.value!.id)
        if (index !== -1) {
          const newRecords = [...dnsRecords.value]
          newRecords[index] = response.data
          dnsRecords.value = markRaw(newRecords)
          // Update domain detail if it exists
          if (domainDetail.value) {
            domainDetail.value.dnsRecords = newRecords
          }
        }

        // Show success notification
        success('DNS记录更新成功', {
          message: `${data.type} 记录 '${data.name}' 已成功更新`,
          autoHide: true,
          autoHideDelay: 4000
        })

        // Close modal
        showDNSRecordModal.value = false
        editingRecord.value = null
      } else {
        throw new Error(response.message || '更新DNS记录失败')
      }
    } else {
      // Create new record
      const response = await api.domains.createDnsRecord(props.domainId, data)

      if (response.success && response.data) {
        // Add the new record to the list
        const newRecords = [...dnsRecords.value, response.data]
        dnsRecords.value = markRaw(newRecords)
        // Update domain detail if it exists
        if (domainDetail.value) {
          domainDetail.value.dnsRecords = newRecords
        }

        // Show success notification
        success('DNS记录创建成功', {
          message: `${data.type} 记录 '${data.name}' 已成功创建`,
          autoHide: true,
          autoHideDelay: 4000
        })

        // Close modal
        showDNSRecordModal.value = false
      } else {
        throw new Error(response.message || '创建DNS记录失败')
      }
    }
  } catch (err: any) {
    console.error('Failed to save DNS record:', err)

    // Handle different error scenarios
    let errorMessage = editingRecord.value ? '更新DNS记录失败' : '创建DNS记录失败'

    if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
      errorMessage = '该DNS记录已存在，请检查记录名称和类型'
    } else if (err.message?.includes('invalid') || err.message?.includes('validation')) {
      errorMessage = '输入的DNS记录信息无效，请检查格式'
    } else if (err.message?.includes('rate limit') || err.message?.includes('too many')) {
      errorMessage = '操作过于频繁，请稍后重试'
    } else if (err.message?.includes('network') || err.message?.includes('timeout')) {
      errorMessage = '网络连接超时，请检查网络后重试'
    } else if (err.message) {
      errorMessage = err.message
    }

    dnsRecordModalError.value = errorMessage

    // Show error notification
    const userError = ErrorHandler.handle(err)
    showError(userError, {
      title: editingRecord.value ? '更新DNS记录失败' : '创建DNS记录失败',
      message: errorMessage
    })
  } finally {
    dnsRecordModalLoading.value = false
  }
}

const handleCancelDNSRecordModal = () => {
  showDNSRecordModal.value = false
  editingRecord.value = null
  dnsRecordModalError.value = null
  dnsRecordModalLoading.value = false
}

const handleDeleteDNSRecord = (recordId: string) => {
  // Find the record to delete
  const record = dnsRecords.value.find(r => r.id === recordId)
  if (record) {
    recordToDelete.value = record
    deletingRecordId.value = recordId
    showDeleteConfirmation.value = true
  }
}



// DNS record deletion handlers
const confirmDeleteRecord = async () => {
  if (!recordToDelete.value || !deletingRecordId.value) return

  try {
    deleteLoading.value = true
    deleteRecordError.value = null

    // Store record info for success message
    const recordInfo = {
      type: recordToDelete.value.type,
      name: recordToDelete.value.name
    }

    // Optimistic update - remove record from list immediately
    const recordIndex = dnsRecords.value.findIndex(r => r.id === deletingRecordId.value)
    const removedRecord = dnsRecords.value[recordIndex]

    if (recordIndex !== -1) {
      const newRecords = dnsRecords.value.filter(r => r.id !== deletingRecordId.value)
      dnsRecords.value = markRaw(newRecords)
      // Update domain detail if it exists
      if (domainDetail.value) {
        domainDetail.value.dnsRecords = newRecords
      }
    }

    const response = await api.domains.deleteDnsRecord(props.domainId, deletingRecordId.value)

    if (!response.success) {
      // If deletion failed, add the record back to the list
      if (recordIndex !== -1 && removedRecord) {
        const restoredRecords = [...dnsRecords.value]
        restoredRecords.splice(recordIndex, 0, removedRecord)
        dnsRecords.value = markRaw(restoredRecords)
        if (domainDetail.value) {
          domainDetail.value.dnsRecords = restoredRecords
        }
      }

      const errorMessage = response.message || '删除DNS记录失败'
      deleteRecordError.value = errorMessage
      throw new Error(errorMessage)
    }

    // Show success notification
    success('DNS记录删除成功', {
      message: `${recordInfo.type} 记录 '${recordInfo.name}' 已成功删除`,
      autoHide: true,
      autoHideDelay: 4000
    })

    // Hide confirmation dialog
    showDeleteConfirmation.value = false
    recordToDelete.value = null
    deletingRecordId.value = null
  } catch (err: any) {
    console.error('Failed to delete DNS record:', err)

    // Handle different error scenarios
    let errorMessage = '删除DNS记录失败'

    if (err.message?.includes('not found')) {
      errorMessage = '要删除的DNS记录不存在或已被删除'
    } else if (err.message?.includes('permission') || err.message?.includes('unauthorized')) {
      errorMessage = '没有权限删除此DNS记录'
    } else if (err.message?.includes('rate limit') || err.message?.includes('too many')) {
      errorMessage = '操作过于频繁，请稍后重试'
    } else if (err.message?.includes('network') || err.message?.includes('timeout')) {
      errorMessage = '网络连接超时，请检查网络后重试'
    } else if (err.message) {
      errorMessage = err.message
    }

    deleteRecordError.value = errorMessage

    // Show error notification
    const userError = ErrorHandler.handle(err)
    showError(userError, {
      title: '删除DNS记录失败',
      message: errorMessage
    })
  } finally {
    deleteLoading.value = false
  }
}

const cancelDeleteRecord = () => {
  // Hide confirmation dialog and reset state
  showDeleteConfirmation.value = false
  recordToDelete.value = null
  deletingRecordId.value = null
  deleteLoading.value = false
  deleteRecordError.value = null
}

// SSL certificate update handler
const handleSSLCertificateUpdated = (certificate: SSLCertificate | null) => {
  if (domainDetail.value) {
    domainDetail.value.sslCertificate = certificate || undefined
  }
}

// Utility handlers
const handleBack = () => {
  emit('back')
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    success('复制成功', {
      message: '已复制到剪贴板',
      autoHide: true,
      autoHideDelay: 2000
    })
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    showError('复制失败，请手动复制')
  }
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

// Load data on component mount
onMounted(() => {
  fetchDomainDetail()
})
</script>

<style scoped>
/* DNS Record Transitions */
.dns-record-enter-active,
.dns-record-leave-active {
  transition: all 0.3s ease;
}

.dns-record-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dns-record-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.dns-record-move {
  transition: transform 0.3s ease;
}

/* Reduce motion for users who prefer it */
@media (prefers-reduced-motion: reduce) {

  .dns-record-enter-active,
  .dns-record-leave-active {
    transition: none;
  }
}
</style>