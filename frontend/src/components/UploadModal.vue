<template>
  <Modal :open="isOpen" :title="modalTitle" size="md" @close="handleClose">
    <div class="space-y-6">
      <!-- Page Info -->
      <div v-if="page" class="bg-gray-50 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-900 mb-2">页面项目信息</h3>
        <div class="space-y-1 text-sm text-gray-600">
          <p><span class="font-medium">项目名称:</span> {{ page.name }}</p>
          <p><span class="font-medium">状态:</span> {{ getStatusText(page.status) }}</p>
          <p v-if="page.url"><span class="font-medium">当前URL:</span>
            <a :href="page.url" target="_blank" class="text-purple-600 hover:text-purple-800 underline">
              {{ page.url }}
            </a>
          </p>
        </div>
      </div>

      <!-- File Upload Area -->
      <div class="space-y-4">
        <label class="text-sm font-medium text-gray-700">
          选择文件夹
        </label>

        <!-- File Upload Zone -->
        <div :class="[
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200',
          'border-gray-300',
          loading ? 'opacity-50 pointer-events-none' : 'hover:border-purple-400 hover:bg-purple-50'
        ]">
          <input ref="fileInput" type="file" webkitdirectory webkitrelativepath @change="handleFileSelect"
            class="hidden" :disabled="loading" />

          <div v-if="!selectedFile">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="text-gray-600 mb-2">点击下方按钮选择文件夹</p>
            <Button type="button" variant="outline" @click="triggerFileSelect" :disabled="loading">
              选择文件夹
            </Button>
          </div>

          <div v-else class="space-y-2">
            <svg class="mx-auto h-8 w-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd" />
            </svg>
            <p class="text-gray-900 font-medium">{{ selectedFile.name }}</p>
            <p class="text-gray-500 text-sm">{{ formatFileSize(selectedFile.size) }}</p>
            <Button type="button" variant="ghost" size="sm" @click="clearFile" :disabled="loading">
              重新选择
            </Button>
          </div>
        </div>

        <!-- File Requirements -->
        <div class="text-xs text-gray-500 space-y-1">
          <p>• 仅支持文件夹</p>
          <p>• 文件大小不能超过10MB</p>
          <p>• 文件夹应包含您的静态网站文件（HTML、CSS、JS等）</p>
          <p>• 暂不支持SPA</p>
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-if="uploadProgress > 0" class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">上传进度</span>
          <span class="text-gray-900">{{ uploadProgress.toFixed(2) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-purple-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"></div>
        </div>
      </div>

      <!-- Error Display -->
      <Alert v-if="uploadError" variant="error" title="上传失败">
        {{ uploadError }}
      </Alert>

      <!-- Success Display -->
      <Alert v-if="uploadSuccess && !deploySuccess" variant="success" title="上传成功">
        文件已成功上传，现在可以开始部署
      </Alert>

      <!-- Deploy Success Display -->
      <Alert v-if="deploySuccess" variant="success" title="部署成功">
        页面已成功部署，请等待部署完成
      </Alert>

      <!-- Deployment URL Display -->
      <div v-if="deploymentUrl" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-start">
          <svg class="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd" />
          </svg>
          <div class="flex-1">
            <h3 class="text-sm font-medium text-green-800 mb-2">部署URL已生成</h3>
            <p class="text-sm text-green-700 mb-2">您的页面已成功部署，可以通过以下链接访问：</p>
            <a :href="deploymentUrl" target="_blank"
              class="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800 underline break-all">
              {{ deploymentUrl }}
              <svg class="ml-1 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <!-- Deploy Error Display -->
      <Alert v-if="deployError" variant="error" title="部署失败">
        {{ deployError }}
      </Alert>
    </div>

    <template #footer>
      <Button variant="outline" @click="handleClose" :disabled="loading || deploying">
        {{ getCloseButtonText() }}
      </Button>
      <Button v-if="!uploadSuccess && !deploySuccess" @click="handleUpload"
        :disabled="loading || !selectedFile || !isValidFile">
        <LoadingSpinner v-if="loading" size="sm" class="mr-2" />
        {{ loading ? '上传中...' : '开始上传' }}
      </Button>
      <Button v-if="uploadSuccess && !deploySuccess" @click="handleDeploy" :disabled="deploying">
        <LoadingSpinner v-if="deploying" size="sm" class="mr-2" />
        {{ deploying ? '部署中...' : '开始部署' }}
      </Button>
      <Button v-if="deploySuccess && deploymentUrl" @click="openDeploymentUrl" variant="primary">
        访问页面
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Modal, Button, Alert, LoadingSpinner } from '@/components/ui'
import { api } from '@/services/api'
import type { Page, UploadPayload } from '@/types'
import { blake3 } from 'hash-wasm'
import mime from "mime";
import { minimatch } from 'minimatch'

const IGNORE_LIST = [
  "_worker.js",
  "_redirects",
  "_headers",
  "_routes.json",
  "functions",
  "**/.DS_Store",
  "**/node_modules",
  "**/.git",
]
interface Props {
  isOpen: boolean
  page?: Page
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: [result: any]
  statusUpdate: [update: { pageId: string; status: any }]
}>()

// Component state
const selectedFile = ref<File | null>(null)
const loading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref<string | null>(null)
const uploadSuccess = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)
const uploadPayload = ref<UploadPayload[]>([])
const deploying = ref(false)
const deploySuccess = ref(false)
const deployError = ref<string | null>(null)
const deploymentUrl = ref<string | null>(null)
const deploymentId = ref<string | null>(null)
const statusPollingTimer = ref<NodeJS.Timeout | null>(null)

