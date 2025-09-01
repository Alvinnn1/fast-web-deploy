<template>
  <div class="space-y-2">
    <label v-if="label" :for="id" class="text-sm font-medium text-gray-700">
      {{ label }}
    </label>
    <input :id="id" :type="type" :placeholder="placeholder" :disabled="disabled" :value="modelValue"
      :class="inputClasses" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur', $event)" @focus="$emit('focus', $event)" />
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  id?: string
  type?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  error?: string
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false
})

defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const inputClasses = computed(() => {
  const baseClasses = 'flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 input-focus-glow transition-all duration-200'

  const errorClasses = props.error
    ? 'border-red-300 focus-visible:ring-red-500'
    : 'border-gray-300 hover:border-purple-300'

  return [baseClasses, errorClasses].join(' ')
})
</script>