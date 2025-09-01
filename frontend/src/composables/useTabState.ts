import { ref, watch } from 'vue'

// Global tab state to persist across component re-renders
const activeTab = ref<string>('pages')
const tabInitialized = ref<Record<string, boolean>>({
  pages: false,
  domains: false
})

export function useTabState() {
  // Mark a tab as initialized (data loaded)
  const markTabInitialized = (tabId: string) => {
    tabInitialized.value[tabId] = true
  }

  // Check if a tab has been initialized
  const isTabInitialized = (tabId: string) => {
    return tabInitialized.value[tabId] || false
  }

  // Set active tab
  const setActiveTab = (tabId: string) => {
    activeTab.value = tabId
  }

  // Get active tab
  const getActiveTab = () => {
    return activeTab.value
  }

  // Reset tab initialization state (useful for force refresh)
  const resetTabInitialization = (tabId?: string) => {
    if (tabId) {
      tabInitialized.value[tabId] = false
    } else {
      tabInitialized.value = {
        pages: false,
        domains: false
      }
    }
  }

  return {
    activeTab,
    markTabInitialized,
    isTabInitialized,
    setActiveTab,
    getActiveTab,
    resetTabInitialization
  }
}