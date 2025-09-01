<template>
  <Teleport to="body">
    <Transition name="loading-overlay">
      <div v-if="isLoading" class="fixed inset-0 z-40 bg-white/80 backdrop-blur-sm flex items-center justify-center">
        <LoadingSpinner size="lg" :text="loadingText" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LoadingSpinner } from './ui'
import { useLoading } from '../utils/loading'

const { isLoading } = useLoading()

// 可以根据需要自定义加载文本
const loadingText = computed(() => {
  return '正在处理中...'
})
</script>

<style scoped>
.loading-overlay-enter-active,
.loading-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.loading-overlay-enter-from,
.loading-overlay-leave-to {
  opacity: 0;
}
</style>