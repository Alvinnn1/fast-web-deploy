<template>
  <Modal :open="isOpen" :title="title" size="sm" :close-on-backdrop="!loading" @close="handleCancel">
    <div class="space-y-4">
      <!-- Message -->
      <div class="text-sm text-gray-600">
        {{ message }}
      </div>

      <!-- Error Display -->
      <Alert v-if="error" variant="error" title="操作失败" class="mt-3">
        {{ error }}
      </Alert>
    </div>

    <template #footer>
      <div class="flex space-x-3">
        <Button ref="cancelButtonRef" variant="outline" :disabled="loading" @click="handleCancel">
          {{ cancelText }}
        </Button>
        <button ref="confirmButtonRef" :class="confirmButtonClasses" :disabled="loading" @click="handleConfirm"
          @keydown.enter="handleConfirm" @keydown.space.prevent="handleConfirm">
          <LoadingSpinner v-if="loading" class="w-4 h-4 mr-2" />
          {{ confirmText }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import Modal from './Modal.vue'
import Button from './Button.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import Alert from './Alert.vue'

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'info',
  loading: false
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmButtonRef = ref<HTMLButtonElement>()
const cancelButtonRef = ref<InstanceType<typeof Button>>()

const confirmButtonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 btn-hover-lift h-10 px-4 py-2 shadow-md'

  const variantClasses = {
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus-visible:ring-yellow-500',
    info: 'bg-purple-600 text-white hover:bg-purple-700 focus-visible:ring-purple-500'
  }

  return [baseClasses, variantClasses[props.variant]].join(' ')
})

const handleConfirm = () => {
  if (!props.loading) {
    emit('confirm')
  }
}

const handleCancel = () => {
  if (!props.loading) {
    emit('cancel')
  }
}

// Focus management and keyboard navigation
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    // Focus the confirm button for keyboard navigation
    if (confirmButtonRef.value) {
      confirmButtonRef.value.focus()
    }

    // Add keyboard event listener for the modal
    const handleKeydown = (e: KeyboardEvent) => {
      if (props.loading) return

      if (e.key === 'Escape') {
        handleCancel()
      } else if (e.key === 'Tab') {
        // Handle tab navigation between buttons
        e.preventDefault()
        const activeElement = document.activeElement

        if (activeElement === confirmButtonRef.value) {
          // Focus cancel button
          const cancelButton = cancelButtonRef.value?.$el as HTMLElement
          if (cancelButton) {
            cancelButton.focus()
          }
        } else {
          // Focus confirm button
          if (confirmButtonRef.value) {
            confirmButtonRef.value.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeydown)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }
})
</script>