// Computed properties
const modalTitle = computed(() => {
  if (!props.page) return '上传文件夹'
  if (deploySuccess.value) return '部署成功'
  if (uploadSuccess.value) return '准备部署'
  return props.page.status === 'created' ? '上传文件夹' : '更新页面内容'
})

const isValidFile = computed(() => {
  if (!selectedFile.value) return false

  return true
})

// File handling methods
const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || []).filter(file => !IGNORE_LIST.some(pattern => minimatch(file.webkitRelativePath, pattern)))

  if (files && files.length > 0) {
    let rootDirectory = ''
    Promise.all(
      files.map(file => {
        return new Promise<UploadPayload>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = async (e) => {
            if (e.target?.result) {
              try {
                const fullPath = file.webkitRelativePath
                if (!rootDirectory) {
                  const paths = fullPath.split('/')
                  if (paths.length > 1) {
                    rootDirectory = paths[0]
                  }
                }
                const arrayBuffer = e.target.result as ArrayBuffer
                const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
                const names = file.name.split('.')
                const extension = names[names.length - 1]
                const hash = await blake3(base64String + extension)
                resolve({
                  fileName: fullPath.replace(rootDirectory, ''),
                  base64: true,
                  key: hash.slice(0, 32),
                  metadata: { contentType: mime.getType(extension) || "application/octet-stream" },
                  value: base64String
                })
              } catch (err) {
                reject(err)
              }
            } else {
              reject(new Error('File read error'))
            }
          }
          reader.onerror = () => reject(new Error('File read error'))
          reader.readAsArrayBuffer(file)
        })
      })
    ).then(results => {
      uploadPayload.value = results
      console.log(uploadPayload.value)
      handleUpload()
      // 这里可以继续后续逻辑
    }).catch(err => {
      // 错误处理
      console.error(err)
    })
  }

}



