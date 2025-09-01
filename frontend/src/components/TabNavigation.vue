<template>
  <div class="bg-white/80 backdrop-blur-sm border-b border-purple-200 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex space-x-8" aria-label="Tabs">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :class="[
          'py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 relative',
          activeTab === tab.id
            ? 'border-purple-500 text-purple-600 shadow-sm'
            : 'border-transparent text-gray-500 hover:text-purple-600 hover:border-purple-300'
        ]" :aria-current="activeTab === tab.id ? 'page' : undefined">
          {{ tab.name }}
          <div v-if="activeTab === tab.id"
            class="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full">
          </div>
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Tab {
  id: string
  name: string
}

const tabs: Tab[] = [
  { id: 'pages', name: '页面列表' },
  { id: 'domains', name: '域名列表' }
]

const activeTab = ref<string>('pages')

// Emit the active tab change to parent component
const emit = defineEmits<{
  tabChange: [tabId: string]
}>()

// Watch for tab changes and emit to parent
watch(activeTab, (newTab) => {
  emit('tabChange', newTab)
})
</script>