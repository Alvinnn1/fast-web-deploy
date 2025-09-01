<template>
  <Modal :open="isOpen" title="添加新域名" size="md" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Domain Name Input -->
      <Input id="domain-name" v-model="formData.name.value" label="域名地址" placeholder="例如: example.com"
        :error="formData.name.error" :disabled="loading" @blur="validateDomainName" />

      <!-- Error Display -->
      <Alert v-if="submitError" variant="error" title="添加失败">
        {{ submitError }}
      </Alert>

      <!-- Success Display with Nameservers -->
      <div v-if="submitSuccess && createdDomain" class="space-y-4">
        <Alert variant="success" title="添加成功">
          域名 "{{ createdDomain.name }}" 已成功添加到您的账户
        </Alert>

        <!-- Nameservers Information -->
        <div v-if="createdDomain.nameservers && createdDomain.nameservers.length > 0"
          class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="text-sm font-medium text-blue-900 mb-3">
            📋 请更新您的域名服务器设置
          </h4>
          <p class="text-sm text-blue-800 mb-3">
            请前往您的域名注册商（如阿里云、腾讯云、GoDaddy等）管理后台，将域名的DNS服务器更改为以下地址：
          </p>
          <div class="bg-white rounded border border-blue-200 p-3">
            <div class="space-y-2">
              <div v-for="(nameserver, index) in createdDomain.nameservers" :key="index"
                class="flex items-center justify-between">
                <code class="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
                  {{ nameserver }}
                </code>
                <button type="button" @click="copyToClipboard(nameserver)"
                  class="text-blue-600 hover:text-blue-800 text-xs" title="复制到剪贴板">
                  复制
                </button>
              </div>
            </div>
          </div>
          <p class="text-xs text-blue-700 mt-3">
            💡 提示：DNS更改通常需要24-48小时生效，请耐心等待。
          </p>
        </div>
      </div>
    </form>

    <template #footer>
      <Button variant="outline" @click="handleClose" :disabled="loading">
        取消
      </Button>
      <Button @click="handleSubmit" :disabled="loading || !isFormValid" v-if="!submitSuccess">
        <LoadingSpinner v-if="loading" size="sm" class="mr-2" />
        {{ loading ? '添加中...' : '添加域名' }}
      </Button>
      <Button @click="handleClose" v-if="submitSuccess">
        完成
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal, Input, Button, Alert, LoadingSpinner } from '@/components/ui'
import { api } from '@/services/api'
import type { CreateDomainRequest } from '@/types'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: [domain: any]
}>()

// Form data
const formData = ref({
  name: {
    value: '',
    error: ''
  }
})

const loading = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)
const createdDomain = ref<any>(null)

// Computed properties
const isFormValid = computed(() => {
  return formData.value.name.value.trim() !== '' &&
    !formData.value.name.error
})

// Domain name validation
const validateDomainName = () => {
  const domain = formData.value.name.value.trim()

  if (!domain) {
    formData.value.name.error = '请输入域名地址'
    return false
  }

  // Basic domain validation regex
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}\.?)+$/

  if (!domainRegex.test(domain)) {
    formData.value.name.error = '请输入有效的域名格式'
    return false
  }

  formData.value.name.error = ''
  return true
}



// Handle form submission
const handleSubmit = async () => {
  // Validate form
  if (!validateDomainName()) {
    return
  }

  try {
    loading.value = true
    submitError.value = null
    submitSuccess.value = false

    // Prepare request data
    const requestData: CreateDomainRequest = {
      name: formData.value.name.value.trim()
    }

    // Submit to API
    const response = await api.domains.create(requestData)

    if (response.success && response.data) {
      submitSuccess.value = true
      createdDomain.value = response.data

      // Emit success event immediately but don't close modal automatically
      // Let user see the nameservers and close manually
      emit('success', response.data)
    } else {
      throw new Error(response.message || '添加域名失败')
    }
  } catch (error: any) {
    console.error('Failed to create domain:', error)
    submitError.value = error.message || '添加域名失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// Handle modal close
const handleClose = () => {
  if (loading.value) return // Prevent closing while loading

  emit('close')
}

// Copy to clipboard function
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // You could add a toast notification here if you have one
    console.log('Copied to clipboard:', text)
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

// Reset form when modal opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Reset form when opening
    formData.value.name.value = ''
    formData.value.name.error = ''
    submitError.value = null
    submitSuccess.value = false
    createdDomain.value = null
    loading.value = false
  }
})
</script>