import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isStaging = mode === 'staging'
  const isDevelopment = mode === 'development'

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
      sourcemap: isDevelopment || isStaging,
      minify: isProduction ? 'terser' : false,
      target: isProduction ? 'es2020' : 'es2015',
      cssCodeSplit: true,
      chunkSizeWarningLimit: parseInt(env.VITE_CHUNK_SIZE_WARNING_LIMIT) || 1000,
      // Production optimizations
      reportCompressedSize: isProduction,
      emptyOutDir: true,
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info'] : [],
          passes: isProduction ? 2 : 1
        },
        mangle: {
          safari10: true
        },
        format: {
          comments: false
        }
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Enhanced chunk splitting for better caching
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('vue-router')) {
                return 'vue-vendor'
              }
              if (id.includes('radix-vue') || id.includes('lucide-vue-next')) {
                return 'ui-vendor'
              }
              if (id.includes('axios') || id.includes('@vueuse')) {
                return 'utils-vendor'
              }
              return 'vendor'
            }
            // Split large components into separate chunks
            if (id.includes('/src/views/')) {
              return 'views'
            }
            if (id.includes('/src/components/')) {
              return 'components'
            }
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
            if (facadeModuleId && facadeModuleId.includes('node_modules')) {
              return 'assets/js/vendor/[name]-[hash].js'
            }
            return 'assets/js/[name]-[hash].js'
          },
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (!assetInfo.names || assetInfo.names.length === 0) {
              return 'assets/[name]-[hash][extname]'
            }
            const name = assetInfo.names[0]
            const info = name.split('.')
            const ext = info[info.length - 1]

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
        },
        // Production-specific optimizations
        treeshake: isProduction ? {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          unknownGlobalSideEffects: false
        } : false
      }
    },
    define: {
      __VUE_PROD_DEVTOOLS__: !isProduction,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: !isProduction,
      // Inject environment variables
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    // CSS optimizations
    css: {
      devSourcemap: isDevelopment,
      postcss: {
        plugins: isProduction ? [
          require('autoprefixer'),
          require('cssnano')({
            preset: ['default', {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              minifySelectors: true
            }]
          })
        ] : [require('autoprefixer')]
      }
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
      ],
      exclude: isDevelopment ? [] : ['@vueuse/core']
    },
    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: true,
      host: true
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.ts']
    }
  }
})