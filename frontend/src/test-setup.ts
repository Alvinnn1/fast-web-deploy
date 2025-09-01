// Test setup file for Vitest
import { vi } from 'vitest'

// Mock environment variables for tests
vi.mock('import.meta.env', () => ({
  VITE_API_BASE_URL: 'http://localhost:3000',
  VITE_APP_TITLE: 'Test App',
  VITE_APP_VERSION: '1.0.0-test',
  VITE_ENABLE_DEBUG: true,
  VITE_ENABLE_ANALYTICS: false,
  MODE: 'test',
  DEV: false,
  PROD: false,
  SSR: false
}))

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock fetch for API tests
global.fetch = vi.fn()

// Setup DOM globals
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})