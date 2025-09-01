import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabNavigation from '../TabNavigation.vue'

describe('TabNavigation', () => {
  it('renders properly', () => {
    const wrapper = mount(TabNavigation)
    expect(wrapper.exists()).toBe(true)
  })

  it('displays both tab options', () => {
    const wrapper = mount(TabNavigation)
    expect(wrapper.text()).toContain('域名列表')
    expect(wrapper.text()).toContain('页面列表')
  })

  it('has domains tab active by default', () => {
    const wrapper = mount(TabNavigation)
    const buttons = wrapper.findAll('button')
    const domainsButton = buttons.find(button => button.text() === '域名列表')
    expect(domainsButton?.classes()).toContain('border-primary-500')
    expect(domainsButton?.classes()).toContain('text-primary-600')
  })

  it('emits tabChange event when tab is clicked', async () => {
    const wrapper = mount(TabNavigation)
    const buttons = wrapper.findAll('button')
    const pagesButton = buttons.find(button => button.text() === '页面列表')

    await pagesButton?.trigger('click')

    expect(wrapper.emitted('tabChange')).toBeTruthy()
    expect(wrapper.emitted('tabChange')?.[0]).toEqual(['pages'])
  })

  it('updates active tab when clicked', async () => {
    const wrapper = mount(TabNavigation)
    const buttons = wrapper.findAll('button')
    const pagesButton = buttons.find(button => button.text() === '页面列表')

    await pagesButton?.trigger('click')

    expect(pagesButton?.classes()).toContain('border-primary-500')
    expect(pagesButton?.classes()).toContain('text-primary-600')
  })
})