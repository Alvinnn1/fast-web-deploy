import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DomainList from '../DomainList.vue'
import type { Domain } from '@/types'

// Mock the API
const mockApi = {
  domains: {
    list: vi.fn()
  }
}

vi.mock('@/services/api', () => ({
  api: mockApi
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  Button: {
    name: 'Button',
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['variant', 'size', 'disabled'],
    emits: ['click']
  },
  LoadingSpinner: {
    name: 'LoadingSpinner',
    template: '<div class="loading-spinner">Loading...</div>'
  },
  Alert: {
    name: 'Alert',
    template: '<div class="alert"><slot /></div>',
    props: ['variant', 'title']
  }
}))

// Mock DomainItem component
vi.mock('@/components/DomainItem.vue', () => ({
  default: {
    name: 'DomainItem',
    template: '<div class="domain-item" @click="$emit(\'click\', domain)">{{ domain.name }}</div>',
    props: ['domain'],
    emits: ['click']
  }
}))

describe('DomainList', () => {
  const mockDomains: Domain[] = [
    {
      id: '1',
      name: 'example.com',
      status: 'active',
      nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'test.com',
      status: 'pending',
      nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
      createdAt: '2024-01-02T00:00:00Z',
      modifiedAt: '2024-01-02T00:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockApi.domains.list.mockResolvedValue({
      success: true,
      data: mockDomains
    })

    const wrapper = mount(DomainList)

    expect(wrapper.text()).toContain('正在加载域名列表')
  })

  it('renders domain list when data is loaded', async () => {
    mockApi.domains.list.mockResolvedValue({
      success: true,
      data: mockDomains
    })

    const wrapper = mount(DomainList)

    // Wait for the API call to complete
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('共 2 个域名')
    expect(wrapper.text()).toContain('example.com')
    expect(wrapper.text()).toContain('test.com')
  })

  it('renders empty state when no domains', async () => {
    mockApi.domains.list.mockResolvedValue({
      success: true,
      data: []
    })

    const wrapper = mount(DomainList)

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('暂无域名')
    expect(wrapper.text()).toContain('开始添加您的第一个域名')
  })

  it('renders error state when API fails', async () => {
    mockApi.domains.list.mockRejectedValue(new Error('API Error'))

    const wrapper = mount(DomainList)

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('API Error')
    expect(wrapper.text()).toContain('重试')
  })

  it('emits addDomain event when add button is clicked', async () => {
    mockApi.domains.list.mockResolvedValue({
      success: true,
      data: []
    })

    const wrapper = mount(DomainList)

    await nextTick()
    await nextTick()

    const addButton = wrapper.find('button')
    await addButton.trigger('click')

    expect(wrapper.emitted('addDomain')).toBeTruthy()
  })

  it('emits domainClick event when domain item is clicked', async () => {
    mockApi.domains.list.mockResolvedValue({
      success: true,
      data: mockDomains
    })

    const wrapper = mount(DomainList)

    await nextTick()
    await nextTick()

    const domainItem = wrapper.find('.domain-item')
    await domainItem.trigger('click')

    expect(wrapper.emitted('domainClick')).toBeTruthy()
    expect(wrapper.emitted('domainClick')?.[0]).toEqual([mockDomains[0]])
  })

  it('can refresh domain list', async () => {
    mockApi.domains.list.mockResolvedValue({
      success: true,
      data: mockDomains
    })

    const wrapper = mount(DomainList)

    await nextTick()
    await nextTick()

    // Find and click refresh button
    const refreshButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('刷新')
    )

    if (refreshButton) {
      await refreshButton.trigger('click')
      expect(mockApi.domains.list).toHaveBeenCalledTimes(2)
    }
  })
})