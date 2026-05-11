import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-manifest-path',
      // In dev, Vite serves public/ from root (/manifest.json).
      // The base is /rfx-cook-tracker/, so %BASE_URL%manifest.json would
      // resolve to /rfx-cook-tracker/manifest.json — a path Vite can't serve.
      // In dev only, rewrite to /manifest.json before Vite expands %BASE_URL%.
      transformIndexHtml: {
        order: 'pre',
        handler(html, ctx) {
          if (ctx.server) {
            return html
              .replace('%BASE_URL%manifest.json', '/manifest.json')
              .replace('%BASE_URL%icon.svg', '/icon.svg');
          }
          return html;
        },
      },
    },
  ],
  base: '/rfx-cook-tracker/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
