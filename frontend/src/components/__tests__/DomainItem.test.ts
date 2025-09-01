import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DomainItem from '../DomainItem.vue'
import type { Domain } from '@/types'

// Mock the UI components
vi.mock('@/components/ui', () => ({
  Card: {
    name: 'Card',
    template: '<div class="card"><slot /></div>',
    props: ['variant']
  }
}))

describe('DomainItem', () => {
  const mockDomain: Domain = {
    id: '1',
    name: 'example.com',
    status: 'active',
    nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com'],
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-01-01T00:00:00Z'
  }

  it('renders domain information correctly', () => {
    const wrapper = mount(DomainItem, {
      props: {
        domain: mockDomain
      }
    })

    expect(wrapper.text()).toContain('example.com')
    expect(wrapper.text()).toContain('活跃')
    expect(wrapper.text()).toContain('ns1.cloudflare.com')
    expect(wrapper.text()).toContain('ns2.cloudflare.com')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(DomainItem, {
      props: {
        domain: mockDomain
      }
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')?.[0]).toEqual([mockDomain])
  })

  it('displays correct status badge for different statuses', () => {
    const pendingDomain = { ...mockDomain, status: 'pending' as const }
    const wrapper = mount(DomainItem, {
      props: {
        domain: pendingDomain
      }
    })

    expect(wrapper.text()).toContain('待处理')
  })

  it('handles keyboard navigation', async () => {
    const wrapper = mount(DomainItem, {
      props: {
        domain: mockDomain
      }
    })

    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('click')).toBeTruthy()

    await wrapper.trigger('keydown.space')
    expect(wrapper.emitted('click')).toHaveLength(2)
  })

  it('truncates nameservers when more than 2', () => {
    const domainWithManyNS = {
      ...mockDomain,
      nameservers: ['ns1.cloudflare.com', 'ns2.cloudflare.com', 'ns3.cloudflare.com', 'ns4.cloudflare.com']
    }

    const wrapper = mount(DomainItem, {
      props: {
        domain: domainWithManyNS
      }
    })

    expect(wrapper.text()).toContain('+2 更多')
  })
})