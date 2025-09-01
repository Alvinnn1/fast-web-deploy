import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DNSRecordEditor from '../DNSRecordEditor.vue'
import { useNotifications } from '../../utils/notifications'

// Mock the notifications utility
vi.mock('../../utils/notifications', () => ({
  useNotifications: vi.fn(() => ({
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }))
}))

describe('DNSRecordEditor Enhanced Error Handling', () => {
  let wrapper: any
  const mockNotifications = {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
      ; (useNotifications as any).mockReturnValue(mockNotifications)

    wrapper = mount(DNSRecordEditor, {
      props: {
        domainId: 'test-domain-id'
      }
    })
  })

  it('should show validation errors for invalid form data', async () => {
    // Set invalid data
    await wrapper.find('select[ref="firstInputRef"]').setValue('A')
    await wrapper.find('input[placeholder*="www"]').setValue('')
    await wrapper.find('input[placeholder*="192.0.2.1"]').setValue('invalid-ip')

    // Try to save
    await wrapper.find('button:contains("创建记录")').trigger('click')

    // Should show validation warning
    expect(mockNotifications.warning).toHaveBeenCalledWith(
      '表单验证失败',
      expect.objectContaining({
        message: expect.stringContaining('请修正'),
        autoHide: true
      })
    )
  })

  it('should validate IPv4 addresses correctly', async () => {
    await wrapper.find('select[ref="firstInputRef"]').setValue('A')
    await wrapper.find('input[placeholder*="www"]').setValue('test')

    // Test invalid IPv4
    await wrapper.find('input[placeholder*="192.0.2.1"]').setValue('999.999.999.999')

    // Trigger validation
    await wrapper.vm.validateForm()

    expect(wrapper.vm.validationErrors.content).toContain('IPv4地址的每个部分必须在0-255之间')
  })

  it('should validate CNAME records correctly', async () => {
    await wrapper.find('select[ref="firstInputRef"]').setValue('CNAME')
    await wrapper.find('input[placeholder*="www"]').setValue('test')

    // Test invalid CNAME
    await wrapper.find('input[placeholder*="example.com"]').setValue('invalid-domain')

    // Trigger validation
    await wrapper.vm.validateForm()

    expect(wrapper.vm.validationErrors.content).toContain('请输入有效的域名')
  })

  it('should validate MX records correctly', async () => {
    await wrapper.find('select[ref="firstInputRef"]').setValue('MX')
    await wrapper.find('input[placeholder*="www"]').setValue('test')

    // Test invalid MX priority
    await wrapper.find('input[placeholder*="10 mail.example.com"]').setValue('99999 mail.example.com')

    // Trigger validation
    await wrapper.vm.validateForm()

    expect(wrapper.vm.validationErrors.content).toContain('MX记录优先级必须在0-65535之间')
  })

  it('should disable form inputs when loading', async () => {
    await wrapper.setProps({ loading: true })

    expect(wrapper.find('select[ref="firstInputRef"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('input[placeholder*="www"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button:contains("创建记录")').attributes('disabled')).toBeDefined()
  })

  it('should show field-specific error messages', async () => {
    // Set form to have validation errors
    await wrapper.find('input[placeholder*="www"]').setValue('')
    await wrapper.find('input[placeholder*="192.0.2.1"]').setValue('')

    // Trigger validation
    await wrapper.vm.validateForm()

    // Should show validation summary
    expect(wrapper.text()).toContain('请修正以下错误')
    expect(wrapper.text()).toContain('记录名称: 记录名称不能为空')
    expect(wrapper.text()).toContain('记录内容: 记录内容不能为空')
  })
})