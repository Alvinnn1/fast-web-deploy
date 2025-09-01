<template>
  <div :class="alertClasses" role="alert">
    <div class="flex items-start space-x-3">
      <component :is="iconComponent" :class="iconClasses" />
      <div class="flex-1">
        <h4 v-if="title" :class="titleClasses">{{ title }}</h4>
        <div :class="contentClasses">
          <slot />
        </div>
      </div>
      <button
        v-if="dismissible"
        @click="$emit('dismiss')"
        :class="closeButtonClasses"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">Dismiss</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, CheckCircle, Info, X, XCircle } from 'lucide-vue-next'

interface Props {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  dismissible: false
})

defineEmits<{
  dismiss: []
}>()

const alertClasses = computed(() => {
  const baseClasses = 'relative w-full rounded-lg border p-4'
  
  const variantClasses = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    error: 'border-red-200 bg-red-50 text-red-800'
  }
  
  return [baseClasses, variantClasses[props.variant]].join(' ')
})

const iconComponent = computed(() => {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle
  }
  
  return icons[props.variant]
})

const iconClasses = computed(() => {
  const baseClasses = 'h-5 w-5 flex-shrink-0'
  
  const variantClasses = {
    info: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  }
  
  return [baseClasses, variantClasses[props.variant]].join(' ')
})

const titleClasses = computed(() => {
  return 'font-medium mb-1'
})

const contentClasses = computed(() => {
  return 'text-sm'
})

const closeButtonClasses = computed(() => {
  const baseClasses = 'rounded-md p-1.5 transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    info: 'text-blue-600 focus:ring-blue-500',
    success: 'text-green-600 focus:ring-green-500',
    warning: 'text-yellow-600 focus:ring-yellow-500',
    error: 'text-red-600 focus:ring-red-500'
  }
  
  return [baseClasses, variantClasses[props.variant]].join(' ')
})
</script>