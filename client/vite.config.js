import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Shell builds (APK / EXE) load the UI from the device itself — no PWA
    // service worker or install manifest needed there.
    ...(mode === 'shell'
      ? []
      : [
          VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'व्यापार साथी — POS',
        short_name: 'Vyapar Saathi',
        description: 'Billing, expenses & analytics for every business — works online and offline',
        theme_color: '#D94F70',
        background_color: '#FFF8F1',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Menu + settings + lists load from cache when offline
            urlPattern: ({ request, url }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],        },
      }),
        ]),
  ],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5050' },
  },
  preview: { port: 4173, proxy: { '/api': 'http://localhost:5050' } },
}));
