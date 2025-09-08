// Pagination utilities for API responses

export interface PaginationParams {
  page: number
  per_page: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
    has_next_page: boolean
    has_prev_page: boolean
  }
}

export class PaginationHelper {
  /**
   * Parse pagination parameters from URL search params
   */
  static parseParams(searchParams: URLSearchParams): PaginationParams {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const per_page = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '10', 10)))

    return { page, per_page }
  }

  /**
   * Apply pagination to an array of data
   */
  static paginate<T>(data: T[], params: PaginationParams): PaginatedResponse<T> {
    const { page, per_page } = params
    const total = data.length
    const total_pages = Math.ceil(total / per_page)
    const start_index = (page - 1) * per_page
    const end_index = start_index + per_page

    const paginated_data = data.slice(start_index, end_index)

    return {
      data: paginated_data,
      pagination: {
        current_page: page,
        per_page,
        total,
        total_pages,
        has_next_page: page < total_pages,
        has_prev_page: page > 1
      }
    }
  }

  /**
   * Validate pagination parameters
   */
  static validateParams(params: PaginationParams): { valid: boolean; error?: string } {
    const { page, per_page } = params

    if (page < 1) {
      return { valid: false, error: 'Page must be greater than 0' }
    }

    if (per_page < 1) {
      return { valid: false, error: 'Per page must be greater than 0' }
    }

    if (per_page > 100) {
      return { valid: false, error: 'Per page cannot exceed 100' }
    }

    return { valid: true }
  }
}
