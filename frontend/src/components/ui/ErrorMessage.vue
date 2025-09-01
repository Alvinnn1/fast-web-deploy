<template>
  <Alert variant="error" :title="title" :dismissible="dismissible" @dismiss="handleDismiss">
    <slot>{{ message }}</slot>
    <div v-if="showRetry" class="mt-3">
      <Button variant="ghost" size="sm" @click="handleRetry" :disabled="retrying"
        class="text-red-700 hover:text-red-800 hover:bg-red-100">
        <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': retrying }]" />
        重试
      </Button>
    </div>
  </Alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import Alert from './Alert.vue'
import Button from './Button.vue'
import type { UserFriendlyError } from '../../types/common'

interface Props {
  error?: UserFriendlyError | string
  title?: string
  message?: string
  dismissible?: boolean
  retrying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  dismissible: true,
  retrying: false
})

const emit = defineEmits<{
  dismiss: []
  retry: []
}>()

// 计算显示的标题和消息
const title = computed(() => {
  if (props.title) return props.title
  if (typeof props.error === 'object' && props.error?.title) {
    return props.error.title
  }
  return '操作失败'
})

const message = computed(() => {
  if (props.message) return props.message
  if (typeof props.error === 'string') return props.error
  if (typeof props.error === 'object' && props.error?.message) {
    return props.error.message
  }
  return '发生未知错误，请重试'
})

// 是否显示重试按钮
const showRetry = computed(() => {
  if (typeof props.error === 'object' && props.error?.action === 'retry') {
    return true
  }
  return false
})

const handleDismiss = () => {
  emit('dismiss')
}

const handleRetry = () => {
  emit('retry')
}
</script>