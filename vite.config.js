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
    {
      name: 'dev-csp-patch',
      // Vite 8 sets its own CSP header internally. Patching res.setHeader alone
      // is unreliable because Vite may flush before our wrapper is in place.
      // Patch res.write + res.end instead — these fire right before bytes go out,
      // so we can still mutate headers at that point.
      configureServer(server) {
        const devCSP = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob:",
          "connect-src 'self' ws: wss:",
        ].join('; ');

        server.middlewares.use((_req, res, next) => {
          const forceCSP = () => {
            if (!res.headersSent) {
              res.removeHeader('Content-Security-Policy');
              res.setHeader('Content-Security-Policy', devCSP);
            }
          };
          const origWrite = res.write.bind(res);
          res.write = function (...args) { forceCSP(); return origWrite(...args); };
          const origEnd = res.end.bind(res);
          res.end = function (...args) { forceCSP(); return origEnd(...args); };
          next();
        });
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
