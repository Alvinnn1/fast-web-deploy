<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <NotificationContainer @retry="handleRetry" @action="handleAction" />

  </div>
</template>

<script setup lang="ts">
import NotificationContainer from './components/NotificationContainer.vue'

import type { Notification } from './utils/notifications'

// 处理通知重试
const handleRetry = (notification: Notification) => {
  // 这里可以根据通知类型执行相应的重试逻辑
  console.log('Retrying operation:', notification)
}

// 处理通知动作
const handleAction = (url: string) => {
  console.log('Opening URL:', url)
}
</script>