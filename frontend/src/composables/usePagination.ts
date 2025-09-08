import { ref, computed, reactive } from 'vue'
import type { Domain, Page } from '@/types'
import { api } from '@/services/api'

// Global state for domains pagination
const domainsGlobalState = reactive<PaginationState<Domain>>({
  data: [],
  loading: false,
  error: null,
  pagination: {
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    has_next_page: false,
    has_prev_page: false
  }
})

// Global state for pages pagination
const pagesGlobalState = reactive<PaginationState<Page>>({
  data: [],
  loading: false,
  error: null,
  pagination: {
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0,
    has_next_page: false,
    has_prev_page: false
  }
})

// Pagination state interface
interface PaginationState<T> {
  data: T[]
  loading: boolean
  error: string | null
  pagination: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
    has_next_page: boolean
    has_prev_page: boolean
  }
}

// Create a generic pagination composable
function createPaginationComposable<T>(
  fetchFunction: (page?: number, per_page?: number) => Promise<any>
) {
  const state = reactive<PaginationState<T>>({
    data: [],
    loading: false,
    error: null,
    pagination: {
      current_page: 1,
      per_page: 10,
      total: 0,
      total_pages: 0,
      has_next_page: false,
      has_prev_page: false
    }
  })

  const fetchData = async (page?: number, per_page?: number) => {
    try {
      state.loading = true
      state.error = null

      const currentPage = page || state.pagination.current_page
      const currentPerPage = per_page || state.pagination.per_page

      const response = await fetchFunction(currentPage, currentPerPage)

      if (response.success && response.data) {
        // Handle paginated response
        if (response.data.data && response.data.pagination) {
          state.data = response.data.data
          state.pagination = response.data.pagination
        } else {
          // Handle non-paginated response (fallback)
          state.data = Array.isArray(response.data) ? response.data : []
          state.pagination = {
            current_page: 1,
            per_page: state.data.length,
            total: state.data.length,
            total_pages: 1,
            has_next_page: false,
            has_prev_page: false
          }
        }
      } else {
        throw new Error(response.message || 'Failed to fetch data')
      }
    } catch (err: any) {
      console.error('Failed to fetch paginated data:', err)
      state.error = err.message || 'Failed to fetch data'
      state.data = []
    } finally {
      state.loading = false
    }
  }

  const goToPage = async (page: number) => {
    if (page < 1 || page > state.pagination.total_pages) {
      return
    }
    await fetchData(page)
  }


  const refresh = async () => {
    await fetchData(state.pagination.current_page, state.pagination.per_page)
  }

  const nextPage = async () => {
    if (state.pagination.has_next_page) {
      await goToPage(state.pagination.current_page + 1)
    }
  }

  const prevPage = async () => {
    if (state.pagination.has_prev_page) {
      await goToPage(state.pagination.current_page - 1)
    }
  }

  return {
    // State
    data: computed(() => state.data),
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    pagination: computed(() => state.pagination),

    // Actions
    fetchData,
    goToPage,
    refresh,
    nextPage,
    prevPage
  }
}

