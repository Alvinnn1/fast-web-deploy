import type { Page, Domain } from '@/types'

interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>()
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000 // 5 minutes

  // Set cache with custom expiry time
  set<T>(key: string, data: T, expiry: number = this.DEFAULT_EXPIRY): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    })
  }

  // Get cache if not expired
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.expiry) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  // Check if cache exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null
  }

  // Clear specific cache
  clear(key: string): void {
    this.cache.delete(key)
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear()
  }

  // Clear expired cache items
  clearExpired(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.expiry) {
        this.cache.delete(key)
      }
    }
  }

  // Specific methods for common data types
  setPages(pages: Page[]): void {
    this.set('pages', pages, 3 * 60 * 1000) // 3 minutes for pages
  }

  getPages(): Page[] | null {
    return this.get<Page[]>('pages')
  }

  setDomains(domains: Domain[]): void {
    this.set('domains', domains, 5 * 60 * 1000) // 5 minutes for domains
  }

  getDomains(): Domain[] | null {
    return this.get<Domain[]>('domains')
  }

  // Invalidate related cache when data changes
  invalidatePages(): void {
    this.clear('pages')
  }

  invalidateDomains(): void {
    this.clear('domains')
  }
}

// Export singleton instance
export const cacheService = new CacheService()

// Auto cleanup expired cache every 10 minutes
setInterval(() => {
  cacheService.clearExpired()
}, 10 * 60 * 1000)