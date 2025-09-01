/**
 * Worker Tests - Basic tests for Workers entry point
 */

import { describe, it, expect, vi } from 'vitest'

// Mock the adapters
vi.mock('../adapters/workers-router.js', () => ({
  WorkersRouter: vi.fn().mockImplementation(() => ({
    route: vi.fn().mockResolvedValue(new Response('{"success": true}', { status: 200 })),
    handleCors: vi.fn().mockReturnValue(new Response(null, { status: 204 })),
    addCorsHeaders: vi.fn().mockImplementation((response) => response)
  }))
}))

describe('Worker Entry Point', () => {
  it('should handle basic request structure', async () => {
    // This is a basic structural test to ensure the worker can be imported
    // and has the expected shape
    const workerModule = await import('../../worker.js')

    expect(workerModule.default).toBeDefined()
    expect(typeof workerModule.default.fetch).toBe('function')
  })

  it('should handle CORS preflight requests', async () => {
    const workerModule = await import('../../worker.js')

    const request = new Request('https://example.com/api/test', {
      method: 'OPTIONS'
    })

    const env = {
      CLOUDFLARE_API_TOKEN: 'test-token',
      CLOUDFLARE_ACCOUNT_ID: 'test-account',
      CLOUDFLARE_EMAIL: 'test@example.com',
      CORS_ORIGINS: 'http://localhost:5173',
      NODE_ENV: 'test'
    }

    const ctx = {} as ExecutionContext

    const response = await workerModule.default.fetch(request, env, ctx)
    expect(response).toBeInstanceOf(Response)
  })

  it('should handle regular requests', async () => {
    const workerModule = await import('../../worker.js')

    const request = new Request('https://example.com/api/test', {
      method: 'GET'
    })

    const env = {
      CLOUDFLARE_API_TOKEN: 'test-token',
      CLOUDFLARE_ACCOUNT_ID: 'test-account',
      CLOUDFLARE_EMAIL: 'test@example.com',
      CORS_ORIGINS: 'http://localhost:5173',
      NODE_ENV: 'test'
    }

    const ctx = {} as ExecutionContext

    const response = await workerModule.default.fetch(request, env, ctx)
    expect(response).toBeInstanceOf(Response)
  })
})