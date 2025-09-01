<template>
  <div class="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
    <div class="flex items-center justify-between">
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Type -->
        <div class="lg:col-span-2">
          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">类型</label>
          <p class="mt-1 text-sm font-mono text-gray-900">{{ record.type }}</p>
        </div>

        <!-- Name -->
        <div class="lg:col-span-3">
          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">名称</label>
          <p class="mt-1 text-sm font-mono text-gray-900 break-all" :title="record.name">
            {{ record.name || '@' }}
          </p>
        </div>

        <!-- Content -->
        <div class="lg:col-span-5">
          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">内容</label>
          <p class="mt-1 text-sm font-mono text-gray-900 break-all" :title="record.content">
            {{ record.content }}
          </p>
        </div>

        <!-- TTL & Proxy -->
        <div class="lg:col-span-2">
          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">TTL</label>
          <div class="mt-1 flex items-center space-x-2">
            <span class="text-sm text-gray-900">{{ formatTTL(record.ttl) }}</span>
            <span v-if="record.proxied"
              class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
              代理
            </span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="ml-4 flex items-center space-x-2">
        <Button variant="ghost" size="sm" @click="handleEdit" title="编辑记录">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </Button>
        <Button variant="ghost" size="sm" @click="handleDelete" class="text-red-600 hover:text-red-700" title="删除记录">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui'
import type { DNSRecord } from '@/types'

interface Props {
  record: DNSRecord
  editing?: boolean // Keep for compatibility but not used
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [recordId: string]
  delete: [recordId: string]
}>()

// Format TTL for display
const formatTTL = (ttl: number): string => {
  if (ttl === 1) return '自动'
  if (ttl < 60) return `${ttl}秒`
  if (ttl < 3600) return `${Math.floor(ttl / 60)}分钟`
  if (ttl < 86400) return `${Math.floor(ttl / 3600)}小时`
  return `${Math.floor(ttl / 86400)}天`
}

// Event handlers
const handleEdit = () => {
  emit('edit', props.record.id)
}

const handleDelete = () => {
  emit('delete', props.record.id)
}
</script>