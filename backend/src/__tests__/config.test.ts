import { describe, it, expect } from 'vitest'
import { config } from '../config/index.js'

describe('Config', () => {
  it('should have required configuration values', () => {
    expect(config.port).toBeDefined()
    expect(config.host).toBeDefined()
    expect(config.mongoUrl).toBeDefined()
    expect(config.cloudflareApiToken).toBeDefined()
    expect(config.cloudflareApiBaseUrl).toBeDefined()
  })

  it('should have correct default values', () => {
    expect(config.port).toBe(3000)
    expect(config.host).toBe('0.0.0.0')
    expect(config.cloudflareApiBaseUrl).toBe('https://api.cloudflare.com/client/v4')
  })
})