// Domains pagination composable
export function useDomainsPagination() {
  const fetchData = async (page?: number, per_page?: number) => {
    try {
      domainsGlobalState.loading = true
      domainsGlobalState.error = null

      const currentPage = page || domainsGlobalState.pagination.current_page
      const currentPerPage = per_page || domainsGlobalState.pagination.per_page

      const response = await api.domains.list(currentPage, currentPerPage)

      if (response.success && response.data) {
        // Handle paginated response
        if (response.data.data && response.data.pagination) {
          domainsGlobalState.data = response.data.data
          domainsGlobalState.pagination = response.data.pagination
        } else {
          // Handle non-paginated response (fallback)
          domainsGlobalState.data = Array.isArray(response.data) ? response.data : []
          domainsGlobalState.pagination = {
            current_page: 1,
            per_page: domainsGlobalState.data.length,
            total: domainsGlobalState.data.length,
            total_pages: 1,
            has_next_page: false,
            has_prev_page: false
          }
        }
      } else {
        throw new Error(response.message || 'Failed to fetch domains')
      }
    } catch (err: any) {
      console.error('Failed to fetch domains:', err)
      domainsGlobalState.error = err.message || 'Failed to fetch domains'
      domainsGlobalState.data = []
    } finally {
      domainsGlobalState.loading = false
    }
  }

  const goToPage = async (page: number) => {
    if (page < 1 || page > domainsGlobalState.pagination.total_pages) {
      return
    }
    await fetchData(page)
  }

  const refresh = async () => {
    await fetchData(domainsGlobalState.pagination.current_page, domainsGlobalState.pagination.per_page)
  }

  const nextPage = async () => {
    if (domainsGlobalState.pagination.has_next_page) {
      await goToPage(domainsGlobalState.pagination.current_page + 1)
    }
  }

  const prevPage = async () => {
    if (domainsGlobalState.pagination.has_prev_page) {
      await goToPage(domainsGlobalState.pagination.current_page - 1)
    }
  }

  return {
    // State
    data: computed(() => domainsGlobalState.data),
    loading: computed(() => domainsGlobalState.loading),
    error: computed(() => domainsGlobalState.error),
    pagination: computed(() => domainsGlobalState.pagination),

    // Actions
    fetchData,
    goToPage,
    refresh,
    nextPage,
    prevPage
  }
}

// Pages pagination composable
export function usePagesPagination() {
  const fetchData = async (page?: number, per_page?: number) => {
    try {
      pagesGlobalState.loading = true
      pagesGlobalState.error = null

      const currentPage = page || pagesGlobalState.pagination.current_page
      const currentPerPage = per_page || pagesGlobalState.pagination.per_page

      const response = await api.pages.list(currentPage, currentPerPage)

      if (response.success && response.data) {
        // Handle paginated response
        if (response.data.data && response.data.pagination) {
          pagesGlobalState.data = response.data.data
          pagesGlobalState.pagination = response.data.pagination
        } else {
          // Handle non-paginated response (fallback)
          pagesGlobalState.data = Array.isArray(response.data) ? response.data : []
          pagesGlobalState.pagination = {
            current_page: 1,
            per_page: pagesGlobalState.data.length,
            total: pagesGlobalState.data.length,
            total_pages: 1,
            has_next_page: false,
            has_prev_page: false
          }
        }
      } else {
        throw new Error(response.message || 'Failed to fetch pages')
      }
    } catch (err: any) {
      console.error('Failed to fetch pages:', err)
      pagesGlobalState.error = err.message || 'Failed to fetch pages'
      pagesGlobalState.data = []
    } finally {
      pagesGlobalState.loading = false
    }
  }

  const goToPage = async (page: number) => {
    if (page < 1 || page > pagesGlobalState.pagination.total_pages) {
      return
    }
    await fetchData(page)
  }

  const refresh = async () => {
    await fetchData(pagesGlobalState.pagination.current_page, pagesGlobalState.pagination.per_page)
  }

  const nextPage = async () => {
    if (pagesGlobalState.pagination.has_next_page) {
      await goToPage(pagesGlobalState.pagination.current_page + 1)
    }
  }

  const prevPage = async () => {
    if (pagesGlobalState.pagination.has_prev_page) {
      await goToPage(pagesGlobalState.pagination.current_page - 1)
    }
  }

  return {
    // State
    data: computed(() => pagesGlobalState.data),
    loading: computed(() => pagesGlobalState.loading),
    error: computed(() => pagesGlobalState.error),
    pagination: computed(() => pagesGlobalState.pagination),

    // Actions
    fetchData,
    goToPage,
    refresh,
    nextPage,
    prevPage
  }
}

// Generic pagination hook for any data type
export function usePagination<T>(
  fetchFunction: (page?: number, per_page?: number) => Promise<any>
) {
  return createPaginationComposable<T>(fetchFunction)
}
