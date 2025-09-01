<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
        @click="handleBackdropClick">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" />

        <!-- Modal Content -->
        <div ref="modalRef" :class="modalClasses" @click.stop>
          <!-- Header -->
          <div v-if="title || $slots.header" class="flex items-center justify-between p-6 pb-4">
            <div v-if="title" class="text-lg font-semibold text-gray-900">
              {{ title }}
            </div>
            <slot name="header" />
            <button v-if="showClose" @click="$emit('close')"
              class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
              <X class="h-4 w-4" />
              <span class="sr-only">Close</span>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="flex items-center justify-end space-x-2 p-6 pt-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

interface Props {
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showClose?: boolean
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showClose: true,
  closeOnBackdrop: true
})


const modalRef = ref<HTMLElement>()

const modalClasses = computed(() => {
  const baseClasses = 'relative bg-white rounded-lg shadow-xl transition-all animate-scale-in border border-gray-200'

  const sizeClasses = {
    sm: 'max-w-sm w-full mx-4',
    md: 'max-w-md w-full mx-4',
    lg: 'max-w-lg w-full mx-4',
    xl: 'max-w-xl w-full mx-4'
  }

  return [baseClasses, sizeClasses[props.size]].join(' ')
})

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}

const emit = defineEmits<{
  close: []
}>()

// Handle escape key
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        emit('close')
      }
    }
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }
})
</script>