import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PagesList from '../PagesList.vue'
import type { Page, DeploymentStatusDetail } from '@/types'

// Mock the composables
vi.mock('@/composables/useDataCache', () => ({
  usePages: () => ({
    pages: { value: [] },
    loading: { value: false },
    error: { value: null },
    loadPages: vi.fn(),
    refreshPages: vi.fn(),
    addPage: vi.fn(),
    updatePage: vi.fn()
  })
}))

vi.mock('@/composables/useTabState', () => ({
  useTabState: () => ({
    markTabInitialized: vi.fn(),
    isTabInitialized: vi.fn(() => false)
  })
}))

describe('PagesList Status Update', () => {
  let wrapper: any
  let mockUpdatePage: any

  beforeEach(() => {
    mockUpdatePage = vi.fn()

    // Mock the usePages composable with our mock function
    vi.doMock('@/composables/useDataCache', () => ({
      usePages: () => ({
        pages: { value: [] },
        loading: { value: false },
        error: { value: null },
        loadPages: vi.fn(),
        refreshPages: vi.fn(),
        addPage: vi.fn(),
        updatePage: mockUpdatePage
      })
    }))

    wrapper = mount(PagesList)
  })

  it('should handle status updates correctly', () => {
    const statusUpdate = {
      pageId: 'test-page-id',
      status: {
        status: 'success',
        url: 'https://example.com',
        deploymentId: 'deployment-123'
      }
    }

    // Call the handleStatusUpdate method
    wrapper.vm.handleStatusUpdate(statusUpdate)

    // Verify that updatePage was called with correct parameters
    expect(mockUpdatePage).toHaveBeenCalledWith('test-page-id', {
      status: 'deployed',
      url: 'https://example.com',
      lastDeployedAt: expect.any(String),
      deploymentId: 'deployment-123'
    })
  })

  it('should map deployment status to page status correctly', () => {
    const testCases = [
      { deploymentStatus: 'queued', expectedPageStatus: 'deploying' },
      { deploymentStatus: 'building', expectedPageStatus: 'deploying' },
      { deploymentStatus: 'deploying', expectedPageStatus: 'deploying' },
      { deploymentStatus: 'success', expectedPageStatus: 'deployed' },
      { deploymentStatus: 'failure', expectedPageStatus: 'failed' },
      { deploymentStatus: 'unknown', expectedPageStatus: 'created' }
    ]

    testCases.forEach(({ deploymentStatus, expectedPageStatus }) => {
      const statusUpdate = {
        pageId: 'test-page-id',
        status: { status: deploymentStatus }
      }

      wrapper.vm.handleStatusUpdate(statusUpdate)

      expect(mockUpdatePage).toHaveBeenCalledWith('test-page-id',
        expect.objectContaining({ status: expectedPageStatus })
      )
    })
  })

  it('should expose handleStatusUpdate method', () => {
    expect(wrapper.vm.handleStatusUpdate).toBeDefined()
    expect(typeof wrapper.vm.handleStatusUpdate).toBe('function')
  })

  it('should expose refreshPageData method', () => {
    expect(wrapper.vm.refreshPageData).toBeDefined()
    expect(typeof wrapper.vm.refreshPageData).toBe('function')
  })
})