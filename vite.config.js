import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-manifest-path',
      // In dev, Vite serves public/ from root (/manifest.json).
      // The base is /pitlogic/, so %BASE_URL%manifest.json would
      // resolve to /pitlogic/manifest.json — a path Vite can't serve.
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
  base: '/pitlogic/',
  server: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "connect-src 'self' ws: wss:",
      ].join('; '),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    exclude: ['**/node_modules/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
