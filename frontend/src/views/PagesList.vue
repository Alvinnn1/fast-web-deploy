<template>
  <div class="space-y-6">
    <!-- Header with Add Page Button -->
    <div class="flex justify-between items-center">
      <h2 class="text-lg font-medium text-gray-900">页面管理</h2>
      <Button @click="handleAddPage" :disabled="loading">
        新建页面
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && pages.length === 0" class="text-center py-12">
      <LoadingSpinner />
      <p class="mt-2 text-gray-500">正在加载页面列表...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <Alert variant="error" title="加载失败">
        {{ error }}
      </Alert>
      <Button @click="refresh" variant="outline" class="mt-4">
        重试
      </Button>
    </div>

    <!-- Empty State -->
    <div v-else-if="pages.length === 0" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">还没有页面项目</h3>
      <p class="text-gray-500 mb-4">创建您的第一个静态页面项目开始使用</p>
      <Button @click="handleAddPage">
        添加页面
      </Button>
    </div>

    <!-- Pages List -->
    <div v-else class="space-y-4">
      <div class="flex justify-between items-center">
        <p class="text-sm text-gray-600">
          共 {{ pagination.total }} 个页面
          <span v-if="pagination.total > 0">
            (第 {{ pagination.current_page }} 页，共 {{ pagination.total_pages }} 页)
          </span>
        </p>
        <Button @click="fetchPages" variant="ghost" size="sm" :disabled="loading">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </Button>
      </div>

      <div class="grid gap-4">
        <PageItem v-for="page in pages" :key="page.id" :page="page" @click="handlePageClick" @upload="handlePageUpload"
          @view-status="handleViewStatus" />
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total > 0" class="mt-6">
        <Pagination
          :current-page="pagination.current_page"
          :page-size="pagination.per_page"
          :total="pagination.total"
          @page-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onActivated } from 'vue'
import { Button, LoadingSpinner, Alert, Pagination } from '@/components/ui'
import PageItem from '@/components/PageItem.vue'
import { usePagesPagination } from '@/composables/usePagination'
import { useTabState } from '@/composables/useTabState'
import type { Page, DeploymentStatusDetail } from '@/types'

// Use paginated data management
const { data: pages, loading, error, pagination, fetchData, goToPage, refresh } = usePagesPagination()
const { markTabInitialized, isTabInitialized } = useTabState()

// Emits for parent component communication
const emit = defineEmits<{
  addPage: []
  pageClick: [page: Page]
  pageUpload: [page: Page]
  viewStatus: [page: Page]
  statusUpdate: [update: { pageId: string; status: any }]
}>()

// Handle add page button click
const handleAddPage = () => {
  emit('addPage')
}

// Handle page item click
const handlePageClick = (page: Page) => {
  emit('pageClick', page)
}

// Handle page upload click
const handlePageUpload = (page: Page) => {
  emit('pageUpload', page)
}

const handleViewStatus = (page: Page) => {
  emit('viewStatus', page)
}

// Handle pagination events
const handlePageChange = (page: number) => {
  goToPage(page)
}

// Handle status updates from UploadModal
const handleStatusUpdate = (update: { pageId: string; status: any }) => {
  const { pageId, status } = update

  // Update the page with new status information
  const pageUpdates: Partial<Page> = {
    status: mapDeploymentStatusToPageStatus(status.status),
  }

  // Update URL if deployment is successful and URL is available
  if (status.status === 'success' && status.url) {
    pageUpdates.url = status.url
    pageUpdates.lastDeployedAt = new Date().toISOString()
  }

  // Update deployment ID if available
  if (status.deploymentId) {
    pageUpdates.deploymentId = status.deploymentId
  }

  // Note: With pagination, we need to refresh the current page to see updates
  refresh()
}

// Map deployment status to page status
const mapDeploymentStatusToPageStatus = (deploymentStatus: string): Page['status'] => {
  switch (deploymentStatus) {
    case 'queued':
    case 'building':
    case 'deploying':
      return 'deploying'
    case 'success':
      return 'deployed'
    case 'failure':
      return 'failed'
    default:
      return 'created'
  }
}

// Refresh specific page data from API
const refreshPageData = async (pageId: string) => {
  try {
    // Force refresh current page to get latest data
    await refresh()
  } catch (error) {
    console.error('Failed to refresh page data:', error)
  }
}

// Refresh pages (exposed method) - force refresh
const refreshPages = () => {
  return refresh()
}

// Fetch pages (alias for compatibility)
const fetchPages = () => {
  return fetchData()
}

// Load pages without forcing refresh (uses cache if available)
const loadPagesFromCache = async () => {
  await fetchData()
  markTabInitialized('pages')
}

// Load pages on component mount (first time)
onMounted(() => {
  // Only load if not already initialized
  if (!isTabInitialized('pages')) {
    loadPagesFromCache()
  }
})

// Load pages when component is activated (keepAlive)
onActivated(() => {
  // Only load if not already initialized and no data
  if (!isTabInitialized('pages') && pages.value.length === 0) {
    loadPagesFromCache()
  }
})

// Expose methods for parent component
defineExpose({
  refresh: refreshPages,
  fetchData,
  handleStatusUpdate,
  refreshPageData
})
</script>