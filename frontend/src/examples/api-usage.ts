/**
 * API使用示例
 * 展示如何在Vue组件中使用API客户端和Loading管理器
 */

import { ref, onMounted } from 'vue'
import { api } from '../services'
import { ErrorHandler } from '../utils'
import type { Domain } from '../types/domain'
import type { Page } from '../types/page'

/**
 * 域名管理示例
 */
export function useDomainManagement() {
  const domains = ref<Domain[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 获取域名列表
  const fetchDomains = async () => {
    try {
      isLoading.value = true
      error.value = null
      const response = await api.domains.list()
      if (response.success && response.data) {
        domains.value = response.data
      }
    } catch (err) {
      const userError = ErrorHandler.handle(err)
      error.value = userError.message
    } finally {
      isLoading.value = false
    }
  }

  // 添加新域名
  const addDomain = async (name: string, nameservers?: string[]) => {
    try {
      isLoading.value = true
      error.value = null
      const response = await api.domains.create({ name, nameservers })
      if (response.success && response.data) {
        domains.value.push(response.data)
        return true
      }
      return false
    } catch (err) {
      const userError = ErrorHandler.handle(err)
      error.value = userError.message
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 组件挂载时获取数据
  onMounted(() => {
    fetchDomains()
  })

  return {
    domains,
    isLoading,
    error,
    fetchDomains,
    addDomain
  }
}

/**
 * 页面管理示例
 */
export function usePageManagement() {
  const pages = ref<Page[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const deploymentStatus = ref<string | null>(null)

  // 获取页面列表
  const fetchPages = async () => {
    try {
      isLoading.value = true
      error.value = null
      const response = await api.pages.list()
      if (response.success && response.data) {
        pages.value = response.data
      }
    } catch (err) {
      const userError = ErrorHandler.handle(err)
      error.value = userError.message
    } finally {
      isLoading.value = false
    }
  }

  // 创建新页面
  const createPage = async (name: string) => {
    try {
      isLoading.value = true
      error.value = null
      const response = await api.pages.create({ name })
      if (response.success && response.data) {
        pages.value.push(response.data)
        return response.data
      }
      return null
    } catch (err) {
      const userError = ErrorHandler.handle(err)
      error.value = userError.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 直接部署页面 (推荐方式 - 节省带宽)
  const deployPageDirect = async (pageId: string, zipFile: File) => {
    try {
      error.value = null
      deploymentStatus.value = '准备上传...'

      // 1. 获取直接上传URL
      const uploadUrlResponse = await api.pages.getUploadUrl(pageId)
      if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
        throw new Error('获取上传URL失败')
      }

      const { uploadUrl, jwt } = uploadUrlResponse.data
      deploymentStatus.value = '正在直接上传到Cloudflare...'

      // 2. 直接上传到Cloudflare
      const uploadResponse = await api.pages.deployDirect(uploadUrl, jwt, zipFile)
      if (uploadResponse.success) {
        deploymentStatus.value = '部署中...'

        // 轮询部署状态
        const pollStatus = async () => {
          try {
            const statusResponse = await api.pages.getDeploymentStatus(pageId)
            if (statusResponse.success && statusResponse.data) {
              const status = statusResponse.data.status

              if (status === 'success') {
                deploymentStatus.value = '部署成功'
                await fetchPages() // 刷新页面列表
              } else if (status === 'failure') {
                deploymentStatus.value = '部署失败'
                error.value = statusResponse.data.errorMessage || '部署过程中发生错误'
              } else {
                deploymentStatus.value = `部署中 (${status})`
                // 继续轮询
                setTimeout(pollStatus, 2000)
              }
            }
          } catch (err) {
            const userError = ErrorHandler.handle(err)
            error.value = userError.message
            deploymentStatus.value = null
          }
        }

        // 开始轮询
        setTimeout(pollStatus, 1000)
        return true
      }
      return false
    } catch (err) {
      const userError = ErrorHandler.handle(err)
      error.value = userError.message
      deploymentStatus.value = null

      // 如果直接上传失败，尝试传统方式
      console.warn('直接上传失败，尝试传统上传方式:', err)
      return deployPageTraditional(pageId, zipFile)
    }
  }

  // 传统部署页面 (通过服务器中转)
  const deployPageTraditional = async (pageId: string, zipFile: File) => {
    try {
      error.value = null
      deploymentStatus.value = '正在上传到服务器...'

      const response = await api.pages.deploy(pageId, zipFile)
      if (response.success) {
        deploymentStatus.value = '部署中...'

        // 轮询部署状态
        const pollStatus = async () => {
          try {
            const statusResponse = await api.pages.getDeploymentStatus(pageId)
            if (statusResponse.success && statusResponse.data) {
              const status = statusResponse.data.status

              if (status === 'success') {
                deploymentStatus.value = '部署成功'
                await fetchPages() // 刷新页面列表
              } else if (status === 'failure') {
                deploymentStatus.value = '部署失败'
                error.value = statusResponse.data.errorMessage || '部署过程中发生错误'
              } else {
                deploymentStatus.value = `部署中 (${status})`
                // 继续轮询
                setTimeout(pollStatus, 2000)
              }
            }
          } catch (err) {
            const userError = ErrorHandler.handle(err)
            error.value = userError.message
            deploymentStatus.value = null
          }
        }

        // 开始轮询
        setTimeout(pollStatus, 1000)
        return true
      }
      return false
    } catch (err) {
      const userError = ErrorHandler.handle(err)
      error.value = userError.message
      deploymentStatus.value = null
      return false
    }
  }

  onMounted(() => {
    fetchPages()
  })

  return {
    pages,
    isLoading,
    error,
    deploymentStatus,
    fetchPages,
    createPage,
    deployPage: deployPageDirect, // 默认使用直接上传
    deployPageTraditional // 提供传统上传作为备选
  }
}

/**
 * 在Vue组件中的使用示例
 */
/*
<template>
  <div>
    <!-- Loading状态 -->
    <div v-if="isLoading" class="loading-overlay">
      <LoadingSpinner />
    </div>

    <!-- 错误提示 -->
    <ErrorMessage v-if="error" :message="error" @dismiss="error = null" />

    <!-- 域名列表 -->
    <div class="domains">
      <h2>域名列表</h2>
      <button @click="fetchDomains">刷新</button>
      
      <div v-for="domain in domains" :key="domain.id" class="domain-item">
        {{ domain.name }} - {{ domain.status }}
      </div>
      
      <button @click="showAddDomainModal = true">添加域名</button>
    </div>

    <!-- 页面列表 -->
    <div class="pages">
      <h2>页面列表</h2>
      <button @click="fetchPages">刷新</button>
      
      <div v-for="page in pages" :key="page.id" class="page-item">
        {{ page.name }} - {{ page.status }}
        <button @click="handleDeploy(page.id)">部署</button>
      </div>
      
      <button @click="showCreatePageModal = true">创建页面</button>
    </div>

    <!-- 部署状态 -->
    <div v-if="deploymentStatus" class="deployment-status">
      {{ deploymentStatus }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDomainManagement, usePageManagement } from '../examples/api-usage'

const {
  domains,
  isLoading: domainLoading,
  error: domainError,
  fetchDomains,
  addDomain
} = useDomainManagement()

const {
  pages,
  isLoading: pageLoading,
  error: pageError,
  deploymentStatus,
  fetchPages,
  createPage,
  deployPage
} = usePageManagement()

// 合并loading状态
const isLoading = computed(() => domainLoading.value || pageLoading.value)
const error = computed(() => domainError.value || pageError.value)

const showAddDomainModal = ref(false)
const showCreatePageModal = ref(false)

const handleDeploy = async (pageId: string) => {
  // 这里应该打开文件选择对话框
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      await deployPage(pageId, file)
    }
  }
  input.click()
}
</script>
*/