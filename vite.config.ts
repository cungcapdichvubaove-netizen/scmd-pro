import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig, type ConfigEnv, type UserConfig } from 'vite'

/**
 * SCMD Pro - Vite Config (Final)
 * - Clean TS (no warnings)
 * - Compatible Vite + React + TS
 * - Optimized build & chunking
 * - PWA Integrated (Offline + Installable)
 * 
 * FIX [1.1.5]: Resolve "Cannot read properties of undefined (reading 'forwardRef')"
 * Root cause: recharts/lucide-react dùng CJS require('react'), khi Rolldown tách chunk
 * độc lập khỏi vendor-react thì React context bị undefined tại thời điểm load.
 * Fix: Gom toàn bộ React ecosystem + các lib phụ thuộc forwardRef vào cùng chunk,
 * đồng thời force pre-bundle qua optimizeDeps để Rolldown xử lý CJS/ESM interop đúng.
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const isProd = mode === 'production';

  return {
    /* ---------------- PLUGINS ---------------- */
    plugins: [
      react({
        jsxRuntime: 'automatic',
      }),
      tailwindcss(),
      // VitePWA tạm thời vô hiệu hóa để sửa lỗi OOM build
    ],

    /* ---------------- RESOLVE ---------------- */
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './shared'),
        '@server': path.resolve(__dirname, './server'),
      },
    },

    /* ---------------- GLOBAL DEFINE ---------------- */
    define: {
      __APP_ENV__: JSON.stringify(mode),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || '')
    },

    /* ---------------- DEV SERVER ---------------- */
    server: {
      port: 3000,
      strictPort: true,
      host: true,
      hmr: false,
    },

    /* ---------------- PRE-BUNDLE ---------------- */
    // Temporarily disabled to save memory during dev startup
    /*
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-is',
        'scheduler',
        '@tanstack/react-query',
        'framer-motion',
        'motion/react',
        'clsx',
        'tailwind-merge',
        'zustand',
        'react-markdown',
        'recharts',
        'lucide-react',
      ],
      esbuildOptions: {
        define: {
          'process.env.NODE_ENV': JSON.stringify(mode),
        },
      },
    },
    */

    /* ---------------- BUILD ---------------- */
    build: {
      outDir: 'dist',
      sourcemap: false, 
      emptyOutDir: true,
      minify: 'esbuild', 
      cssMinify: true, 
      cssCodeSplit: false, 
      target: 'esnext',
      reportCompressedSize: false, 

      // Xử lý CommonJS cho các thư viện cũ trên Vite 7/Rolldown
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },

      rollupOptions: {
        maxParallelFileOps: 1, 
        output: {
          // Disable manual chunks to let Vite/Rollup use default strategy (less memory overhead and no circularity)
          manualChunks: undefined,

          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',

          assetFileNames: (assetInfo) => {
            const ext = assetInfo.name?.split('.').pop() || ''

            if (/png|jpe?g|svg|gif|webp/.test(ext)) {
              return 'assets/img/[name]-[hash][extname]'
            }

            if (ext === 'css') {
              return 'assets/css/[name]-[hash][extname]'
            }

            return 'assets/[ext]/[name]-[hash][extname]'
          },
        },
      },

      chunkSizeWarningLimit: 1000,
    },

    /* ---------------- PERFORMANCE ---------------- */
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },

    /* ---------------- PREVIEW ---------------- */
    preview: {
      port: 5000,
      strictPort: true,
    },
  }
})