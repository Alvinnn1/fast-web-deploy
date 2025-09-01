<template>
  <div class="border border-purple-200 rounded-lg p-4 bg-purple-50/30 shadow-sm">
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-purple-700 flex items-center">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          添加新的 DNS 记录
        </h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Type Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">记录类型</label>
          <select ref="firstInputRef" v-model="form.type"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :disabled="isFormDisabled" @keydown.enter="handleSave" @keydown.escape="handleCancel">
            <option value="A">A</option>
            <option value="AAAA">AAAA</option>
            <option value="CNAME">CNAME</option>
            <option value="MX">MX</option>
            <option value="TXT">TXT</option>
            <option value="NS">NS</option>
          </select>
          <div v-if="validationErrors.type" class="mt-1 text-sm text-red-600">
            {{ validationErrors.type }}
          </div>
        </div>

        <!-- TTL Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">TTL (秒)</label>
          <select v-model="form.ttl"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            :disabled="isFormDisabled" @keydown.enter="handleSave" @keydown.escape="handleCancel">
            <option :value="1">自动</option>
            <option :value="120">2 分钟</option>
            <option :value="300">5 分钟</option>
            <option :value="600">10 分钟</option>
            <option :value="1800">30 分钟</option>
            <option :value="3600">1 小时</option>
            <option :value="7200">2 小时</option>
            <option :value="18000">5 小时</option>
            <option :value="43200">12 小时</option>
            <option :value="86400">1 天</option>
          </select>
          <div v-if="validationErrors.ttl" class="mt-1 text-sm text-red-600">
            {{ validationErrors.ttl }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Name Input -->
        <Input v-model="form.name" label="记录名称" placeholder="例如: www 或 @ (根域名)" :error="validationErrors.name"
          :disabled="isFormDisabled" @keydown.enter="handleSave" @keydown.escape="handleCancel" />

        <!-- Content Input -->
        <Input v-model="form.content" label="记录内容" :placeholder="getContentPlaceholder(form.type)"
          :error="validationErrors.content" :disabled="isFormDisabled" @keydown.enter="handleSave"
          @keydown.escape="handleCancel" />
      </div>

      <!-- Proxy Toggle (for A/AAAA records) -->
      <div v-if="['A', 'AAAA'].includes(form.type)" class="flex items-center space-x-2">
        <input id="proxied-new" v-model="form.proxied" type="checkbox"
          class="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          :disabled="isFormDisabled" @keydown.enter="handleSave" @keydown.escape="handleCancel" />
        <label for="proxied-new" :class="['text-sm', isFormDisabled ? 'text-gray-400' : 'text-gray-700']">
          通过 Cloudflare 代理 (橙色云朵)
        </label>
      </div>

      <!-- Error Display -->
      <Alert v-if="error" variant="error" title="创建失败" class="mb-4">
        {{ error }}
      </Alert>

      <!-- Validation Summary -->
      <Alert v-if="Object.keys(validationErrors).length > 0 && !error" variant="warning" title="请修正以下错误" class="mb-4">
        <ul class="list-disc list-inside space-y-1">
          <li v-for="(errorMsg, field) in validationErrors" :key="field" class="text-sm">
            <strong>{{ getFieldLabel(field) }}:</strong> {{ errorMsg }}
          </li>
        </ul>
      </Alert>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end space-x-2 pt-2">
        <Button variant="outline" @click="handleCancel" :disabled="isFormDisabled">
          取消
        </Button>
        <Button @click="handleSave" :disabled="isFormDisabled || !isFormValid">
          <LoadingSpinner v-if="isFormDisabled" size="sm" class="mr-2" />
          {{ isFormDisabled ? '创建中...' : '创建记录' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Button, Input, Alert, LoadingSpinner } from '@/components/ui'
import { useNotifications } from '@/utils/notifications'
import type { DNSRecordType, CreateDNSRecordRequest } from '@/types'

interface Props {
  domainId: string
  loading?: boolean
  continuousMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  continuousMode: false
})

const emit = defineEmits<{
  save: [data: CreateDNSRecordRequest]
  cancel: []
  stopContinuous: []
}>()

// Template refs
const firstInputRef = ref<HTMLSelectElement>()

// Form state
const form = ref<CreateDNSRecordRequest>({
  type: 'A',
  name: '',
  content: '',
  ttl: 1,
  proxied: false
})

const loading = ref(false)
const error = ref<string | null>(null)
const validationErrors = ref<Record<string, string>>({})
const isSubmitting = ref(false)

// Notifications
const { warning } = useNotifications()

// Computed properties
const isFormValid = computed(() => {
  return form.value.name.trim() !== '' &&
    form.value.content.trim() !== '' &&
    Object.keys(validationErrors.value).length === 0
})

const isFormDisabled = computed(() => {
  return props.loading || loading.value || isSubmitting.value
})

// Content placeholder based on record type
const getContentPlaceholder = (type: DNSRecordType): string => {
  const placeholders: Record<DNSRecordType, string> = {
    A: '192.0.2.1',
    AAAA: '2001:db8::1',
    CNAME: 'example.com',
    MX: '10 mail.example.com',
    TXT: '"v=spf1 include:_spf.google.com ~all"',
    NS: 'ns1.example.com'
  }
  return placeholders[type] || ''
}

// Field label mapping for error display
const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    type: '记录类型',
    name: '记录名称',
    content: '记录内容',
    ttl: 'TTL',
    proxied: '代理设置'
  }
  return labels[field] || field
}

