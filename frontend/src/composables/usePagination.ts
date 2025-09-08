import { ref, computed, reactive } from 'vue'
import type { Domain, Page } from '@/types'
import { api } from '@/services/api'

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
  return createPaginationComposable<Domain>(api.domains.list)
}

// Pages pagination composable
export function usePagesPagination() {
  return createPaginationComposable<Page>(api.pages.list)
}

// Generic pagination hook for any data type
export function usePagination<T>(
  fetchFunction: (page?: number, per_page?: number) => Promise<any>
) {
  return createPaginationComposable<T>(fetchFunction)
}
