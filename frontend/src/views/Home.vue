<template>
  <Layout />
</template>

<script setup lang="ts">
import Layout from '@/components/Layout.vue'

// Define component name for keepAlive
defineOptions({
  name: 'Home'
})
</script>