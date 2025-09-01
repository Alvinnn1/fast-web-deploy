import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { domainsRoutes } from '../routes/domains.js'
import { pagesRoutes } from '../routes/pages.js'

describe('Integration Tests', () => {
  let fastify: any

  beforeEach(async () => {
    fastify = Fastify()
    await fastify.register(domainsRoutes)
    await fastify.register(pagesRoutes)
  })

  it('should register all domain routes', async () => {
    // Test that routes are registered by checking they return proper responses
    // even if they fail due to missing Cloudflare API token

    const routes = [
      { method: 'GET', url: '/api/domains' },
      { method: 'POST', url: '/api/domains' },
      { method: 'GET', url: '/api/domains/test-id' },
      { method: 'GET', url: '/api/domains/test-id/dns-records' },
      { method: 'PUT', url: '/api/domains/test-id/dns-records/record-id' },
      { method: 'POST', url: '/api/domains/test-id/ssl-certificate' }
    ]

    for (const route of routes) {
      const response = await fastify.inject({
        method: route.method,
        url: route.url,
        payload: route.method === 'POST' || route.method === 'PUT' ? {} : undefined
      })

      // Routes should be registered (not 404)
      expect(response.statusCode).not.toBe(404)

      // Should return JSON response
      expect(() => JSON.parse(response.body)).not.toThrow()

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('success')
    }
  })

  it('should validate domain creation input', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/domains',
      payload: {
        name: '' // Invalid empty name
      }
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
    expect(body.message).toContain('Domain name is required')
  })

  it('should validate domain name format', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/domains',
      payload: {
        name: 'invalid-domain' // Invalid format
      }
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
    expect(body.message).toContain('Invalid domain name format')
  })

  it('should validate DNS record update input', async () => {
    const response = await fastify.inject({
      method: 'PUT',
      url: '/api/domains/test-id/dns-records/record-id',
      payload: {
        type: 'INVALID', // Invalid DNS record type
        name: 'test.com',
        content: '192.168.1.1'
      }
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
    expect(body.message).toContain('Invalid DNS record type')
  })

  it('should register pages routes', async () => {
    const routes = [
      { method: 'GET', url: '/api/pages' },
      { method: 'POST', url: '/api/pages' },
      { method: 'POST', url: '/api/pages/test-id/deploy' },
      { method: 'GET', url: '/api/pages/test-id/deployment-status' }
    ]

    for (const route of routes) {
      const response = await fastify.inject({
        method: route.method,
        url: route.url,
        payload: route.method === 'POST' ? {} : undefined
      })

      // Route should be registered (not 404)
      expect(response.statusCode).not.toBe(404)

      // Should return JSON response
      expect(() => JSON.parse(response.body)).not.toThrow()

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('success')
    }
  })

  it('should validate page creation input', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/pages',
      payload: {
        name: '' // Invalid empty name
      }
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
    expect(body.message).toContain('Project name is required')
  })

  it('should validate page name format', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/pages',
      payload: {
        name: 'Invalid-Name-With-Uppercase' // Invalid format
      }
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(false)
    expect(body.message).toContain('lowercase letters, numbers, and hyphens')
  })
})