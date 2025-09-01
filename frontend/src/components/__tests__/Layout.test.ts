import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Layout from '../Layout.vue'
import Header from '../Header.vue'
import TabNavigation from '../TabNavigation.vue'

describe('Layout', () => {
  it('renders properly', () => {
    const wrapper = mount(Layout)
    expect(wrapper.exists()).toBe(true)
  })

  it('contains Header component', () => {
    const wrapper = mount(Layout)
    expect(wrapper.findComponent(Header).exists()).toBe(true)
  })

  it('contains TabNavigation component', () => {
    const wrapper = mount(Layout)
    expect(wrapper.findComponent(TabNavigation).exists()).toBe(true)
  })

  it('shows domains content by default', () => {
    const wrapper = mount(Layout)
    expect(wrapper.text()).toContain('域名管理')
    expect(wrapper.text()).toContain('新建域名')
  })

  it('switches to pages content when tab changes', async () => {
    const wrapper = mount(Layout)
    const tabNavigation = wrapper.findComponent(TabNavigation)

    // Emit tab change event
    await tabNavigation.vm.$emit('tabChange', 'pages')

    expect(wrapper.text()).toContain('页面管理')
    expect(wrapper.text()).toContain('新建页面')
  })
})