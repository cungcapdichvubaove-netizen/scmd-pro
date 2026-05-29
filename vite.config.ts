import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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
  const devProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET || process.env.API_DEV_PROXY_TARGET || 'http://127.0.0.1:5000';

  return {
    /* ---------------- PLUGINS ---------------- */
    plugins: [
      react({
        jsxRuntime: 'automatic',
      }),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        manifestFilename: 'manifest.webmanifest',
        includeAssets: [
          'logo_scmd_pro.png',
          'favicon.webp',
          'icons/scmd-pro-icon-192.png',
          'icons/scmd-pro-icon-512.png',
          'icons/scmd-pro-maskable-512.png',
          'icons/apple-touch-icon.png',
        ],
        manifest: {
          id: '/?app=scmd-pro',
          name: 'SCMD Pro',
          short_name: 'SCMD Pro',
          description: 'Nen tang giam sat an ninh va doi soat chat luong dich vu bao ve thue ngoai.',
          start_url: '/guard/app',
          scope: '/',
          lang: 'vi-VN',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          orientation: 'portrait',
          background_color: '#0D1324',
          theme_color: '#0D1324',
          categories: ['business', 'productivity', 'utilities'],
          prefer_related_applications: false,
          icons: [
            {
              src: '/icons/scmd-pro-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/scmd-pro-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/scmd-pro-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
          globPatterns: ['**/*.{html,js,css,png,svg,webp,ico,woff2}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url, request }) =>
                url.origin === location.origin &&
                !url.pathname.startsWith('/api/') &&
                !url.pathname.startsWith('/socket.io/') &&
                ['script', 'style', 'worker', 'image', 'font'].includes(request.destination),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'scmd-static-assets',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 7 * 24 * 60 * 60,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
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
      port: 5173,
      strictPort: true,
      host: true,
      hmr: false,
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
        },
        '/socket.io': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },

    /* ---------------- PRE-BUNDLE ---------------- */
    // Temporarily disabled to save memory during dev startup
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-is',
        'scheduler',
        'react-helmet-async', // Thêm react-helmet-async vào đây
        '@tanstack/react-query',
        'framer-motion',
        'motion/react',
        'clsx',
        'tailwind-merge',
        'zustand',
        'react-markdown',
        'recharts',
        'lucide-react',
        'leaflet',
      ],
      esbuildOptions: {
        define: {
          'process.env.NODE_ENV': JSON.stringify(mode),
        },
      },
    },

    /* ---------------- BUILD ---------------- */
    build: {
      outDir: 'dist',
      sourcemap: false, 
      emptyOutDir: true,
      minify: 'esbuild', 
      cssMinify: true, 
      cssCodeSplit: true, 
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
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined
            }

            if (
              id.includes('/react/') ||
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('@tanstack/react-query')
            ) {
              return 'vendor-react'
            }

            if (id.includes('react-hot-toast')) {
              return 'vendor-toast'
            }

            if (id.includes('socket.io-client')) {
              return 'vendor-realtime'
            }

            if (id.includes('leaflet')) {
              return 'vendor-maps'
            }

            if (id.includes('recharts')) {
              return 'vendor-charts'
            }

            if (id.includes('framer-motion') || id.includes('motion')) {
              return 'vendor-motion'
            }

            return undefined
          },

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
