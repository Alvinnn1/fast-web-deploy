# Developer Guide

This guide provides comprehensive information for developers working on the Cloudflare Static Deployer project.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Architecture](#project-architecture)
3. [Code Style and Standards](#code-style-and-standards)
4. [Testing Strategy](#testing-strategy)
5. [API Development](#api-development)
6. [Frontend Development](#frontend-development)
7. [Database and State Management](#database-and-state-management)
8. [Error Handling](#error-handling)
9. [Performance Considerations](#performance-considerations)
10. [Security Guidelines](#security-guidelines)
11. [Deployment and CI/CD](#deployment-and-cicd)
12. [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Git**: Latest version
- **VS Code**: Recommended IDE with extensions
- **Wrangler CLI**: For Cloudflare Workers development

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "vue.volar",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-json"
  ]
}
```

### Environment Setup

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd cloudflare-static-deployer
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   
   # Edit backend/.env with your settings
   nano backend/.env
   ```

3. **Start Development Servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually
   npm run dev:frontend  # Port 5173
   npm run dev:backend   # Port 3000
   ```

### Development Workflow

1. **Feature Development**
   ```bash
   # Create feature branch
   git checkout -b feature/your-feature-name
   
   # Make changes and test
   npm run lint
   npm run test
   
   # Commit changes
   git add .
   git commit -m "feat: add your feature description"
   
   # Push and create PR
   git push origin feature/your-feature-name
   ```

2. **Code Quality Checks**
   ```bash
   # Run all quality checks
   npm run lint          # ESLint
   npm run test          # Unit tests
   npm run type-check    # TypeScript checking
   ```

## Project Architecture

### Overall Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Cloudflare     │
│   (Vue 3)       │◄──►│   (Fastify)     │◄──►│     API         │
│                 │    │                 │    │                 │
│ - Components    │    │ - Routes        │    │ - Zones API     │
│ - Services      │    │ - Services      │    │ - DNS API       │
│ - State Mgmt    │    │ - Middleware    │    │ - Pages API     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Frontend Architecture

```
src/
├── components/          # Reusable Vue components
│   ├── ui/             # Base UI components
│   └── __tests__/      # Component tests
├── views/              # Page-level components
├── services/           # API clients and external services
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and helpers
├── router/             # Vue Router configuration
└── main.ts             # Application entry point
```

### Backend Architecture

```
src/
├── routes/             # API route handlers
├── services/           # Business logic and external API clients
├── middleware/         # Fastify middleware
├── utils/              # Utility functions
├── config/             # Configuration management
├── types.ts            # TypeScript type definitions
└── index.ts            # Application entry point
```

### Data Flow

1. **User Interaction** → Frontend Component
2. **Component** → API Service Call
3. **API Service** → Backend Route Handler
4. **Route Handler** → Business Logic Service
5. **Service** → Cloudflare API
6. **Response** ← Cloudflare API
7. **Processed Response** ← Service
8. **API Response** ← Route Handler
9. **UI Update** ← Frontend Component

## Code Style and Standards

### TypeScript Configuration

Both frontend and backend use strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### ESLint Configuration

Consistent linting rules across the project:

```javascript
// .eslintrc.cjs
module.exports = {
  extends: [
    '@vue/eslint-config-typescript',
    'eslint:recommended'
  ],
  rules: {
    'no-console': 'warn',
    'no-debugger': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'vue/multi-word-component-names': 'off'
  }
}
```

### Naming Conventions

- **Files**: kebab-case (`user-profile.vue`, `api-client.ts`)
- **Components**: PascalCase (`UserProfile`, `ApiClient`)
- **Variables/Functions**: camelCase (`userName`, `getUserData`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`User`, `ApiResponse`)

### Code Organization

#### Component Structure
```vue
<template>
  <!-- Template content -->
</template>

<script setup lang="ts">
// Imports
import { ref, computed, onMounted } from 'vue'
import type { User } from '@/types'

// Props and emits
interface Props {
  userId: string
}
const props = defineProps<Props>()

// Reactive state
const user = ref<User | null>(null)
const loading = ref(false)

// Computed properties
const displayName = computed(() => 
  user.value ? `${user.value.firstName} ${user.value.lastName}` : ''
)

// Methods
const fetchUser = async () => {
  // Implementation
}

// Lifecycle
onMounted(() => {
  fetchUser()
})
</script>

<style scoped>
/* Component-specific styles */
</style>
```

#### Service Structure
```typescript
// services/user-service.ts
import type { User, CreateUserRequest } from '@/types'
import { ApiClient } from './api-client'

export class UserService {
  constructor(private apiClient: ApiClient) {}

  async getUser(id: string): Promise<User> {
    const response = await this.apiClient.get(`/users/${id}`)
    return response.data
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await this.apiClient.post('/users', userData)
    return response.data
  }
}
```

## Testing Strategy

### Frontend Testing

#### Unit Tests (Vitest + Vue Test Utils)
```typescript
// components/__tests__/UserProfile.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UserProfile from '../UserProfile.vue'

describe('UserProfile', () => {
  it('displays user name correctly', () => {
    const wrapper = mount(UserProfile, {
      props: {
        user: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe'
        }
      }
    })

    expect(wrapper.text()).toContain('John Doe')
  })

  it('emits update event when form is submitted', async () => {
    const wrapper = mount(UserProfile, {
      props: { user: mockUser }
    })

    await wrapper.find('form').trigger('submit')
    
    expect(wrapper.emitted('update')).toBeTruthy()
  })
})
```

#### Integration Tests
```typescript
// services/__tests__/api.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApiClient } from '../api'

// Mock axios
vi.mock('axios')

describe('ApiClient', () => {
  let apiClient: ApiClient

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:3000')
  })

  it('should fetch domains successfully', async () => {
    const mockDomains = [{ id: '1', name: 'example.com' }]
    vi.mocked(axios.get).mockResolvedValue({ data: { data: mockDomains } })

    const domains = await apiClient.getDomains()
    
    expect(domains).toEqual(mockDomains)
    expect(axios.get).toHaveBeenCalledWith('/api/domains')
  })
})
```

### Backend Testing

#### API Route Tests
```typescript
// routes/__tests__/domains.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { domainsRoutes } from '../domains'

describe('Domains Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify()
    await app.register(domainsRoutes)
  })

  it('GET /api/domains returns domain list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/domains'
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveProperty('success', true)
    expect(response.json()).toHaveProperty('data')
  })

  it('POST /api/domains creates new domain', async () => {
    const domainData = {
      name: 'test.com',
      nameservers: ['ns1.cloudflare.com']
    }

    const response = await app.inject({
      method: 'POST',
      url: '/api/domains',
      payload: domainData
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().data).toHaveProperty('name', 'test.com')
  })
})
```

#### Service Tests
```typescript
// services/__tests__/cloudflare-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloudflareClient } from '../cloudflare-client'

// Mock axios
vi.mock('axios')

describe('CloudflareClient', () => {
  let client: CloudflareClient

  beforeEach(() => {
    client = new CloudflareClient('fake-token')
  })

  it('should list zones successfully', async () => {
    const mockResponse = {
      data: {
        success: true,
        result: [{ id: 'zone1', name: 'example.com' }]
      }
    }
    vi.mocked(axios.get).mockResolvedValue(mockResponse)

    const zones = await client.listZones()
    
    expect(zones).toHaveLength(1)
    expect(zones[0]).toHaveProperty('name', 'example.com')
  })
})
```

### Test Coverage Goals

- **Frontend Components**: 80%+ coverage
- **Backend Routes**: 90%+ coverage
- **Service Layer**: 95%+ coverage
- **Utility Functions**: 100% coverage

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm run test -- UserProfile.test.ts
```

## API Development

### Route Handler Pattern

```typescript
// routes/domains.ts
import type { FastifyInstance } from 'fastify'
import { ResponseFormatter, ErrorHandler } from '../utils'
import { CloudflareService } from '../services'

export async function domainsRoutes(fastify: FastifyInstance) {
  const cloudflareService = new CloudflareService()

  // GET /api/domains
  fastify.get('/api/domains', async (request, reply) => {
    try {
      const domains = await cloudflareService.listDomains()
      return ResponseFormatter.success(domains, 'Domains retrieved successfully')
    } catch (error) {
      const handledError = ErrorHandler.handle(error)
      reply.code(handledError.statusCode)
      return ResponseFormatter.error(handledError.message, handledError.code)
    }
  })

  // POST /api/domains
  fastify.post<{
    Body: { name: string; nameservers?: string[] }
  }>('/api/domains', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', format: 'hostname' },
          nameservers: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const domain = await cloudflareService.addDomain(request.body)
      reply.code(201)
      return ResponseFormatter.success(domain, 'Domain added successfully')
    } catch (error) {
      const handledError = ErrorHandler.handle(error)
      reply.code(handledError.statusCode)
      return ResponseFormatter.error(handledError.message, handledError.code)
    }
  })
}
```

### Service Layer Pattern

```typescript
// services/cloudflare-service.ts
import { CloudflareClient } from './cloudflare-client'
import { ErrorHandler } from '../utils'
import type { Domain, CreateDomainRequest } from '../types'

export class CloudflareService {
  private client: CloudflareClient

  constructor() {
    this.client = new CloudflareClient(config.cloudflareApiToken)
  }

  async listDomains(): Promise<Domain[]> {
    try {
      const zones = await this.client.listZones()
      return zones.map(this.transformZoneToDomain)
    } catch (error) {
      throw ErrorHandler.createCloudflareError('Failed to fetch domains', error)
    }
  }

  async addDomain(request: CreateDomainRequest): Promise<Domain> {
    try {
      // Validate domain name
      this.validateDomainName(request.name)
      
      const zone = await this.client.createZone(request.name, request.nameservers)
      return this.transformZoneToDomain(zone)
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw ErrorHandler.createValidationError('Domain already exists')
      }
      throw ErrorHandler.createCloudflareError('Failed to add domain', error)
    }
  }

  private validateDomainName(name: string): void {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/
    if (!domainRegex.test(name)) {
      throw ErrorHandler.createValidationError('Invalid domain name format')
    }
  }

  private transformZoneToDomain(zone: any): Domain {
    return {
      id: zone.id,
      name: zone.name,
      status: zone.status,
      nameservers: zone.name_servers || [],
      createdAt: zone.created_on,
      modifiedAt: zone.modified_on
    }
  }
}
```

### Error Handling Pattern

```typescript
// utils/error-handler.ts
export class ErrorHandler {
  static handle(error: any): HandledError {
    if (error.isCloudflareError) {
      return {
        statusCode: 502,
        message: error.message,
        code: 'CLOUDFLARE_API_ERROR'
      }
    }

    if (error.isValidationError) {
      return {
        statusCode: 400,
        message: error.message,
        code: 'VALIDATION_ERROR'
      }
    }

    // Default server error
    return {
      statusCode: 500,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    }
  }

  static createValidationError(message: string): ValidationError {
    const error = new Error(message) as ValidationError
    error.isValidationError = true
    return error
  }

  static createCloudflareError(message: string, originalError?: any): CloudflareError {
    const error = new Error(message) as CloudflareError
    error.isCloudflareError = true
    error.originalError = originalError
    return error
  }
}
```

## Frontend Development

### Component Development Guidelines

#### 1. Composition API Usage
```vue
<script setup lang="ts">
// Use Composition API for all new components
import { ref, computed, watch, onMounted } from 'vue'

// Define props with TypeScript
interface Props {
  modelValue: string
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  disabled: false
})

// Define emits
interface Emits {
  'update:modelValue': [value: string]
  'change': [value: string]
}

const emit = defineEmits<Emits>()
</script>
```

#### 2. State Management
```typescript
// composables/useDomains.ts
import { ref, computed } from 'vue'
import { ApiClient } from '@/services'

const domains = ref<Domain[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useDomains() {
  const apiClient = new ApiClient()

  const activeDomains = computed(() => 
    domains.value.filter(domain => domain.status === 'active')
  )

  const fetchDomains = async () => {
    loading.value = true
    error.value = null
    
    try {
      domains.value = await apiClient.getDomains()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  const addDomain = async (domainData: CreateDomainRequest) => {
    const newDomain = await apiClient.addDomain(domainData)
    domains.value.push(newDomain)
    return newDomain
  }

  return {
    domains: readonly(domains),
    loading: readonly(loading),
    error: readonly(error),
    activeDomains,
    fetchDomains,
    addDomain
  }
}
```

#### 3. Component Communication
```vue
<!-- Parent Component -->
<template>
  <DomainList 
    :domains="domains"
    @add-domain="handleAddDomain"
    @edit-domain="handleEditDomain"
  />
</template>

<script setup lang="ts">
const handleAddDomain = (domainData: CreateDomainRequest) => {
  // Handle domain addition
}

const handleEditDomain = (domain: Domain) => {
  // Handle domain editing
}
</script>
```

#### 4. Form Handling
```vue
<template>
  <form @submit.prevent="handleSubmit">
    <Input
      v-model="form.name"
      :error="errors.name"
      placeholder="Domain name"
      required
    />
    <Button 
      type="submit" 
      :loading="submitting"
      :disabled="!isFormValid"
    >
      Add Domain
    </Button>
  </form>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useForm } from '@/composables/useForm'

const { form, errors, validate, reset } = useForm({
  name: '',
  nameservers: []
}, {
  name: (value: string) => {
    if (!value) return 'Domain name is required'
    if (!/^[a-zA-Z0-9.-]+$/.test(value)) return 'Invalid domain format'
    return null
  }
})

const isFormValid = computed(() => 
  Object.values(errors).every(error => !error)
)

const handleSubmit = async () => {
  if (!validate()) return
  
  try {
    await addDomain(form)
    reset()
  } catch (error) {
    // Handle error
  }
}
</script>
```

### Styling Guidelines

#### 1. Tailwind CSS Usage
```vue
<template>
  <!-- Use Tailwind utility classes -->
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">
      Domain Management
    </h2>
    
    <!-- Use consistent spacing and colors -->
    <div class="space-y-4">
      <Button 
        variant="primary" 
        size="md"
        class="w-full sm:w-auto"
      >
        Add Domain
      </Button>
    </div>
  </div>
</template>
```

#### 2. Component Variants
```vue
<!-- Button.vue -->
<template>
  <button 
    :class="buttonClasses"
    :disabled="disabled || loading"
  >
    <LoadingSpinner v-if="loading" class="w-4 h-4 mr-2" />
    <slot />
  </button>
</template>

<script setup lang="ts">
const buttonClasses = computed(() => [
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    // Size variants
    'px-3 py-2 text-sm': props.size === 'sm',
    'px-4 py-2 text-base': props.size === 'md',
    'px-6 py-3 text-lg': props.size === 'lg',
    
    // Color variants
    'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500': props.variant === 'primary',
    'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500': props.variant === 'secondary',
    
    // State variants
    'opacity-50 cursor-not-allowed': props.disabled || props.loading
  }
])
</script>
```

## Database and State Management

### State Management Strategy

Since this application uses Cloudflare API as the data source, there's no traditional database. State management focuses on:

1. **API Response Caching**: Cache API responses to reduce requests
2. **Optimistic Updates**: Update UI immediately, sync with API
3. **Error Recovery**: Handle API failures gracefully

#### Global State Management
```typescript
// stores/app-store.ts
import { reactive, readonly } from 'vue'

interface AppState {
  user: User | null
  domains: Domain[]
  pages: Page[]
  loading: {
    domains: boolean
    pages: boolean
  }
  errors: {
    domains: string | null
    pages: string | null
  }
}

const state = reactive<AppState>({
  user: null,
  domains: [],
  pages: [],
  loading: {
    domains: false,
    pages: false
  },
  errors: {
    domains: null,
    pages: null
  }
})

export const useAppStore = () => {
  const setDomains = (domains: Domain[]) => {
    state.domains = domains
    state.errors.domains = null
  }

  const addDomain = (domain: Domain) => {
    state.domains.push(domain)
  }

  const setDomainsLoading = (loading: boolean) => {
    state.loading.domains = loading
  }

  const setDomainsError = (error: string | null) => {
    state.errors.domains = error
  }

  return {
    state: readonly(state),
    setDomains,
    addDomain,
    setDomainsLoading,
    setDomainsError
  }
}
```

#### Local Storage Persistence
```typescript
// utils/storage.ts
export class StorageManager {
  private static prefix = 'cloudflare-deployer:'

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(
        `${this.prefix}${key}`, 
        JSON.stringify(value)
      )
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  static get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(`${this.prefix}${key}`)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.warn('Failed to read from localStorage:', error)
      return defaultValue
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(`${this.prefix}${key}`)
  }

  static clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key))
  }
}
```

## Error Handling

### Frontend Error Handling

#### Global Error Handler
```typescript
// utils/error-handler.ts
export class FrontendErrorHandler {
  static handle(error: unknown): UserFriendlyError {
    if (error instanceof ApiError) {
      return this.handleApiError(error)
    }

    if (error instanceof NetworkError) {
      return {
        title: 'Connection Error',
        message: 'Please check your internet connection and try again.',
        action: 'retry'
      }
    }

    return {
      title: 'Unexpected Error',
      message: 'Something went wrong. Please try again.',
      action: 'retry'
    }
  }

  private static handleApiError(error: ApiError): UserFriendlyError {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return {
          title: 'Invalid Input',
          message: error.message,
          action: 'fix'
        }
      
      case 'CLOUDFLARE_API_ERROR':
        return {
          title: 'Service Error',
          message: 'Cloudflare service is temporarily unavailable.',
          action: 'retry'
        }
      
      default:
        return {
          title: 'Request Failed',
          message: error.message || 'The request could not be completed.',
          action: 'retry'
        }
    }
  }
}
```

#### Error Boundary Component
```vue
<!-- ErrorBoundary.vue -->
<template>
  <div v-if="hasError" class="error-boundary">
    <div class="bg-red-50 border border-red-200 rounded-md p-4">
      <div class="flex">
        <AlertCircle class="h-5 w-5 text-red-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            {{ error.title }}
          </h3>
          <p class="mt-1 text-sm text-red-700">
            {{ error.message }}
          </p>
          <div class="mt-4">
            <Button 
              v-if="error.action === 'retry'"
              @click="retry"
              variant="outline"
              size="sm"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { FrontendErrorHandler } from '@/utils/error-handler'

const hasError = ref(false)
const error = ref<UserFriendlyError | null>(null)

onErrorCaptured((err) => {
  hasError.value = true
  error.value = FrontendErrorHandler.handle(err)
  return false // Prevent error from propagating
})

const retry = () => {
  hasError.value = false
  error.value = null
  // Trigger component re-render
}
</script>
```

### Backend Error Handling

#### Custom Error Classes
```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.field = field
  }
}

export class CloudflareApiError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 502, 'CLOUDFLARE_API_ERROR')
    this.originalError = originalError
  }
}
```

#### Error Middleware
```typescript
// middleware/error-middleware.ts
import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '../utils/errors'

export async function errorMiddleware(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  request.log.error(error)

  // Handle operational errors
  if (error instanceof AppError && error.isOperational) {
    return reply.code(error.statusCode).send({
      success: false,
      message: error.message,
      error: {
        code: error.code
      }
    })
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.code(400).send({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: error.validation
      }
    })
  }

  // Handle unexpected errors
  return reply.code(500).send({
    success: false,
    message: 'Internal server error',
    error: {
      code: 'INTERNAL_ERROR'
    }
  })
}
```

## Performance Considerations

### Frontend Performance

#### 1. Code Splitting
```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Home.vue') // Lazy loading
    },
    {
      path: '/domains',
      name: 'Domains',
      component: () => import('@/views/DomainList.vue')
    }
  ]
})
```

#### 2. Component Optimization
```vue
<template>
  <!-- Use v-show for frequently toggled elements -->
  <div v-show="isVisible" class="expensive-component">
    <!-- Use v-memo for expensive computations -->
    <ExpensiveList 
      v-memo="[items.length, sortBy]"
      :items="items"
      :sort-by="sortBy"
    />
  </div>
</template>

<script setup lang="ts">
// Use shallowRef for large objects that don't need deep reactivity
import { shallowRef, computed } from 'vue'

const largeDataSet = shallowRef<LargeObject[]>([])

// Use computed for expensive calculations
const processedData = computed(() => {
  return largeDataSet.value
    .filter(item => item.active)
    .sort((a, b) => a.name.localeCompare(b.name))
})
</script>
```

#### 3. API Optimization
```typescript
// services/api-client.ts
export class ApiClient {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  async get<T>(url: string, useCache = true): Promise<T> {
    if (useCache) {
      const cached = this.cache.get(url)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data
      }
    }

    const response = await axios.get(url)
    
    if (useCache) {
      this.cache.set(url, {
        data: response.data,
        timestamp: Date.now()
      })
    }

    return response.data
  }

  // Debounced search
  private searchDebounced = debounce(async (query: string) => {
    return this.get(`/api/search?q=${encodeURIComponent(query)}`)
  }, 300)

  async search(query: string) {
    return this.searchDebounced(query)
  }
}
```

### Backend Performance

#### 1. Response Caching
```typescript
// middleware/cache-middleware.ts
import type { FastifyRequest, FastifyReply } from 'fastify'

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function cacheMiddleware(ttl = CACHE_TTL) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = `${request.method}:${request.url}`
    const cached = cache.get(key)

    if (cached && Date.now() - cached.timestamp < ttl) {
      return reply.send(cached.data)
    }

    // Continue to route handler
    reply.hijack()
    
    // Cache the response
    const originalSend = reply.send
    reply.send = function(payload) {
      cache.set(key, {
        data: payload,
        timestamp: Date.now()
      })
      return originalSend.call(this, payload)
    }
  }
}
```

#### 2. Request Optimization
```typescript
// services/cloudflare-client.ts
export class CloudflareClient {
  private requestQueue: Array<() => Promise<any>> = []
  private processing = false

  // Batch multiple requests
  async batchRequest<T>(requests: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(requests.map(request => request()))
  }

  // Rate limiting
  private async makeRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return

    this.processing = true
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!
      await request()
      
      // Rate limiting: wait between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.processing = false
  }
}
```

## Security Guidelines

### Frontend Security

#### 1. Input Sanitization
```typescript
// utils/sanitizer.ts
export class InputSanitizer {
  static sanitizeHtml(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  static sanitizeDomainName(input: string): string {
    // Remove any characters that aren't valid in domain names
    return input.toLowerCase().replace(/[^a-z0-9.-]/g, '')
  }

  static validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type)
  }
}
```

#### 2. Secure API Communication
```typescript
// services/api-client.ts
export class ApiClient {
  constructor(private baseURL: string) {
    // Ensure HTTPS in production
    if (import.meta.env.PROD && !baseURL.startsWith('https://')) {
      throw new Error('HTTPS is required in production')
    }
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    // Add security headers
    const secureConfig = {
      ...config,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...config.headers
      },
      timeout: 30000, // 30 second timeout
      withCredentials: true // Include cookies for CSRF protection
    }

    const response = await axios(secureConfig)
    return response.data
  }
}
```

### Backend Security

#### 1. Input Validation
```typescript
// schemas/domain-schema.ts
export const createDomainSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      format: 'hostname',
      minLength: 1,
      maxLength: 253,
      pattern: '^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$'
    },
    nameservers: {
      type: 'array',
      items: {
        type: 'string',
        format: 'hostname'
      },
      maxItems: 10
    }
  },
  additionalProperties: false
}
```

#### 2. Rate Limiting
```typescript
// middleware/rate-limit-middleware.ts
import type { FastifyRequest, FastifyReply } from 'fastify'

const requests = new Map<string, number[]>()

export function rateLimitMiddleware(
  maxRequests = 100,
  windowMs = 15 * 60 * 1000 // 15 minutes
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = request.ip
    const now = Date.now()
    
    // Clean old requests
    const clientRequests = requests.get(clientId) || []
    const validRequests = clientRequests.filter(time => now - time < windowMs)
    
    if (validRequests.length >= maxRequests) {
      return reply.code(429).send({
        success: false,
        message: 'Too many requests',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        }
      })
    }
    
    validRequests.push(now)
    requests.set(clientId, validRequests)
  }
}
```

#### 3. File Upload Security
```typescript
// middleware/file-upload-middleware.ts
import type { MultipartFile } from '@fastify/multipart'

export function validateFileUpload(file: MultipartFile): void {
  // Check file size
  if (file.file.bytesRead > 10 * 1024 * 1024) { // 10MB
    throw new ValidationError('File too large')
  }

  // Check file type
  const allowedTypes = ['application/zip']
  if (!allowedTypes.includes(file.mimetype)) {
    throw new ValidationError('Invalid file type')
  }

  // Check filename
  const filename = file.filename
  if (!filename || filename.includes('..') || filename.includes('/')) {
    throw new ValidationError('Invalid filename')
  }

  // Additional security checks
  if (filename.length > 255) {
    throw new ValidationError('Filename too long')
  }
}
```

## Deployment and CI/CD

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test
      
      - name: Build application
        run: npm run build
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Cloudflare Workers
        run: |
          cd backend
          npm run deploy:workers
      
      - name: Deploy to Cloudflare Pages
        run: |
          cd frontend
          npm run deploy:pages
```

#### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,vue}": [
      "eslint --fix",
      "git add"
    ],
    "*.{ts,vue,md,json}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

### Environment Management

#### Development Environment
```bash
# .env.development
NODE_ENV=development
PORT=3000
HOST=localhost
CLOUDFLARE_API_TOKEN=dev_token_here
LOG_LEVEL=debug
```

#### Staging Environment
```bash
# .env.staging
NODE_ENV=staging
PORT=3000
HOST=0.0.0.0
CLOUDFLARE_API_TOKEN=staging_token_here
LOG_LEVEL=info
CORS_ORIGINS=https://staging.yourdomain.com
```

#### Production Environment
```bash
# .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
CLOUDFLARE_API_TOKEN=prod_token_here
LOG_LEVEL=warn
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SESSION_SECRET=secure_session_secret_here
```

## Troubleshooting

### Common Development Issues

#### 1. Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev:backend
```

#### 2. TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf frontend/node_modules/.cache
rm -rf backend/node_modules/.cache

# Reinstall dependencies
npm ci

# Check TypeScript configuration
npx tsc --noEmit
```

#### 3. Build Failures
```bash
# Clear build cache
rm -rf frontend/dist
rm -rf backend/dist

# Clean install
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules
npm ci

# Rebuild
npm run build
```

#### 4. API Connection Issues
```bash
# Check backend is running
curl http://localhost:3000/health

# Check environment variables
cat backend/.env

# Check Cloudflare API token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify
```

### Debugging Tools

#### 1. Vue DevTools
Install Vue DevTools browser extension for debugging Vue components.

#### 2. Network Debugging
```typescript
// Add request/response interceptors
axios.interceptors.request.use(request => {
  console.log('Starting Request:', request)
  return request
})

axios.interceptors.response.use(
  response => {
    console.log('Response:', response)
    return response
  },
  error => {
    console.error('Response Error:', error)
    return Promise.reject(error)
  }
)
```

#### 3. Backend Debugging
```typescript
// Add detailed logging
fastify.addHook('onRequest', async (request) => {
  request.log.info({ url: request.url, method: request.method }, 'Request received')
})

fastify.addHook('onResponse', async (request, reply) => {
  request.log.info({ 
    url: request.url, 
    statusCode: reply.statusCode,
    responseTime: reply.getResponseTime()
  }, 'Request completed')
})
```

### Performance Debugging

#### 1. Bundle Analysis
```bash
# Analyze frontend bundle
cd frontend
npm run build -- --analyze

# Check bundle size
npm run build
ls -la dist/assets/
```

#### 2. Memory Profiling
```bash
# Run with memory profiling
node --inspect backend/dist/index.js

# Open Chrome DevTools
# Go to chrome://inspect
# Click "inspect" on your Node.js process
```

#### 3. API Performance
```typescript
// Add timing middleware
fastify.addHook('onRequest', async (request) => {
  request.startTime = Date.now()
})

fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime
  if (duration > 1000) { // Log slow requests
    request.log.warn({ duration, url: request.url }, 'Slow request detected')
  }
})
```

This developer guide provides comprehensive information for working on the Cloudflare Static Deployer project. Follow these guidelines to maintain code quality, security, and performance standards.