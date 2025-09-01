<template>
  <div :class="cardClasses">
    <!-- Header -->
    <div v-if="title || $slots.header" class="p-6 pb-4">
      <div v-if="title" class="text-lg font-semibold text-gray-900">
        {{ title }}
      </div>
      <slot name="header" />
    </div>

    <!-- Content -->
    <div class="p-6 pt-0">
      <slot />
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="p-6 pt-0">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  variant?: 'default' | 'outlined' | 'elevated'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default'
})

const cardClasses = computed(() => {
  const baseClasses = 'rounded-lg bg-white card-hover'

  const variantClasses = {
    default: 'border border-gray-200 shadow-sm',
    outlined: 'border-2 border-purple-200 shadow-sm',
    elevated: 'shadow-lg border border-gray-100'
  }

  return [baseClasses, variantClasses[props.variant]].join(' ')
})
</script>