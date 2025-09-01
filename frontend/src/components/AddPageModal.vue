<template>
  <Modal :open="isOpen" title="创建新页面" size="md" @close="handleClose">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Project Name Input -->
      <Input id="project-name" v-model="formData.name.value" label="项目名称" placeholder="例如: my-website"
        :error="formData.name.error" :disabled="loading" @blur="validateProjectName" @input="onProjectNameInput" />

      <div class="text-xs text-gray-500 space-y-1">
        <p>• 项目名称只能包含小写字母、数字和连字符</p>
        <p>• 必须以字母开头，不能以连字符结尾</p>
        <p>• 长度在 3-63 个字符之间</p>
      </div>

      <!-- Error Display -->
      <Alert v-if="submitError" variant="error" title="创建失败">
        {{ submitError }}
      </Alert>

      <!-- Success Display -->
      <Alert v-if="submitSuccess" variant="success" title="创建成功">
        页面项目 "{{ formData.name.value }}" 已成功创建
      </Alert>
    </form>

    <template #footer>
      <Button variant="outline" @click="handleClose" :disabled="loading">
        取消
      </Button>
      <Button @click="handleSubmit" :disabled="loading || !isFormValid">
        <LoadingSpinner v-if="loading" size="sm" class="mr-2" />
        {{ loading ? '创建中...' : '创建页面' }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal, Input, Button, Alert, LoadingSpinner } from '@/components/ui'
import { api } from '@/services/api'
import type { CreatePageRequest } from '@/types'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: [page: any]
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

// Computed properties
const isFormValid = computed(() => {
  return formData.value.name.value.trim() !== '' && !formData.value.name.error
})

// Project name validation
const validateProjectName = () => {
  const name = formData.value.name.value.trim()

  if (!name) {
    formData.value.name.error = '请输入项目名称'
    return false
  }

  // Cloudflare Pages project name validation
  // Must be 3-63 characters, lowercase letters, numbers, and hyphens only
  // Must start with a letter, cannot end with a hyphen
  const nameRegex = /^[a-z][a-z0-9-]{1,61}[a-z0-9]$|^[a-z][a-z0-9]{1,2}$/

  if (name.length < 3 || name.length > 63) {
    formData.value.name.error = '项目名称长度必须在 3-63 个字符之间'
    return false
  }

  if (!nameRegex.test(name)) {
    formData.value.name.error = '项目名称格式不正确，请检查命名规则'
    return false
  }

  // Check for consecutive hyphens
  if (name.includes('--')) {
    formData.value.name.error = '项目名称不能包含连续的连字符'
    return false
  }

  formData.value.name.error = ''
  return true
}

// Handle input to convert to lowercase and validate
const onProjectNameInput = () => {
  // Convert to lowercase automatically
  formData.value.name.value = formData.value.name.value.toLowerCase()

  // Clear error when user starts typing
  if (formData.value.name.error) {
    formData.value.name.error = ''
  }
}

// Handle form submission
const handleSubmit = async () => {
  // Validate form
  if (!validateProjectName()) {
    return
  }

  try {
    loading.value = true
    submitError.value = null
    submitSuccess.value = false

    // Prepare request data
    const requestData: CreatePageRequest = {
      name: formData.value.name.value.trim()
    }

    // Submit to API
    const response = await api.pages.create(requestData)

    if (response.success && response.data) {
      submitSuccess.value = true

      // Emit success event after a short delay to show success message
      setTimeout(() => {
        emit('success', response.data)
        handleClose()
      }, 1500)
    } else {
      throw new Error(response.message || '创建页面项目失败')
    }
  } catch (error: any) {
    console.error('Failed to create page:', error)

    // Handle specific error cases
    if (error.message?.includes('already exists') || error.message?.includes('重复')) {
      submitError.value = '项目名称已存在，请使用其他名称'
    } else {
      submitError.value = error.message || '创建页面项目失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

// Handle modal close
const handleClose = () => {
  if (loading.value) return // Prevent closing while loading

  emit('close')
}

// Reset form when modal opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Reset form when opening
    formData.value.name.value = ''
    formData.value.name.error = ''
    submitError.value = null
    submitSuccess.value = false
    loading.value = false
  }
})
</script>