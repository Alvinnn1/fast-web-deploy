<template>
  <nav class="flex items-center justify-between" aria-label="分页导航">
    <!-- 分页信息 -->
    <div class="flex-1 flex justify-between sm:hidden">
      <!-- 移动端简化版本 -->
      <Button
        variant="outline"
        size="sm"
        :disabled="currentPage <= 1"
        @click="goToPage(currentPage - 1)"
      >
        上一页
      </Button>
      <span class="text-sm text-gray-700 flex items-center">
        第 {{ currentPage }} 页，共 {{ totalPages }} 页
      </span>
      <Button
        variant="outline"
        size="sm"
        :disabled="currentPage >= totalPages"
        @click="goToPage(currentPage + 1)"
      >
        下一页
      </Button>
    </div>

    <!-- 桌面端完整版本 -->
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <!-- 分页信息 -->
      <div>
        <p class="text-sm text-gray-700">
          显示第
          <span class="font-medium">{{ startItem }}</span>
          -
          <span class="font-medium">{{ endItem }}</span>
          条，共
          <span class="font-medium">{{ total }}</span>
          条记录
        </p>
      </div>

      <!-- 分页控件 -->
      <div class="flex items-center space-x-1">
        <!-- 首页 -->
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage <= 1"
          @click="goToPage(1)"
          class="px-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </Button>

        <!-- 上一页 -->
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
          class="px-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Button>

        <!-- 页码按钮 -->
        <template v-for="page in visiblePages" :key="page">
          <Button
            v-if="page === '...'"
            variant="ghost"
            size="sm"
            disabled
            class="px-3"
          >
            ...
          </Button>
          <Button
            v-else
            :variant="page === currentPage ? 'primary' : 'outline'"
            size="sm"
            @click="goToPage(page as number)"
            class="px-3"
          >
            {{ page }}
          </Button>
        </template>

        <!-- 下一页 -->
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
          class="px-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </Button>

        <!-- 末页 -->
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage >= totalPages"
          @click="goToPage(totalPages)"
          class="px-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui'

interface Props {
  /** 当前页码 */
  currentPage: number
  /** 每页显示数量 */
  pageSize: number
  /** 总记录数 */
  total: number
  /** 显示的页码按钮数量 */
  showPages?: number
}

const props = withDefaults(defineProps<Props>(), {
  showPages: 7
})

const emit = defineEmits<{
  /** 页码变化事件 */
  pageChange: [page: number]
}>()


// 计算属性
const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

const startItem = computed(() => {
  if (props.total === 0) return 0
  return (props.currentPage - 1) * props.pageSize + 1
})

const endItem = computed(() => {
  const end = props.currentPage * props.pageSize
  return end > props.total ? props.total : end
})

// 计算可见的页码
const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = props.currentPage
  const showPages = props.showPages

  if (total <= showPages) {
    // 总页数小于等于显示页数，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总页数大于显示页数，需要省略
    const halfShow = Math.floor(showPages / 2)
    
    if (current <= halfShow + 1) {
      // 当前页在前半部分
      for (let i = 1; i <= showPages - 2; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - halfShow) {
      // 当前页在后半部分
      pages.push(1)
      pages.push('...')
      for (let i = total - showPages + 3; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 当前页在中间部分
      pages.push(1)
      pages.push('...')
      for (let i = current - halfShow + 1; i <= current + halfShow - 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

// 方法
const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === props.currentPage) {
    return
  }
  emit('pageChange', page)
}

</script>

<style scoped>
/* 自定义样式可以在这里添加 */
</style>
