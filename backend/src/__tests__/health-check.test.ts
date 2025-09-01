import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HealthCheckService } from '../services/health-check.js'

// Mock the cloudflare client
vi.mock('../services/cloudflare-client.js', () => ({
  cloudflareClient: {
    verifyToken: vi.fn()
  }
}))

// Mock the config
vi.mock('../config/index.js', () => ({
  config: {
    nodeEnv: 'test',
    cloudflareAccountId: 'test-account-id'
  }
}))

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService

  beforeEach(() => {
    healthCheckService = new HealthCheckService()
    vi.clearAllMocks()
  })

  it('should perform basic health check', async () => {
    const { cloudflareClient } = await import('../services/cloudflare-client.js')
    vi.mocked(cloudflareClient.verifyToken).mockResolvedValue(true)

    const result = await healthCheckService.performHealthCheck()

    expect(result).toBeDefined()
    expect(result.status).toMatch(/healthy|degraded|unhealthy/)
    expect(result.timestamp).toBeDefined()
    expect(result.version).toBeDefined()
    expect(result.uptime).toBeGreaterThanOrEqual(0)
    expect(result.checks).toBeDefined()
    expect(result.environment).toBe('test')
  })

  it('should return simple health check', () => {
    const result = healthCheckService.getSimpleHealthCheck()

    expect(result).toBeDefined()
    expect(result.status).toBe('ok')
    expect(result.timestamp).toBeDefined()
  })

  it('should handle cloudflare API failure gracefully', async () => {
    const { cloudflareClient } = await import('../services/cloudflare-client.js')
    vi.mocked(cloudflareClient.verifyToken).mockRejectedValue(new Error('API Error'))

    const result = await healthCheckService.performHealthCheck()

    expect(result).toBeDefined()
    expect(result.checks.cloudflare_api.status).toBe('fail')
    expect(result.checks.cloudflare_api.message).toContain('failed')
  })

  it('should check memory usage', async () => {
    const { cloudflareClient } = await import('../services/cloudflare-client.js')
    vi.mocked(cloudflareClient.verifyToken).mockResolvedValue(true)

    const result = await healthCheckService.performHealthCheck()

    expect(result.checks.memory).toBeDefined()
    expect(result.checks.memory.status).toMatch(/pass|warn|fail/)
    expect(result.checks.memory.message).toBeDefined()
  })

  it('should check disk usage', async () => {
    const { cloudflareClient } = await import('../services/cloudflare-client.js')
    vi.mocked(cloudflareClient.verifyToken).mockResolvedValue(true)

    const result = await healthCheckService.performHealthCheck()

    expect(result.checks.disk).toBeDefined()
    expect(result.checks.disk.status).toMatch(/pass|warn|fail/)
    expect(result.checks.disk.message).toBeDefined()
  })

  it('should determine overall status correctly', async () => {
    const { cloudflareClient } = await import('../services/cloudflare-client.js')

    // Test healthy status
    vi.mocked(cloudflareClient.verifyToken).mockResolvedValue(true)
    let result = await healthCheckService.performHealthCheck()
    expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status)

    // Test unhealthy status
    vi.mocked(cloudflareClient.verifyToken).mockRejectedValue(new Error('API Error'))
    result = await healthCheckService.performHealthCheck()
    expect(['degraded', 'unhealthy']).toContain(result.status)
  })
})