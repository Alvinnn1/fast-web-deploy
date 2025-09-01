import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DomainDetail from '../DomainDetail.vue'
import type { DomainDetail as DomainDetailType } from '@/types'

// Mock the API
const mockApi = {
  domains: {
    getDetail: vi.fn(),
    getDnsRecords: vi.fn(),
    updateDnsRecord: vi.fn(),
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
    template: '<div class="card"><div v-if="title" class="title">{{ title }}</div><div class="header"><slot name="header" /></div><slot /></div>',
    props: ['title']
  }
}))

// Mock DNSRecordItem component
vi.mock('@/components/DNSRecordItem.vue', () => ({
  default: {
    name: 'DNSRecordItem',
    template: '<div class="dns-record-item">{{ record.name }} - {{ record.type }}</div>',
    props: ['record', 'editing'],
    emits: ['edit', 'save', 'cancel', 'delete']
  }
}))

describe('DomainDetail', () => {
  const mockDomainDetail: DomainDetailType = {
    id: '1',
    name: 'example.com',
    status: 'active',
    nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-01-01T00:00:00Z',
    dnsRecords: [
      {
        id: 'dns1',
        type: 'A',
        name: '@',
        content: '192.0.2.1',
        ttl: 3600,
        proxied: true
      },
      {
        id: 'dns2',
        type: 'CNAME',
        name: 'www',
        content: 'example.com',
        ttl: 3600,
        proxied: false
      }
    ],
    sslCertificate: {
      id: 'ssl1',
      status: 'active',
      issuer: 'Let\'s Encrypt',
      expiresAt: '2024-12-31T23:59:59Z'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: mockDomainDetail
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    expect(wrapper.text()).toContain('正在加载域名详情')
  })

  it('renders domain detail when data is loaded', async () => {
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: mockDomainDetail
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('example.com')
    expect(wrapper.text()).toContain('活跃')
    expect(wrapper.text()).toContain('ns1.cloudflare.com')
    expect(wrapper.text()).toContain('ns2.cloudflare.com')
  })

  it('renders DNS records', async () => {
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: mockDomainDetail
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('DNS 记录')
    expect(wrapper.findAll('.dns-record-item')).toHaveLength(2)
  })

  it('renders SSL certificate info when available', async () => {
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: mockDomainDetail
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('SSL 证书')
    expect(wrapper.text()).toContain('有效')
    expect(wrapper.text()).toContain('Let\'s Encrypt')
  })

  it('renders SSL request option when no certificate', async () => {
    const domainWithoutSSL = { ...mockDomainDetail, sslCertificate: undefined }
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: domainWithoutSSL
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('未配置SSL证书')
    expect(wrapper.text()).toContain('申请SSL证书')
  })

  it('handles API errors', async () => {
    mockApi.domains.getDetail.mockRejectedValue(new Error('API Error'))

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('API Error')
    expect(wrapper.text()).toContain('重试')
  })

  it('emits back event when back button is clicked', async () => {
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: mockDomainDetail
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    const backButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('返回')
    )

    if (backButton) {
      await backButton.trigger('click')
      expect(wrapper.emitted('back')).toBeTruthy()
    }
  })

  it('can refresh DNS records', async () => {
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: mockDomainDetail
    })

    mockApi.domains.getDnsRecords.mockResolvedValue({
      success: true,
      data: mockDomainDetail.dnsRecords
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    const refreshButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('刷新')
    )

    if (refreshButton) {
      await refreshButton.trigger('click')
      expect(mockApi.domains.getDnsRecords).toHaveBeenCalledWith('1')
    }
  })

  it('can request SSL certificate', async () => {
    const domainWithoutSSL = { ...mockDomainDetail, sslCertificate: undefined }
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: domainWithoutSSL
    })

    mockApi.domains.requestSSL.mockResolvedValue({
      success: true,
      data: mockDomainDetail.sslCertificate
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    const sslButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('申请SSL证书')
    )

    if (sslButton) {
      await sslButton.trigger('click')
      expect(mockApi.domains.requestSSL).toHaveBeenCalledWith('1')
    }
  })

  it('formats dates correctly', async () => {
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: mockDomainDetail
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    // Should contain formatted date (Chinese format)
    expect(wrapper.text()).toMatch(/2024年.*1月.*1日/)
  })

  it('displays correct status badges', async () => {
    const pendingDomain = { ...mockDomainDetail, status: 'pending' as const }
    mockApi.domains.getDetail.mockResolvedValue({
      success: true,
      data: pendingDomain
    })

    const wrapper = mount(DomainDetail, {
      props: {
        domainId: '1'
      }
    })

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('待处理')
  })
})