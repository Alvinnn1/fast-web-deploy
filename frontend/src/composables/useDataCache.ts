import { ref, computed } from 'vue'
import { api } from '@/services/api'
import { cacheService } from '@/services/cache'
import type { Page, Domain } from '@/types'

// Global state for pages
const pagesState = ref<{
  data: Page[]
  loading: boolean
  error: string | null
  lastFetch: number | null
}>({
  data: [],
  loading: false,
  error: null,
  lastFetch: null
})

// Global state for domains
const domainsState = ref<{
  data: Domain[]
  loading: boolean
  error: string | null
  lastFetch: number | null
}>({
  data: [],
  loading: false,
  error: null,
  lastFetch: null
})

export function usePages() {
  const pages = computed(() => pagesState.value.data)
  const loading = computed(() => pagesState.value.loading)
  const error = computed(() => pagesState.value.error)

  const loadPages = async (forceRefresh = false) => {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedPages = cacheService.getPages()
      if (cachedPages) {
        pagesState.value.data = cachedPages
        return
      }
    }

    // Avoid duplicate requests
    if (pagesState.value.loading) {
      return
    }

    try {
      pagesState.value.loading = true
      pagesState.value.error = null

      const response = await api.pages.list()

      if (response.success && response.data) {
        pagesState.value.data = response.data
        pagesState.value.lastFetch = Date.now()

        // Cache the data
        cacheService.setPages(response.data)
      } else {
        throw new Error(response.message || '获取页面列表失败')
      }
    } catch (err: any) {
      console.error('Failed to load pages:', err)
      pagesState.value.error = err.message || '获取页面列表失败，请稍后重试'
    } finally {
      pagesState.value.loading = false
    }
  }

  const refreshPages = () => {
    cacheService.invalidatePages()
    return loadPages(true)
  }

  const addPage = (page: Page) => {
    pagesState.value.data.push(page)
    cacheService.setPages(pagesState.value.data)
  }

  const updatePage = (pageId: string, updates: Partial<Page>) => {
    const index = pagesState.value.data.findIndex(p => p.id === pageId)
    if (index !== -1) {
      pagesState.value.data[index] = { ...pagesState.value.data[index], ...updates }
      cacheService.setPages(pagesState.value.data)
    }
  }

  return {
    pages,
    loading,
    error,
    loadPages,
    refreshPages,
    addPage,
    updatePage
  }
}

export function useDomains() {
  const domains = computed(() => domainsState.value.data)
  const loading = computed(() => domainsState.value.loading)
  const error = computed(() => domainsState.value.error)

  const loadDomains = async (forceRefresh = false) => {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedDomains = cacheService.getDomains()
      if (cachedDomains) {
        domainsState.value.data = cachedDomains
        return
      }
    }

    // Avoid duplicate requests
    if (domainsState.value.loading) {
      return
    }

    try {
      domainsState.value.loading = true
      domainsState.value.error = null

      const response = await api.domains.list()

      if (response.success && response.data) {
        domainsState.value.data = response.data
        domainsState.value.lastFetch = Date.now()

        // Cache the data
        cacheService.setDomains(response.data)
      } else {
        throw new Error(response.message || '获取域名列表失败')
      }
    } catch (err: any) {
      console.error('Failed to load domains:', err)
      domainsState.value.error = err.message || '获取域名列表失败，请稍后重试'
    } finally {
      domainsState.value.loading = false
    }
  }

  const refreshDomains = () => {
    cacheService.invalidateDomains()
    return loadDomains(true)
  }

  const addDomain = (domain: Domain) => {
    domainsState.value.data.push(domain)
    cacheService.setDomains(domainsState.value.data)
  }

  const updateDomain = (domainId: string, updates: Partial<Domain>) => {
    const index = domainsState.value.data.findIndex(d => d.id === domainId)
    if (index !== -1) {
      domainsState.value.data[index] = { ...domainsState.value.data[index], ...updates }
      cacheService.setDomains(domainsState.value.data)
    }
  }

  return {
    domains,
    loading,
    error,
    loadDomains,
    refreshDomains,
    addDomain,
    updateDomain
  }
}