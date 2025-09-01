import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../../ui/Button.vue'

describe('Button', () => {
  it('renders with default props', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me'
      }
    })

    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.classes()).toContain('bg-purple-600')
  })

  it('applies correct variant classes', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'outline'
      },
      slots: {
        default: 'Outline Button'
      }
    })

    expect(wrapper.classes()).toContain('border-purple-300')
    expect(wrapper.classes()).toContain('text-purple-700')
  })

  it('emits click event', async () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me'
      }
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true
      },
      slots: {
        default: 'Disabled Button'
      }
    })

    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('disabled:opacity-50')
  })
})