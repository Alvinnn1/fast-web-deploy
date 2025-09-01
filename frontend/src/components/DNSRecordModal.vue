<template>
  <Modal :open="isOpen" :title="modalTitle" size="md" :close-on-backdrop="!loading" @close="handleCancel">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- DNS Record Type -->
      <div>
        <label for="record-type" class="block text-sm font-medium text-gray-700 mb-1">
          记录类型 <span class="text-red-500">*</span>
        </label>
        <select id="record-type" v-model="formData.type" :disabled="loading"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
          required>
          <option value="">选择记录类型</option>
          <option value="A">A - IPv4 地址</option>
          <option value="AAAA">AAAA - IPv6 地址</option>
          <option value="CNAME">CNAME - 别名</option>
          <option value="MX">MX - 邮件交换</option>
          <option value="TXT">TXT - 文本记录</option>
          <option value="NS">NS - 名称服务器</option>
        </select>
      </div>

      <!-- DNS Record Name -->
      <div>
        <label for="record-name" class="block text-sm font-medium text-gray-700 mb-1">
          记录名称 <span class="text-red-500">*</span>
        </label>
        <input id="record-name" v-model="formData.name" type="text" :disabled="loading"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="例如: www, mail, @" required />
        <p class="mt-1 text-xs text-gray-500">
          使用 @ 表示根域名，或输入子域名前缀
        </p>
      </div>

      <!-- DNS Record Content -->
      <div>
        <label for="record-content" class="block text-sm font-medium text-gray-700 mb-1">
          记录值 <span class="text-red-500">*</span>
        </label>
        <input id="record-content" v-model="formData.content" type="text" :disabled="loading"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500"
          :placeholder="contentPlaceholder" required />
        <p class="mt-1 text-xs text-gray-500">
          {{ contentHint }}
        </p>
      </div>

      <!-- TTL -->
      <div>
        <label for="record-ttl" class="block text-sm font-medium text-gray-700 mb-1">
          TTL (生存时间)
        </label>
        <select id="record-ttl" v-model="formData.ttl" :disabled="loading"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:text-gray-500">
          <option :value="1">自动</option>
          <option :value="300">5分钟 (300秒)</option>
          <option :value="600">10分钟 (600秒)</option>
          <option :value="1800">30分钟 (1800秒)</option>
          <option :value="3600">1小时 (3600秒)</option>
          <option :value="7200">2小时 (7200秒)</option>
          <option :value="18000">5小时 (18000秒)</option>
          <option :value="43200">12小时 (43200秒)</option>
          <option :value="86400">1天 (86400秒)</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          TTL 决定了DNS记录的缓存时间
        </p>
      </div>

      <!-- Proxied (for A, AAAA, and CNAME records) -->
      <div v-if="showProxiedOption" class="flex items-center space-x-2">
        <input id="record-proxied" v-model="formData.proxied" type="checkbox" :disabled="loading"
          class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50" />
        <label for="record-proxied" class="text-sm text-gray-700">
          通过 Cloudflare 代理
        </label>
        <div class="group relative">
          <svg class="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div
            class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            启用后流量将通过Cloudflare代理，提供DDoS保护和性能优化
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <Alert v-if="error" variant="error" title="操作失败" class="mt-4">
        {{ error }}
      </Alert>
    </form>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <Button variant="outline" :disabled="loading" @click="handleCancel">
          取消
        </Button>
        <Button type="submit" :loading="loading" :disabled="!isFormValid" @click="handleSubmit">
          {{ isEditing ? '更新记录' : '创建记录' }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Modal from './ui/Modal.vue'
import Button from './ui/Button.vue'
import Alert from './ui/Alert.vue'
import type { DNSRecord, CreateDNSRecordRequest } from '@/types'

interface Props {
  isOpen: boolean
  loading?: boolean
  error?: string
  record?: DNSRecord | null // For editing existing record
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  record: null
})

const emit = defineEmits<{
  save: [data: CreateDNSRecordRequest]
  cancel: []
}>()

// Form data
const formData = ref<CreateDNSRecordRequest>({
  type: 'CNAME',
  name: '',
  content: '',
  ttl: 1,
  proxied: false
})

// Computed properties
const isEditing = computed(() => !!props.record)
const modalTitle = computed(() => isEditing.value ? '编辑DNS记录' : '添加DNS记录')

const showProxiedOption = computed(() => {
  return ['A', 'AAAA', 'CNAME'].includes(formData.value.type)
})

const contentPlaceholder = computed(() => {
  switch (formData.value.type) {
    case 'A':
      return '例如: 192.0.2.1'
    case 'AAAA':
      return '例如: 2001:db8::1'
    case 'CNAME':
      return '例如: example.com'
    case 'MX':
      return '例如: 10 mail.example.com'
    case 'TXT':
      return '例如: "v=spf1 include:_spf.google.com ~all"'
    case 'NS':
      return '例如: ns1.example.com'
    default:
      return '输入记录值'
  }
})

const contentHint = computed(() => {
  switch (formData.value.type) {
    case 'A':
      return 'IPv4 地址'
    case 'AAAA':
      return 'IPv6 地址'
    case 'CNAME':
      return '目标域名或子域名'
    case 'MX':
      return '优先级和邮件服务器地址'
    case 'TXT':
      return '文本内容，通常用于验证或配置'
    case 'NS':
      return '名称服务器地址'
    default:
      return '根据记录类型输入相应的值'
  }
})

const isFormValid = computed(() => {
  return formData.value.type &&
    formData.value.name.trim() &&
    formData.value.content.trim()
})

// Watch for record changes (when editing)
watch(() => props.record, (newRecord) => {
  if (newRecord) {
    formData.value = {
      type: newRecord.type,
      name: newRecord.name,
      content: newRecord.content,
      ttl: newRecord.ttl,
      proxied: newRecord.proxied || false
    }
  }
}, { immediate: true })

// Watch for modal open/close to reset form
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && !props.record) {
    // Reset form for new record
    formData.value = {
      type: 'CNAME',
      name: '',
      content: '',
      ttl: 1,
      proxied: true
    }
  }
})

// Watch for type changes to set appropriate proxied default
watch(() => formData.value.type, (newType, oldType) => {
  if (newType === 'CNAME') {
    // CNAME records default to proxied = true
    formData.value.proxied = true
  } else if (['A', 'AAAA'].includes(newType)) {
    // A and AAAA records keep their current proxied setting or default to false
    // Only change if switching from a non-proxiable type
    if (oldType && !['A', 'AAAA', 'CNAME'].includes(oldType)) {
      formData.value.proxied = false
    }
  } else {
    // Other record types cannot be proxied
    formData.value.proxied = false
  }
}, { immediate: true })

// Handlers
const handleSubmit = () => {
  if (!isFormValid.value || props.loading) return

  // Debug: Log the form data to ensure proxied is correct
  console.log('Submitting DNS record:', formData.value)

  emit('save', { ...formData.value })
}

const handleCancel = () => {
  if (!props.loading) {
    emit('cancel')
  }
}
</script>