import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Shyam Timber and Plywoods',
        short_name: 'Shyam Timber',
        description: 'Plywood, timber, laminates and doors in Porur, Chennai. Offers, tips and refer & earn rewards.',
        theme_color: '#4A2F1B',
        background_color: '#F6EFE3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['shopping', 'business'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/, /^\/p\//, /^\/uploads/],
        runtimeCaching: [
          { urlPattern: /\/api\/v1\/(posts|public)/, handler: 'NetworkFirst', options: { cacheName: 'api', networkTimeoutSeconds: 5, expiration: { maxEntries: 60, maxAgeSeconds: 3600 } } },
          { urlPattern: /\.(?:png|jpg|jpeg|webp|svg)$/, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/, handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts' } },
        ],
      },
    }),
  ],
  resolve: { alias: { '@shared': path.resolve(__dirname, '../shared'), '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173, host: true, fs: { allow: ['..'] } },
});
