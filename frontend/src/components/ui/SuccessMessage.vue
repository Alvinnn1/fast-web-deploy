<template>
  <Alert variant="success" :title="title" :dismissible="dismissible" @dismiss="handleDismiss">
    <slot>{{ message }}</slot>
    <div v-if="actionText && actionUrl" class="mt-3">
      <Button variant="ghost" size="sm" @click="handleAction"
        class="text-green-700 hover:text-green-800 hover:bg-green-100">
        <ExternalLink class="h-4 w-4 mr-2" />
        {{ actionText }}
      </Button>
    </div>
  </Alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import Alert from './Alert.vue'
import Button from './Button.vue'

interface Props {
  title?: string
  message?: string
  dismissible?: boolean
  actionText?: string
  actionUrl?: string
  autoHide?: boolean
  autoHideDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: '操作成功',
  dismissible: true,
  autoHide: false,
  autoHideDelay: 3000
})

const emit = defineEmits<{
  dismiss: []
  action: [url: string]
}>()

// 自动隐藏功能
if (props.autoHide) {
  setTimeout(() => {
    emit('dismiss')
  }, props.autoHideDelay)
}

const handleDismiss = () => {
  emit('dismiss')
}

const handleAction = () => {
  if (props.actionUrl) {
    emit('action', props.actionUrl)
    // 默认行为：在新窗口打开链接
    window.open(props.actionUrl, '_blank')
  }
}
</script>