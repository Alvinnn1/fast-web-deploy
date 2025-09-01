import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Layout from '../Layout.vue'

describe('Layout Integration', () => {
  it('provides complete navigation and content switching functionality', async () => {
    const wrapper = mount(Layout)

    // Verify initial state - domains tab active
    expect(wrapper.text()).toContain('Cloudflare Static Deployer')
    expect(wrapper.text()).toContain('域名管理')
    expect(wrapper.text()).toContain('新建域名')

    // Find and click pages tab
    const buttons = wrapper.findAll('button')
    const pagesTabButton = buttons.find(button => button.text() === '页面列表')
    expect(pagesTabButton).toBeTruthy()

    await pagesTabButton?.trigger('click')

    // Verify pages content is now shown
    expect(wrapper.text()).toContain('页面管理')
    expect(wrapper.text()).toContain('新建页面')
    expect(wrapper.text()).not.toContain('域名管理')

    // Switch back to domains
    const domainsTabButton = buttons.find(button => button.text() === '域名列表')
    await domainsTabButton?.trigger('click')

    // Verify domains content is shown again
    expect(wrapper.text()).toContain('域名管理')
    expect(wrapper.text()).toContain('新建域名')
    expect(wrapper.text()).not.toContain('页面管理')
  })

  it('maintains proper styling and purple theme', () => {
    const wrapper = mount(Layout)

    // Check for purple theme classes
    const buttons = wrapper.findAll('button')
    const newDomainButton = buttons.find(button => button.text() === '新建域名')

    expect(newDomainButton?.classes()).toContain('bg-primary-600')
    expect(newDomainButton?.classes()).toContain('hover:bg-primary-700')
  })
})