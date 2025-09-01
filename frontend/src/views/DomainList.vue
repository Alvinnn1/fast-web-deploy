<template>
  <div class="space-y-6">
    <!-- Header with Add Domain Button -->
    <div class="flex justify-between items-center">
      <h2 class="text-lg font-medium text-gray-900">域名管理</h2>
      <Button @click="handleAddDomain" :disabled="loading">
        新建域名
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && domains.length === 0" class="text-center py-12">
      <LoadingSpinner />
      <p class="mt-2 text-gray-500">正在加载域名列表...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <Alert variant="error" title="加载失败">
        {{ error }}
      </Alert>
      <Button @click="fetchDomains" variant="outline" class="mt-4">
        重试
      </Button>
    </div>

    <!-- Empty State -->
    <div v-else-if="domains.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">暂无域名</h3>
      <p class="text-gray-500 mb-4">开始添加您的第一个域名来管理DNS和SSL证书</p>
      <Button @click="handleAddDomain">
        添加域名
      </Button>
    </div>

    <!-- Domain List -->
    <div v-else class="space-y-4">
      <div class="flex justify-between items-center">
        <p class="text-sm text-gray-600">共 {{ domains.length }} 个域名</p>
        <Button @click="fetchDomains" variant="ghost" size="sm" :disabled="loading">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </Button>
      </div>

      <div class="grid gap-4">
        <DomainItem v-for="domain in domains" :key="domain.id" :domain="domain" @click="handleDomainClick" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onActivated } from 'vue'
import { Button, LoadingSpinner, Alert } from '@/components/ui'
import DomainItem from '@/components/DomainItem.vue'
import { useDomains } from '@/composables/useDataCache'
import type { Domain } from '@/types'

// Use cached data management
const { domains, loading, error, loadDomains, refreshDomains, addDomain: addDomainToCache, updateDomain } = useDomains()

// Emits for parent component communication
const emit = defineEmits<{
  addDomain: []
  domainClick: [domain: Domain]
}>()

// Handle add domain button click
const handleAddDomain = () => {
  emit('addDomain')
}

// Handle domain item click
const handleDomainClick = (domain: Domain) => {
  emit('domainClick', domain)
}

// Refresh domains (exposed method) - force refresh
const refresh = () => {
  return refreshDomains()
}

// Load domains without forcing refresh (uses cache if available)
const loadDomainsFromCache = () => {
  return loadDomains(false)
}

// Fetch domains (alias for compatibility)
const fetchDomains = () => {
  return refreshDomains()
}

// Load domains on component mount (first time)
onMounted(() => {
  loadDomainsFromCache()
})

// Load domains when component is activated (keepAlive)
// Only load if we don't have data or it's been a while
onActivated(() => {
  // Only load if we don't have any data yet
  if (domains.value.length === 0) {
    loadDomainsFromCache()
  }
})

// Expose methods for parent component
defineExpose({
  refresh,
  fetchDomains,
  addDomain: addDomainToCache,
  updateDomain
})
</script>