const clearFile = () => {
  selectedFile.value = null
  uploadError.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
const manifest = ref<Record<string, string>>({})

// Deploy handling
const handleDeploy = async () => {
  if (!props.page || Object.keys(manifest.value).length === 0) {
    return
  }

  try {
    deploying.value = true
    deployError.value = null

    const response = await api.pages.deploy(props.page.name, manifest.value)

    if (response.success && response.data) {
      deploySuccess.value = true

      // Extract deployment ID for status polling
      deploymentId.value = response.data.id

      // Display URL immediately if available
      if (response.data.url) {
        deploymentUrl.value = response.data.url
      }

      // Start status polling after successful deployment
      startStatusPolling(response.data.id)

      // Emit success event after a short delay
      setTimeout(() => {
        emit('success', response.data)
      }, 1000)
    } else {
      throw new Error(response.message || '部署失败')
    }
  } catch (error: any) {
    console.error('Failed to deploy:', error)
    deployError.value = error.message || '部署失败，请稍后重试'
  } finally {
    deploying.value = false
  }
}

// Upload handling
const handleUpload = async () => {
  if (uploadPayload.value.length === 0 || !props.page) {
    return
  }

  manifest.value = {}
  uploadPayload.value.forEach(p => {
    manifest.value[p.fileName] = p.key
  })

  try {
    loading.value = true
    uploadError.value = null
    uploadProgress.value = 0

    // Simulate upload progress (since we can't get real progress from fetch)
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += Math.random() * 10
      }
    }, 200)

    let response = await api.pages.getUploadUrl(props.page.name)

    const jwt = response.data?.jwt || ''
    if (!jwt) {
      throw new Error('获取上传凭证失败')
    }

    let checkResponse = await api.pages.checkMissingAssets(jwt, uploadPayload.value)
    console.log({ checkResponse })
    let uploadResponse = await api.pages.assetsUpload(jwt, uploadPayload.value.filter(p => checkResponse.data?.result.includes(p.key)))
    console.log({ uploadResponse })
    if (!uploadResponse.data?.success) {
      throw new Error('上传失败，请稍后重试')
    }

    clearInterval(progressInterval)
    uploadProgress.value = 100

    if (response.success && response.data) {
      uploadSuccess.value = true
      // Don't emit success event yet, wait for deployment
    } else {
      throw new Error(response.message || '上传失败')
    }
  } catch (error: any) {
    console.error('Failed to upload file:', error)
    uploadError.value = error.message || '上传失败，请稍后重试'
    uploadProgress.value = 0
  } finally {
    loading.value = false
  }
}



// Status polling methods
const startStatusPolling = (deploymentIdValue: string) => {
  deploymentId.value = deploymentIdValue

  // Start polling after 2 seconds
  statusPollingTimer.value = setTimeout(() => {
    checkDeploymentStatus(deploymentIdValue)
  }, 2000)
}

const checkDeploymentStatus = async (deploymentIdValue: string) => {
  if (!props.page) return

  try {
    const response = await api.pages.pollDeploymentStatus(props.page.name, deploymentIdValue)

    if (response.success && response.data) {
      // Emit status update to parent component
      emit('statusUpdate', {
        pageId: props.page.id,
        status: response.data
      })
    }
  } catch (error) {
    // Silent failure for polling - don't disrupt user experience
    console.warn('Failed to poll deployment status:', error)
  }
}

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getStatusText = (status: string): string => {
  switch (status) {
    case 'created': return '已创建'
    case 'deploying': return '部署中'
    case 'deployed': return '已部署'
    case 'failed': return '部署失败'
    default: return '未知状态'
  }
}

const getCloseButtonText = (): string => {
  if (deploySuccess.value) {
    return '关闭'
  } else if (uploadSuccess.value) {
    return '取消'
  } else {
    return '取消'
  }
}

const openDeploymentUrl = () => {
  if (deploymentUrl.value) {
    window.open(deploymentUrl.value, '_blank')
  }
}

// Handle modal close
const handleClose = () => {
  if (loading.value || deploying.value) return // Prevent closing while uploading or deploying

  // Allow modal to close but continue status monitoring in background
  // The timer will continue running and emit status updates
  emit('close')
}

// Cleanup timer on component unmount
onUnmounted(() => {
  if (statusPollingTimer.value) {
    clearTimeout(statusPollingTimer.value)
    statusPollingTimer.value = null
  }
})

// Reset state when modal opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Reset state when opening
    selectedFile.value = null
    loading.value = false
    uploadProgress.value = 0
    uploadError.value = null
    uploadSuccess.value = false
    deploying.value = false
    deploySuccess.value = false
    deployError.value = null
    deploymentUrl.value = null
    deploymentId.value = null
    manifest.value = {}

    // Clear any existing timer when opening modal
    if (statusPollingTimer.value) {
      clearTimeout(statusPollingTimer.value)
      statusPollingTimer.value = null
    }

    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
  // Note: When modal closes (isOpen becomes false), we intentionally 
  // do NOT clear the status polling timer to allow background monitoring
})


</script>