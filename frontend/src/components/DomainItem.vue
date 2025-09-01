<template>
  <Card variant="default" :class="[
    'cursor-pointer transition-all duration-200 hover:bg-gray-50 pt-6',
    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
  ]" @click="handleClick" @keydown.enter="handleClick" @keydown.space.prevent="handleClick" tabindex="0"
    role="button" :aria-label="`查看域名 ${domain.name} 的详情`">
    <div class="flex items-center justify-between">
      <!-- Domain Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center space-x-3">
          <!-- Domain Name -->
          <h3 class="text-lg font-medium text-gray-900 truncate">
            {{ domain.name }}
          </h3>

          <!-- Status Badge -->
          <span :class="statusClasses" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
            <span :class="statusDotClasses" class="w-1.5 h-1.5 rounded-full mr-1.5"></span>
            {{ statusText }}
          </span>
        </div>

        <!-- Domain Details -->
        <div class="mt-2 flex items-center space-x-4 text-sm text-gray-500">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            创建于 {{ formatDate(domain.createdAt) }}
          </div>

          <div class="flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7c0-2.21-1.79-4-4-4H8c-2.21 0-4 1.79-4 4z" />
            </svg>
            {{ domain.nameservers.length }} 个 NS 记录
          </div>
        </div>

        <!-- Nameservers Preview -->
        <div class="mt-3">
          <div class="text-xs text-gray-400 mb-1">Nameservers:</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="(ns, index) in domain.nameservers.slice(0, 2)" :key="index"
              class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
              {{ ns }}
            </span>
            <span v-if="domain.nameservers.length > 2"
              class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">
              +{{ domain.nameservers.length - 2 }} 更多
            </span>
          </div>
        </div>
      </div>

      <!-- Action Arrow -->
      <div class="ml-4 flex-shrink-0">
        <svg class="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none"
          stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Card } from '@/components/ui'
import type { Domain, DomainStatus } from '@/types'

interface Props {
  domain: Domain
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: [domain: Domain]
}>()

// Status styling
const statusClasses = computed(() => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'

  switch (props.domain.status) {
    case 'active':
      return `${baseClasses} bg-green-100 text-green-800`
    case 'pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    case 'moved':
      return `${baseClasses} bg-blue-100 text-blue-800`
    case 'deleted':
      return `${baseClasses} bg-red-100 text-red-800`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
})

const statusDotClasses = computed(() => {
  switch (props.domain.status) {
    case 'active':
      return 'bg-green-400'
    case 'pending':
      return 'bg-yellow-400'
    case 'moved':
      return 'bg-blue-400'
    case 'deleted':
      return 'bg-red-400'
    default:
      return 'bg-gray-400'
  }
})

const statusText = computed(() => {
  const statusMap: Record<DomainStatus, string> = {
    active: '活跃',
    pending: '待处理',
    moved: '已迁移',
    deleted: '已删除'
  }
  return statusMap[props.domain.status] || '未知'
})

// Format date helper
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

// Handle click event
const handleClick = () => {
  emit('click', props.domain)
}
</script>

<style scoped>
.group:hover .group-hover\:text-purple-500 {
  color: rgb(168 85 247);
}
</style>