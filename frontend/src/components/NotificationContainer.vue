<template>
  <Teleport to="body">
    <div v-if="notifications.length > 0" class="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      <TransitionGroup name="notification" tag="div" class="space-y-3">
        <div v-for="notification in notifications" :key="notification.id" class="transform transition-all duration-300">
          <SuccessMessage v-if="notification.type === 'success'" :title="notification.title"
            :message="notification.message" :dismissible="notification.dismissible"
            :action-text="notification.actionText" :action-url="notification.actionUrl"
            @dismiss="remove(notification.id)" @action="handleAction" />

          <ErrorMessage v-else-if="notification.type === 'error'" :error="notification.error"
            :title="notification.title" :message="notification.message" :dismissible="notification.dismissible"
            @dismiss="remove(notification.id)" @retry="handleRetry(notification)" />

          <Alert v-else :variant="notification.type" :title="notification.title" :dismissible="notification.dismissible"
            @dismiss="remove(notification.id)">
            {{ notification.message }}
          </Alert>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Alert, ErrorMessage, SuccessMessage } from './ui'
import { useNotifications } from '../utils/notifications'
import type { Notification } from '../utils/notifications'

const { notifications, remove } = useNotifications()

const emit = defineEmits<{
  retry: [notification: Notification]
  action: [url: string]
}>()

const handleRetry = (notification: Notification) => {
  emit('retry', notification)
}

const handleAction = (url: string) => {
  emit('action', url)
}
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>