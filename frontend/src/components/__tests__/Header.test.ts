import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Header from '../Header.vue'

describe('Header', () => {
  it('renders properly', () => {
    const wrapper = mount(Header)
    expect(wrapper.exists()).toBe(true)
  })

  it('displays the application title', () => {
    const wrapper = mount(Header)
    expect(wrapper.text()).toContain('Cloudflare Static Deployer')
  })

  it('has proper header structure', () => {
    const wrapper = mount(Header)
    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(true)
  })
})