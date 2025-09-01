import { ref, reactive } from 'vue'
import type { UserFriendlyError } from '../types/common'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
  dismissible?: boolean
  autoHide?: boolean
  autoHideDelay?: number
  actionText?: string
  actionUrl?: string
  error?: UserFriendlyError
}

class NotificationManager {
  private static instance: NotificationManager
  private notifications = reactive<Notification[]>([])
  private idCounter = 0

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  /**
   * 添加通知
   */
  add(notification: Omit<Notification, 'id'>): string {
    const id = `notification-${++this.idCounter}`
    const newNotification: Notification = {
      id,
      dismissible: true,
      autoHide: notification.type === 'success',
      autoHideDelay: 3000,
      ...notification
    }

    this.notifications.push(newNotification)

    // 自动隐藏
    if (newNotification.autoHide) {
      setTimeout(() => {
        this.remove(id)
      }, newNotification.autoHideDelay)
    }

    return id
  }

  /**
   * 移除通知
   */
  remove(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id)
    if (index > -1) {
      this.notifications.splice(index, 1)
    }
  }

  /**
   * 清空所有通知
   */
  clear(): void {
    this.notifications.splice(0)
  }

  /**
   * 获取所有通知
   */
  getAll(): Notification[] {
    return this.notifications
  }

  /**
   * 显示成功消息
   */
  success(message: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'success',
      message,
      ...options
    })
  }

  /**
   * 显示错误消息
   */
  error(error: UserFriendlyError | string, options?: Partial<Notification>): string {
    if (typeof error === 'string') {
      return this.add({
        type: 'error',
        message: error,
        autoHide: false,
        ...options
      })
    }

    return this.add({
      type: 'error',
      title: error.title,
      message: error.message,
      error,
      autoHide: false,
      ...options
    })
  }

  /**
   * 显示信息消息
   */
  info(message: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'info',
      message,
      ...options
    })
  }

  /**
   * 显示警告消息
   */
  warning(message: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'warning',
      message,
      autoHide: false,
      ...options
    })
  }
}

/**
 * Vue组合式API的通知hook
 */
export function useNotifications() {
  const manager = NotificationManager.getInstance()

  return {
    notifications: manager.getAll(),
    add: (notification: Omit<Notification, 'id'>) => manager.add(notification),
    remove: (id: string) => manager.remove(id),
    clear: () => manager.clear(),
    success: (message: string, options?: Partial<Notification>) => manager.success(message, options),
    error: (error: UserFriendlyError | string, options?: Partial<Notification>) => manager.error(error, options),
    info: (message: string, options?: Partial<Notification>) => manager.info(message, options),
    warning: (message: string, options?: Partial<Notification>) => manager.warning(message, options)
  }
}