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
      globPatterns: ['**/*.{js,css,svg,png,woff2}'],
      // Replace the previous SW immediately so users don't get stuck on
      // a stale index.html pointing at deleted JS chunks.
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/rest\/v1\//, /^\/auth\/v1\//],
      runtimeCaching: [
        {
          // Always fetch fresh HTML for navigations — falls back to the
          // cached index.html only when offline. Fixes the "blank olive
          // page on refresh after deploy" bug where the precached
          // index.html still pointed at old JS chunk hashes that 404.
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