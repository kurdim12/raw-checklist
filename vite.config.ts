import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'Raw Smith Ops',
      short_name: 'Raw Ops',
      description: 'Checklist, inventory, and schedule for Raw Smith cafe.',
      theme_color: '#6F6B40',
      background_color: '#6F6B40',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      // Intentionally NOT setting navigateFallback: vite-plugin-pwa
      // translates it into a NavigationRoute(createHandlerBoundToURL)
      // that is registered before runtimeCaching and serves the
      // precached index.html for every navigation — which is exactly
      // the "blank olive page after deploy" bug, because that
      // precached HTML still references deleted asset hashes. The
      // NetworkFirst rule below handles navigations instead, and
      // falls back to its own cache for offline.
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'navigation',
            networkTimeoutSeconds: 3,
          },
        },
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/rest/v1/'),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-rest',
            networkTimeoutSeconds: 4,
            expiration: { maxAgeSeconds: 60 * 60 * 24 },
          },
        },
      ],
    },
  }), cloudflare()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});