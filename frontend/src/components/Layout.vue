<template>
  <div class="min-h-screen bg-purple-gradient-light">
    <!-- Header -->
    <Header />

    <!-- Tab Navigation -->
    <TabNavigation @tab-change="handleTabChange" />

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-up p-6">
        <keep-alive :include="['DomainList', 'PagesList', 'DomainDetail']">
          <div>
            <!-- Domain Content -->
            <div v-show="activeTab === 'domains'">
              <!-- Domain List -->
              <DomainList v-if="!selectedDomainId" ref="domainListRef" @add-domain="handleAddDomain"
                @domain-click="handleDomainClick" />

              <!-- Domain Detail -->
              <DomainDetail v-else :domain-id="selectedDomainId" @back="handleBackToDomainList" />
            </div>

            <!-- Pages List Content -->
            <PagesList v-show="activeTab === 'pages'" ref="pagesListRef" @add-page="handleAddPage" @page-click="handlePageClick"
              @page-upload="handlePageUpload" @view-status="handleViewStatus" />
          </div>
        </keep-alive>
      </div>
    </main>

    <!-- Add Domain Modal -->
    <AddDomainModal :is-open="showAddDomainModal" @close="handleAddDomainModalClose"
      @success="handleAddDomainSuccess" />

    <!-- Add Page Modal -->
    <AddPageModal :is-open="showAddPageModal" @close="handleAddPageModalClose" @success="handleAddPageSuccess" />

    <!-- Upload Modal -->
    <UploadModal :is-open="showUploadModal" :page="selectedPageForUpload" @close="handleUploadModalClose"
      @success="handleUploadSuccess" @status-update="handleStatusUpdate" />

    <!-- Deployment Status Modal -->
    <DeploymentStatusModal :is-open="showDeploymentStatusModal" :page="selectedPageForStatus"
      @close="handleDeploymentStatusModalClose" @retry="handleDeploymentRetry" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Header from './Header.vue'
import TabNavigation from './TabNavigation.vue'
import DomainList from '@/views/DomainList.vue'
import DomainDetail from '@/views/DomainDetail.vue'
import PagesList from '@/views/PagesList.vue'
import AddDomainModal from './AddDomainModal.vue'
import AddPageModal from './AddPageModal.vue'
import UploadModal from './UploadModal.vue'
import DeploymentStatusModal from './DeploymentStatusModal.vue'
import { useTabState } from '@/composables/useTabState'
import type { Domain, Page } from '@/types'

const { activeTab, setActiveTab } = useTabState()
const showAddDomainModal = ref(false)
const showAddPageModal = ref(false)
const showUploadModal = ref(false)
const showDeploymentStatusModal = ref(false)
const domainListRef = ref<InstanceType<typeof DomainList> | null>(null)
const pagesListRef = ref<InstanceType<typeof PagesList> | null>(null)
const selectedDomainId = ref<string | null>(null)
const selectedPageForUpload = ref<Page | undefined>(undefined)
const selectedPageForStatus = ref<Page | undefined>(undefined)


const handleTabChange = (tabId: string) => {
  setActiveTab(tabId)
  // Reset domain detail view when switching tabs
  if (tabId !== 'domains') {
    selectedDomainId.value = null
  }
}

// Domain management handlers
const handleAddDomain = () => {
  showAddDomainModal.value = true
}

const handleDomainClick = (domain: Domain) => {
  selectedDomainId.value = domain.id
}

const handleBackToDomainList = () => {
  selectedDomainId.value = null
}

const handleAddDomainModalClose = () => {
  showAddDomainModal.value = false
}

const handleAddDomainSuccess = (domain: Domain) => {
  console.log('Domain added successfully:', domain)
  // showAddDomainModal.value = false

  // Add to cache instead of refreshing
  if (domainListRef.value && domainListRef.value.onAddDomain) {
    domainListRef.value.onAddDomain(domain)
  }
}

// Page management handlers
const handleAddPage = () => {
  showAddPageModal.value = true
}

const handlePageClick = (page: Page) => {
  console.log('Page clicked:', page)
  // TODO: Implement page detail view or actions in next task
}

const handlePageUpload = (page: Page) => {
  selectedPageForUpload.value = page
  showUploadModal.value = true
}

const handleAddPageModalClose = () => {
  showAddPageModal.value = false
}

const handleAddPageSuccess = (page: Page) => {
  console.log('Page added successfully:', page)
  showAddPageModal.value = false

  // Add to cache instead of refreshing
  if (pagesListRef.value && pagesListRef.value.onAddPage) {
    pagesListRef.value.onAddPage(page)
  }
}

const handleUploadModalClose = () => {
  showUploadModal.value = false
  selectedPageForUpload.value = undefined
}

const handleUploadSuccess = (result: any) => {
  console.log('Upload successful:', result)
  showUploadModal.value = false

  // Update the specific page in cache instead of refreshing all
  if (selectedPageForUpload.value && pagesListRef.value && pagesListRef.value.onUpdatePage) {
    pagesListRef.value.onUpdatePage(selectedPageForUpload.value.id, {
      status: 'deploying',
      deploymentId: result.id,
      lastDeployedAt: new Date().toISOString()
    })
  }

  selectedPageForUpload.value = undefined
}

const handleStatusUpdate = (update: { pageId: string; status: any }) => {
  console.log('Status update received:', update)

  // Delegate status update handling to PagesList component
  if (pagesListRef.value && pagesListRef.value.handleStatusUpdate) {
    pagesListRef.value.handleStatusUpdate(update)
  }
}

const handleViewStatus = (page: Page) => {
  selectedPageForStatus.value = page
  showDeploymentStatusModal.value = true
}

const handleDeploymentStatusModalClose = () => {
  showDeploymentStatusModal.value = false
  selectedPageForStatus.value = undefined

  // No need to refresh - status updates should be handled by the modal itself
}

const handleDeploymentRetry = (page: Page) => {
  console.log('Retry deployment for page:', page)
  // Close status modal and open upload modal for retry
  showDeploymentStatusModal.value = false
  selectedPageForStatus.value = undefined
  selectedPageForUpload.value = page
  showUploadModal.value = true
}
</script>