import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DomainDetail from '../DomainDetail.vue'
import { api } from '../../services/api'
import { useNotifications } from '../../utils/notifications'

// Mock dependencies
vi.mock('../../services/api')
vi.mock('../../utils/notifications', () => ({
  useNotifications: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }))
}))

describe('DomainDetail Enhanced Error Handling', () => {
  let wrapper: any
  const mockNotifications = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
      ; (useNotifications as any).mockReturnValue(mockNotifications)

      // Mock successful domain detail fetch
      ; (api.domains.getDetail as any).mockResolvedValue({
        success: true,
        data: {
          id: 'test-domain',
          name: 'example.com',
          status: 'active',
          createdAt: '2023-01-01T00:00:00Z',
          modifiedAt: '2023-01-01T00:00:00Z',
          nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
          dnsRecords: []
        }
      })

    wrapper = mount(DomainDetail, {
      props: {
        domainId: 'test-domain'
      }
    })
  })

  it('should show success notification when DNS record is created', async () => {
    // Mock successful DNS record creation
    ; (api.domains.createDnsRecord as any).mockResolvedValue({
      success: true,
      data: {
        id: 'new-record',
        type: 'A',
        name: 'test',
        content: '192.0.2.1',
        ttl: 300,
        proxied: false
      }
    })

    const recordData = {
      type: 'A',
      name: 'test',
      content: '192.0.2.1',
      ttl: 300,
      proxied: false
    }

    await wrapper.vm.handleSaveNewRecord(recordData)

    expect(mockNotifications.success).toHaveBeenCalledWith(
      'DNS记录创建成功',
      expect.objectContaining({
        message: "A 记录 'test' 已成功创建",
        autoHide: true,
        autoHideDelay: 4000
      })
    )
  })

  it('should show error notification when DNS record creation fails', async () => {
    // Mock failed DNS record creation
    ; (api.domains.createDnsRecord as any).mockRejectedValue({
      success: false,
      message: '记录已存在',
      error: { code: 'CONFLICT_ERROR' }
    })

    const recordData = {
      type: 'A',
      name: 'test',
      content: '192.0.2.1',
      ttl: 300,
      proxied: false
    }

    try {
      await wrapper.vm.handleSaveNewRecord(recordData)
    } catch (error) {
      // Expected to throw
    }

    expect(mockNotifications.error).toHaveBeenCalled()
  })

  it('should show success notification when DNS record is deleted', async () => {
    // Set up a record to delete
    wrapper.vm.recordToDelete = {
      id: 'test-record',
      type: 'A',
      name: 'test',
      content: '192.0.2.1'
    }
    wrapper.vm.deletingRecordId = 'test-record'

      // Mock successful deletion
      ; (api.domains.deleteDnsRecord as any).mockResolvedValue({
        success: true
      })

    await wrapper.vm.confirmDeleteRecord()

    expect(mockNotifications.success).toHaveBeenCalledWith(
      'DNS记录删除成功',
      expect.objectContaining({
        message: "A 记录 'test' 已成功删除",
        autoHide: true,
        autoHideDelay: 4000
      })
    )
  })

  it('should handle different error types for DNS record creation', async () => {
    const testCases = [
      {
        error: { message: 'already exists' },
        expectedMessage: '该DNS记录已存在，请检查记录名称和类型'
      },
      {
        error: { message: 'invalid format' },
        expectedMessage: '输入的DNS记录信息无效，请检查格式'
      },
      {
        error: { message: 'rate limit exceeded' },
        expectedMessage: '操作过于频繁，请稍后重试'
      },
      {
        error: { message: 'network timeout' },
        expectedMessage: '网络连接超时，请检查网络后重试'
      }
    ]

    for (const testCase of testCases) {
      vi.clearAllMocks()
        ; (api.domains.createDnsRecord as any).mockRejectedValue(testCase.error)

      const recordData = {
        type: 'A',
        name: 'test',
        content: '192.0.2.1',
        ttl: 300,
        proxied: false
      }

      try {
        await wrapper.vm.handleSaveNewRecord(recordData)
      } catch (error) {
        expect(error.message).toBe(testCase.expectedMessage)
      }
    }
  })

  it('should show success notification when copying to clipboard', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })

    await wrapper.vm.copyToClipboard('test-text')

    expect(mockNotifications.success).toHaveBeenCalledWith(
      '复制成功',
      expect.objectContaining({
        message: '已复制到剪贴板',
        autoHide: true,
        autoHideDelay: 2000
      })
    )
  })

  it('should show error notification when clipboard copy fails', async () => {
    // Mock clipboard API failure
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard not available'))
      }
    })

    await wrapper.vm.copyToClipboard('test-text')

    expect(mockNotifications.error).toHaveBeenCalledWith('复制失败，请手动复制')
  })
})