import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DNSRecordEditor from '../DNSRecordEditor.vue'
import type { CreateDNSRecordRequest } from '@/types'

// Mock UI components
vi.mock('@/components/ui', () => ({
  Button: { template: '<button><slot /></button>' },
  Input: {
    template: '<div><label v-if="label">{{ label }}</label><input v-model="modelValue" :placeholder="placeholder" :disabled="disabled" /></div>',
    props: ['modelValue', 'label', 'placeholder', 'error', 'disabled'],
    emits: ['update:modelValue']
  },
  Alert: {
    template: '<div class="alert"><h3>{{ title }}</h3><slot /></div>',
    props: ['variant', 'title']
  },
  LoadingSpinner: { template: '<div class="spinner"></div>' }
}))

describe('DNSRecordEditor', () => {
  const defaultProps = {
    domainId: 'test-domain-id'
  }

  it('renders correctly with default values', () => {
    const wrapper = mount(DNSRecordEditor, {
      props: defaultProps
    })

    expect(wrapper.find('h3').text()).toBe('添加新的 DNS 记录')
    expect(wrapper.find('select').element.value).toBe('A')
  })

  it('emits save event with form data when save is clicked', async () => {
    const wrapper = mount(DNSRecordEditor, {
      props: defaultProps
    })

    // Fill out the form
    await wrapper.find('select').setValue('A')
    await wrapper.find('input[placeholder="例如: www 或 @ (根域名)"]').setValue('www')
    await wrapper.find('input[placeholder="192.0.2.1"]').setValue('192.168.1.1')

    // Click save button
    await wrapper.find('button:last-child').trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    const saveEvent = wrapper.emitted('save')?.[0]?.[0] as CreateDNSRecordRequest
    expect(saveEvent).toEqual({
      type: 'A',
      name: 'www',
      content: '192.168.1.1',
      ttl: 1,
      proxied: false
    })
  })

  it('emits cancel event when cancel is clicked', async () => {
    const wrapper = mount(DNSRecordEditor, {
      props: defaultProps
    })

    await wrapper.find('button:first-child').trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('shows proxy toggle for A and AAAA records', async () => {
    const wrapper = mount(DNSRecordEditor, {
      props: defaultProps
    })

    // Should show proxy toggle for A record (default)
    expect(wrapper.find('#proxied-new').exists()).toBe(true)

    // Should show proxy toggle for AAAA record
    await wrapper.find('select').setValue('AAAA')
    expect(wrapper.find('#proxied-new').exists()).toBe(true)

    // Should not show proxy toggle for CNAME record
    await wrapper.find('select').setValue('CNAME')
    expect(wrapper.find('#proxied-new').exists()).toBe(false)
  })

  it('validates form fields correctly', async () => {
    const wrapper = mount(DNSRecordEditor, {
      props: defaultProps
    })

    // Try to save with empty fields
    await wrapper.find('button:last-child').trigger('click')

    // Should not emit save event due to validation
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('shows correct placeholder text based on record type', async () => {
    const wrapper = mount(DNSRecordEditor, {
      props: defaultProps
    })

    // A record
    await wrapper.find('select').setValue('A')
    expect(wrapper.find('input[placeholder="192.0.2.1"]').exists()).toBe(true)

    // CNAME record
    await wrapper.find('select').setValue('CNAME')
    expect(wrapper.find('input[placeholder="example.com"]').exists()).toBe(true)

    // MX record
    await wrapper.find('select').setValue('MX')
    expect(wrapper.find('input[placeholder="10 mail.example.com"]').exists()).toBe(true)
  })

  it('handles keyboard shortcuts correctly', async () => {
    const wrapper = mount(DNSRecordEditor, {
      props: defaultProps
    })

    // Fill out valid form data
    await wrapper.find('input[placeholder="例如: www 或 @ (根域名)"]').setValue('www')
    await wrapper.find('input[placeholder="192.0.2.1"]').setValue('192.168.1.1')

    // Test Enter key to save
    await wrapper.find('select').trigger('keydown.enter')
    expect(wrapper.emitted('save')).toBeTruthy()

    // Test Escape key to cancel
    await wrapper.find('select').trigger('keydown.escape')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('resets form when resetForm is called', async () => {
    const wrapper = mount(DNSRecordEditor, {
      props: defaultProps
    })

    // Fill out the form
    await wrapper.find('input[placeholder="例如: www 或 @ (根域名)"]').setValue('test')
    await wrapper.find('input[placeholder="192.0.2.1"]').setValue('1.2.3.4')

    // Call resetForm method
    await (wrapper.vm as any).resetForm()

    // Form should be reset to defaults
    expect(wrapper.find('select').element.value).toBe('A')
    expect(wrapper.find('input[placeholder="例如: www 或 @ (根域名)"]').element.value).toBe('')
    expect(wrapper.find('input[placeholder="192.0.2.1"]').element.value).toBe('')
  })
})