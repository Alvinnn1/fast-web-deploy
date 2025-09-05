<template>
  <Modal :open="isOpen" @close="handleClose" title="域名管理" size="lg">
    <div class="space-y-6">
      <!-- 当前域名列表 -->
      <div>
        <h3 class="text-lg font-medium text-gray-900 mb-4">当前域名</h3>
        <div v-if="loading" class="flex justify-center py-8">
          <LoadingSpinner />
        </div>
        <div v-else-if="domains.length === 0" class="text-center py-8 text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
          <p class="mt-2">暂无自定义域名</p>
        </div>
        <div v-else class="space-y-3">
          <div v-for="domain in domains" :key="domain.id" class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <span class="text-lg font-medium text-gray-900">{{ domain.name }}</span>
                <span :class="getStatusClasses(domain.status)" class="text-xs px-2 py-1 rounded-full">
                  {{ getStatusText(domain.status) }}
                </span>
              </div>
              <div class="mt-1 text-sm text-gray-500">
                <p>创建时间: {{ formatDate(domain.created_on) }}</p>
                <p v-if="domain.certificate_authority">证书颁发机构: {{ domain.certificate_authority }}</p>
              </div>
              <div v-if="domain.validation_errors && domain.validation_errors.length > 0" class="mt-2">
                <p class="text-sm text-red-600 font-medium">验证错误:</p>
                <ul class="text-sm text-red-600 list-disc list-inside">
                  <li v-for="error in domain.validation_errors" :key="error">{{ error }}</li>
                </ul>
              </div>
            </div>
            <Button
              @click="handleDeleteDomain(domain)"
              variant="outline"
              size="sm"
              class="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </Button>
          </div>
        </div>
      </div>

      <!-- 添加新域名 -->
      <div class="border-t pt-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">添加新域名</h3>
        <form @submit.prevent="handleAddDomain" class="space-y-4">
          <div>
            <label for="domainName" class="block text-sm font-medium text-gray-700 mb-2">
              域名名称
            </label>
            <Input
              id="domainName"
              v-model="newDomainName"
              type="text"
              placeholder="例如: example.com"
              :disabled="addingDomain"
              required
            />
            <p class="mt-1 text-sm text-gray-500">
              请输入完整的域名，如 example.com
            </p>
          </div>
          <div class="flex justify-end">
            <Button
              type="submit"
              :disabled="!newDomainName.trim() || addingDomain"
              :loading="addingDomain"
            >
              <svg v-if="!addingDomain" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {{ addingDomain ? '添加中...' : '添加域名' }}
            </Button>
          </div>
        </form>
      </div>

      <!-- 操作说明 -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex">
          <svg class="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 class="text-sm font-medium text-blue-800">域名配置说明</h4>
            <div class="mt-2 text-sm text-blue-700">
              <p>• 添加域名后，您需要将域名的DNS记录指向Cloudflare的服务器</p>
              <p>• 域名验证可能需要几分钟到几小时不等</p>
              <p>• 验证成功后，您的网站就可以通过自定义域名访问了</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认删除对话框 -->
    <ConfirmationDialog
      :isOpen="showDeleteConfirm"
      title="确认删除域名"
      :message="deleteConfirmMessage"
      confirmText="删除"
      cancelText="取消"
      variant="danger"
      @confirm="confirmDeleteDomain"
      @cancel="showDeleteConfirm = false"
    />
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Modal, Button, Input, LoadingSpinner, ConfirmationDialog } from '@/components/ui'
import { api } from '@/services/api'
import { useNotifications } from '@/utils/notifications'

// Props
interface Props {
  isOpen: boolean
  projectName: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  refresh: []
}>()

// State
const domains = ref<any[]>([])
const loading = ref(false)
const addingDomain = ref(false)
const newDomainName = ref('')
const showDeleteConfirm = ref(false)
const domainToDelete = ref<any>(null)

// Notifications
const { success, error } = useNotifications()

// Computed
const canAddDomain = computed(() => {
  return newDomainName.value.trim().length > 0 && !addingDomain.value
})

const deleteConfirmMessage = computed(() => {
  if (!domainToDelete.value) return '确定要删除域名吗？此操作无法撤销。'
  return `确定要删除域名 "${domainToDelete.value.name}" 吗？此操作无法撤销。`
})

// Methods
const loadDomains = async () => {
  if (!props.projectName) return
  
  loading.value = true
  try {
    const response = await api.pages.getDomains(props.projectName)
    if (response.success && response.data) {
      domains.value = response.data
    } else {
      domains.value = []
    }
  } catch (err: any) {
    error('加载域名列表失败: ' + (err.message || '未知错误'))
    domains.value = []
  } finally {
    loading.value = false
  }
}

const handleAddDomain = async () => {
  const domainName = newDomainName.value.trim()
  if (!domainName || !props.projectName) return

  addingDomain.value = true
  try {
    const response = await api.pages.addDomain(props.projectName, domainName)
    if (response.success) {
      success('域名添加成功')
      newDomainName.value = ''
      await loadDomains()
      emit('refresh')
    } else {
      error('域名添加失败: ' + (response.message || '未知错误'))
    }
  } catch (err: any) {
    error('域名添加失败: ' + (err.message || '未知错误'))
  } finally {
    addingDomain.value = false
  }
}

const handleDeleteDomain = (domain: any) => {
  domainToDelete.value = domain
  showDeleteConfirm.value = true
}

const confirmDeleteDomain = async () => {
  if (!domainToDelete.value || !props.projectName) return

  try {
    const response = await api.pages.deleteDomain(props.projectName, domainToDelete.value.name)
    if (response.success) {
      success('域名删除成功')
      await loadDomains()
      emit('refresh')
    } else {
      error('域名删除失败: ' + (response.message || '未知错误'))
    }
  } catch (err: any) {
    error('域名删除失败: ' + (err.message || '未知错误'))
  } finally {
    showDeleteConfirm.value = false
    domainToDelete.value = null
  }
}

const handleClose = () => {
  emit('close')
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return '已激活'
    case 'pending':
      return '验证中'
    case 'error':
      return '验证失败'
    default:
      return '未知状态'
  }
}

const getStatusClasses = (status: string) => {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
  
  switch (status) {
    case 'active':
      return `${baseClasses} bg-green-100 text-green-800`
    case 'pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    case 'error':
      return `${baseClasses} bg-red-100 text-red-800`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
}

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

// Lifecycle
onMounted(() => {
  if (props.isOpen) {
    loadDomains()
  }
})

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    loadDomains()
  }
})

watch(() => props.projectName, () => {
  if (props.isOpen) {
    loadDomains()
  }
})
</script>
