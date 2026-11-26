import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(process.env.VITEST
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'script-defer',
            strategies: 'generateSW',
            devOptions: { enabled: false },
            includeAssets: [],
            workbox: {
              globPatterns: ['**/*.{js,css,html,woff2,png,txt}'],
              maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
              navigateFallback: '/index.html',
              cleanupOutdatedCaches: true,
            },
            manifest: {
              name: 'Haunted Candy Jar',
              short_name: 'Candy Jar',
              description: 'A spooky to-do jar where tasks are candies.',
              display: 'standalone',
              start_url: '/',
              scope: '/',
              theme_color: '#1a0a2e',
              background_color: '#0d0514',
              orientation: 'any',
              icons: [
                { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
          }),
        ]),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: true,
  },
})
