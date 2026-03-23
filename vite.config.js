import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      // manifest/service worker はこのプラグインが自動生成します
      manifest: {
        name: 'Task Triage',
        short_name: 'Task Triage',
        description:
          'タスクをスコアリングして、今日の優先順位をすばやく決めるアプリ。',
        theme_color: '#4f46e5',
        background_color: '#4f46e5',
        display: 'standalone',
      },
      pwaAssets: {
        preset: 'minimal-2023',
        // このSVGから 192/512 などのアイコンを生成します
        image: 'public/logo.svg',
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'documents',
              expiration: {
                maxEntries: 50,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
});

