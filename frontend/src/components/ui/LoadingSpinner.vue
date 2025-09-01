<template>
  <div :class="containerClasses">
    <div :class="spinnerClasses">
      <Loader2 :class="iconClasses" />
    </div>
    <p v-if="text" :class="textClasses">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  overlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  overlay: false
})

const containerClasses = computed(() => {
  const baseClasses = 'flex flex-col items-center justify-center'
  
  if (props.overlay) {
    return [baseClasses, 'fixed inset-0 z-50 bg-white/80 backdrop-blur-sm'].join(' ')
  }
  
  return baseClasses
})

const spinnerClasses = computed(() => {
  return 'animate-spin text-purple-600'
})

const iconClasses = computed(() => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }
  
  return sizeClasses[props.size]
})

const textClasses = computed(() => {
  const baseClasses = 'mt-2 text-gray-600'
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }
  
  return [baseClasses, sizeClasses[props.size]].join(' ')
})
</script>