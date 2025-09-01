import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction,
      minify: isProduction,
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router'],
            'ui-vendor': ['radix-vue', 'lucide-vue-next'],
            'utils-vendor': ['axios', '@vueuse/core']
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (!assetInfo.names || assetInfo.names.length === 0) {
              return 'assets/[name]-[hash][extname]'
            }
            const name = assetInfo.names[0]
            const ext = name.split('.').pop()

            if (/\.(css)$/.test(name)) {
              return `assets/css/[name]-[hash].${ext}`
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico|avif)$/.test(name)) {
              return `assets/images/[name]-[hash].${ext}`
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
              return `assets/fonts/[name]-[hash].${ext}`
            }
            return `assets/[name]-[hash].${ext}`
          }
        }
      }
    },
    define: {
      __VUE_PROD_DEVTOOLS__: !isProduction,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: !isProduction,
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    // CSS optimizations
    css: {
      devSourcemap: !isProduction
    },
    // Performance optimizations
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'axios',
        '@vueuse/core',
        'radix-vue',
        'lucide-vue-next'
      ]
    },
    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: true,
      host: true
    }
  }
})