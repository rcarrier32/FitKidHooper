import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/FitKidHooper/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Fit Kid Hooper',
        short_name: 'FKH',
        description: 'Youth basketball training app — FKH',
        theme_color: '#060b14',
        background_color: '#060b14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/FitKidHooper/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: 'index.html',
        // Web push handlers (push + notificationclick) folded into the SW.
        importScripts: ['push-sw.js'],
      },
    }),
  ],
})
