import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AddDomainModal from '../AddDomainModal.vue'

// Mock the API
const mockApi = {
  domains: {
    create: vi.fn()
  }
}

vi.mock('@/services/api', () => ({
  api: mockApi
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  Modal: {
    name: 'Modal',
    template: '<div class="modal" v-if="open"><slot /><div class="footer"><slot name="footer" /></div></div>',
    props: ['open', 'title', 'size'],
    emits: ['close']
  },
  Input: {
    name: 'Input',
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" />',
    props: ['id', 'modelValue', 'label', 'placeholder', 'error', 'disabled'],
    emits: ['update:modelValue', 'blur']
  },
  Button: {
    name: 'Button',
    template: '<button @click="$emit(\'click\')" :disabled="disabled"><slot /></button>',
    props: ['variant', 'size', 'disabled'],
    emits: ['click']
  },
  Alert: {
    name: 'Alert',
    template: '<div class="alert"><slot /></div>',
    props: ['variant', 'title']
  },
  LoadingSpinner: {
    name: 'LoadingSpinner',
    template: '<div class="loading">Loading...</div>',
    props: ['size']
  }
}))

describe('AddDomainModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when isOpen is true', () => {
    const wrapper = mount(AddDomainModal, {
      props: {
        isOpen: true
      }
    })

    expect(wrapper.find('.modal').exists()).toBe(true)
    expect(wrapper.text()).toContain('域名地址')
    expect(wrapper.text()).toContain('Nameservers')
  })

  it('does not render when isOpen is false', () => {
    const wrapper = mount(AddDomainModal, {
      props: {
        isOpen: false
      }
    })

    expect(wrapper.find('.modal').exists()).toBe(false)
  })

  it('validates domain name input', async () => {
    const wrapper = mount(AddDomainModal, {
      props: {
        isOpen: true
      }
    })

    const domainInput = wrapper.find('input')

    // Test empty domain
    await domainInput.setValue('')
    await domainInput.trigger('blur')
    await nextTick()

    expect(wrapper.text()).toContain('请输入域名地址')

    // Test invalid domain
    await domainInput.setValue('invalid-domain')
    await domainInput.trigger('blur')
    await nextTick()

    expect(wrapper.text()).toContain('请输入有效的域名格式')

    // Test valid domain
    await domainInput.setValue('example.com')
    await domainInput.trigger('blur')
    await nextTick()

    expect(wrapper.text()).not.toContain('请输入有效的域名格式')
  })

  it('allows adding nameservers', async () => {
    const wrapper = mount(AddDomainModal, {
      props: {
        isOpen: true
      }
    })

    const addButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('添加 Nameserver')
    )

    expect(addButton).toBeTruthy()

    if (addButton) {
      await addButton.trigger('click')
      await nextTick()

      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBeGreaterThan(3) // domain + 2 initial nameservers + 1 new
    }
  })

  it('submits form with valid data', async () => {
    mockApi.domains.create.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'example.com' }
    })

    const wrapper = mount(AddDomainModal, {
      props: {
        isOpen: true
      }
    })

    // Fill in domain name
    const domainInput = wrapper.find('input')
    await domainInput.setValue('example.com')

    // Submit form
    const submitButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('添加域名')
    )

    if (submitButton) {
      await submitButton.trigger('click')
      await nextTick()

      expect(mockApi.domains.create).toHaveBeenCalledWith({
        name: 'example.com'
      })
    }
  })

  it('submits form with nameservers', async () => {
    mockApi.domains.create.mockResolvedValue({
      success: true,
      data: { id: '1', name: 'example.com' }
    })

    const wrapper = mount(AddDomainModal, {
      props: {
        isOpen: true
      }
    })

    // Fill in domain name
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('example.com')

    // Fill in nameservers
    if (inputs[1]) await inputs[1].setValue('ns1.example.com')
    if (inputs[2]) await inputs[2].setValue('ns2.example.com')

    // Submit form
    const submitButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('添加域名')
    )

    if (submitButton) {
      await submitButton.trigger('click')
      await nextTick()

      expect(mockApi.domains.create).toHaveBeenCalledWith({
        name: 'example.com',
        nameservers: ['ns1.example.com', 'ns2.example.com']
      })
    }
  })

  it('handles API errors', async () => {
    mockApi.domains.create.mockRejectedValue(new Error('API Error'))

    const wrapper = mount(AddDomainModal, {
      props: {
        isOpen: true
      }
    })

    // Fill in domain name
    const domainInput = wrapper.find('input')
    await domainInput.setValue('example.com')

    // Submit form
    const submitButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('添加域名')
    )

    if (submitButton) {
      await submitButton.trigger('click')
      await nextTick()
      await nextTick()

      expect(wrapper.text()).toContain('API Error')
    }
  })

  it('emits close event', async () => {
    const wrapper = mount(AddDomainModal, {
      props: {
        isOpen: true
      }
    })

    const cancelButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('取消')
    )

    if (cancelButton) {
      await cancelButton.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    }
  })

  it('emits success event after successful submission', async () => {
    const mockDomain = { id: '1', name: 'example.com' }
    mockApi.domains.create.mockResolvedValue({
      success: true,
      data: mockDomain
    })

    const wrapper = mount(AddDomainModal, {
      props: {
        isOpen: true
      }
    })

    // Fill in domain name
    const domainInput = wrapper.find('input')
    await domainInput.setValue('example.com')

    // Submit form
    const submitButton = wrapper.findAll('button').find(btn =>
      btn.text().includes('添加域名')
    )

    if (submitButton) {
      await submitButton.trigger('click')
      await nextTick()

      // Wait for success timeout
      await new Promise(resolve => setTimeout(resolve, 1600))

      expect(wrapper.emitted('success')).toBeTruthy()
      expect(wrapper.emitted('success')?.[0]).toEqual([mockDomain])
    }
  })
})