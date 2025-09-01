import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SSLCertificateManager from '../SSLCertificateManager.vue'
import type { SSLCertificate } from '@/types'

// Mock the API
const mockApi = {
  domains: {
    requestSSL: vi.fn()
  }
}

vi.mock('@/services/api', () => ({
  api: mockApi
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  Button: {
    name: 'Button',
    template: '<button @click="$emit(\'click\')" :disabled="disabled"><slot /></button>',
    props: ['variant', 'size', 'disabled'],
    emits: ['click']
  },
  LoadingSpinner: {
    name: 'LoadingSpinner',
    template: '<div class="loading-spinner">Loading...</div>',
    props: ['size']
  },
  Alert: {
    name: 'Alert',
    template: '<div class="alert"><slot /></div>',
    props: ['variant', 'title']
  },
  Card: {
    name: 'Card',
    template: '<div class="card"><div v-if="title" class="title">{{ title }}</div><slot /></div>',
    props: ['title']
  }
}))

describe('SSLCertificateManager', () => {
  const mockCertificate: SSLCertificate = {
    id: 'ssl1',
    status: 'active',
    issuer: 'Let\'s Encrypt',
    expiresAt: '2024-12-31T23:59:59Z'
  }

  const expiringSoonCertificate: SSLCertificate = {
    id: 'ssl2',
    status: 'active',
    issuer: 'Let\'s Encrypt',
    expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days from now
  }

  const expiredCertificate: SSLCertificate = {
    id: 'ssl3',
    status: 'expired',
    issuer: 'Let\'s Encrypt',
    expiresAt: '2023-12-31T23:59:59Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders no certificate state when certificate is not provided', () => {
    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1'
      }
    })

    expect(wrapper.text()).toContain('未配置SSL证书')
    expect(wrapper.text()).toContain('申请SSL证书')
    expect(wrapper.text()).toContain('SSL证书的好处')
  })

  it('renders certificate info when certificate is provided', () => {
    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1',
        certificate: mockCertificate
      }
    })

    expect(wrapper.text()).toContain('证书信息')
    expect(wrapper.text()).toContain('有效')
    expect(wrapper.text()).toContain('Let\'s Encrypt')
    expect(wrapper.text()).toContain('续期证书')
    expect(wrapper.text()).toContain('撤销证书')
  })

  it('shows expiry warning for certificates expiring soon', () => {
    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1',
        certificate: expiringSoonCertificate
      }
    })

    expect(wrapper.text()).toContain('证书将在')
    expect(wrapper.text()).toContain('天后过期')
  })

  it('shows expired warning for expired certificates', () => {
    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1',
        certificate: expiredCertificate
      }
    })

    expect(wrapper.text()).toContain('证书已过期')
    expect(wrapper.text()).toContain('请立即续期')
  })

  it('can request SSL certificate', async () => {
    mockApi.domains.requestSSL.mockResolvedValue({
      success: true,
      data: mockCertificate
    })

    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1'
      }
    })

    const requestButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('申请SSL证书')
    )

    if (requestButton) {
      await requestButton.trigger('click')
      await nextTick()

      expect(mockApi.domains.requestSSL).toHaveBeenCalledWith('1')
      expect(wrapper.emitted('certificateUpdated')).toBeTruthy()
      expect(wrapper.emitted('certificateUpdated')?.[0]).toEqual([mockCertificate])
    }
  })

  it('can renew SSL certificate', async () => {
    mockApi.domains.requestSSL.mockResolvedValue({
      success: true,
      data: mockCertificate
    })

    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1',
        certificate: mockCertificate
      }
    })

    const renewButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('续期证书')
    )

    if (renewButton) {
      await renewButton.trigger('click')
      await nextTick()

      expect(mockApi.domains.requestSSL).toHaveBeenCalledWith('1')
      expect(wrapper.emitted('certificateUpdated')).toBeTruthy()
    }
  })

  it('can revoke SSL certificate with confirmation', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1',
        certificate: mockCertificate
      }
    })

    const revokeButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('撤销证书')
    )

    if (revokeButton) {
      await revokeButton.trigger('click')
      await nextTick()

      expect(confirmSpy).toHaveBeenCalledWith('确定要撤销SSL证书吗？撤销后网站将无法通过HTTPS访问。')

      // Wait for the simulated revoke operation
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(wrapper.emitted('certificateUpdated')).toBeTruthy()
      expect(wrapper.emitted('certificateUpdated')?.[0]).toEqual([null])
    }

    confirmSpy.mockRestore()
  })

  it('does not revoke certificate when user cancels confirmation', async () => {
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1',
        certificate: mockCertificate
      }
    })

    const revokeButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('撤销证书')
    )

    if (revokeButton) {
      await revokeButton.trigger('click')
      await nextTick()

      expect(confirmSpy).toHaveBeenCalled()
      expect(wrapper.emitted('certificateUpdated')).toBeFalsy()
    }

    confirmSpy.mockRestore()
  })

  it('handles API errors when requesting certificate', async () => {
    mockApi.domains.requestSSL.mockRejectedValue(new Error('API Error'))

    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1'
      }
    })

    const requestButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('申请SSL证书')
    )

    if (requestButton) {
      await requestButton.trigger('click')
      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('API Error')
    }
  })

  it('shows success message after successful certificate request', async () => {
    mockApi.domains.requestSSL.mockResolvedValue({
      success: true,
      data: mockCertificate
    })

    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1'
      }
    })

    const requestButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('申请SSL证书')
    )

    if (requestButton) {
      await requestButton.trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('SSL证书申请成功')
    }
  })

  it('displays correct status badges for different certificate statuses', () => {
    const pendingCertificate = { ...mockCertificate, status: 'pending' as const }

    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1',
        certificate: pendingCertificate
      }
    })

    expect(wrapper.text()).toContain('申请中')
  })

  it('formats dates correctly', () => {
    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1',
        certificate: mockCertificate
      }
    })

    // Should contain formatted date (Chinese format)
    expect(wrapper.text()).toMatch(/2024年.*12月.*31日/)
  })

  it('shows loading state during operations', async () => {
    mockApi.domains.requestSSL.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockCertificate }), 100))
    )

    const wrapper = mount(SSLCertificateManager, {
      props: {
        domainId: '1'
      }
    })

    const requestButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('申请SSL证书')
    )

    if (requestButton) {
      await requestButton.trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('申请中...')
    }
  })
})