// Enhanced validation with more detailed error messages
const validateForm = () => {
  const errors: Record<string, string> = {}

  // Validate name
  const name = form.value.name.trim()
  if (!name) {
    errors.name = '记录名称不能为空'
  } else if (name.length > 253) {
    errors.name = '记录名称过长（最多253个字符）'
  } else if (!/^[a-zA-Z0-9._*-]*$/.test(name)) {
    errors.name = '记录名称只能包含字母、数字、点、下划线、星号和连字符'
  }

  // Validate content based on type
  const content = form.value.content.trim()
  if (!content) {
    errors.content = '记录内容不能为空'
  } else {
    switch (form.value.type) {
      case 'A':
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(content)) {
          errors.content = '请输入有效的IPv4地址（如：192.0.2.1）'
        } else {
          // Validate IP address ranges
          const parts = content.split('.')
          if (parts.some(part => parseInt(part) > 255)) {
            errors.content = 'IPv4地址的每个部分必须在0-255之间'
          }
        }
        break
      case 'AAAA':
        if (!/^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/.test(content)) {
          errors.content = '请输入有效的IPv6地址（如：2001:db8::1）'
        }
        break
      case 'CNAME':
        if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(content)) {
          errors.content = '请输入有效的域名（如：example.com）'
        } else if (content.length > 253) {
          errors.content = 'CNAME记录内容过长（最多253个字符）'
        }
        break
      case 'MX':
        if (!/^\d+\s+[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(content)) {
          errors.content = '请输入有效的MX记录格式（如：10 mail.example.com）'
        } else {
          const [priority] = content.split(' ')
          if (parseInt(priority) > 65535) {
            errors.content = 'MX记录优先级必须在0-65535之间'
          }
        }
        break
      case 'TXT':
        if (content.length > 255) {
          errors.content = 'TXT记录内容过长（最多255个字符）'
        }
        break
      case 'NS':
        if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(content)) {
          errors.content = '请输入有效的域名服务器（如：ns1.example.com）'
        }
        break
    }
  }

  // Validate TTL
  if (form.value.ttl < 1) {
    errors.ttl = 'TTL值必须大于0'
  }

  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

// Event handlers
const handleSave = async () => {
  // Clear previous errors
  error.value = null

  // Validate form
  const isValid = validateForm()

  if (!isValid) {
    // Show validation warning
    const errorCount = Object.keys(validationErrors.value).length
    warning('表单验证失败', {
      message: `请修正 ${errorCount} 个输入错误后重试`,
      autoHide: true,
      autoHideDelay: 3000
    })
    return
  }

  try {
    isSubmitting.value = true
    error.value = null

    emit('save', { ...form.value })

    // In continuous mode, reset form after successful save
    if (props.continuousMode) {
      await nextTick()
      resetForm()
      // Focus back to first input for next record
      if (firstInputRef.value) {
        firstInputRef.value.focus()
      }
    }
  } catch (err: any) {
    error.value = err.message || '创建DNS记录失败'
  } finally {
    isSubmitting.value = false
  }
}

const handleCancel = () => {
  // Reset form to initial state
  form.value = {
    type: 'A',
    name: '',
    content: '',
    ttl: 1,
    proxied: false
  }
  validationErrors.value = {}
  error.value = null
  isSubmitting.value = false
  emit('cancel')
}

// Reset form when component is shown
const resetForm = () => {
  form.value = {
    type: 'A',
    name: '',
    content: '',
    ttl: 1,
    proxied: false
  }
  validationErrors.value = {}
  error.value = null
  isSubmitting.value = false
}

// Auto-focus on first input when component mounts
onMounted(async () => {
  await nextTick()
  if (firstInputRef.value) {
    firstInputRef.value.focus()
  }
})

// Debounced validation for better performance
let validationTimeout: NodeJS.Timeout | null = null

const debouncedValidation = () => {
  if (validationTimeout) {
    clearTimeout(validationTimeout)
  }
  validationTimeout = setTimeout(() => {
    validateForm()
  }, 300) // 300ms debounce
}

// Watch form changes for validation
watch(form, () => {
  debouncedValidation()
}, { deep: true })

// Watch loading prop from parent
watch(() => props.loading, (newLoading) => {
  loading.value = newLoading
})

// Expose resetForm method for parent component
defineExpose({
  resetForm
})
</script>