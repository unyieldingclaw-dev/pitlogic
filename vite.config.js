import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-public-at-base',
      configureServer(server) {
        // Vite serves public/ from root (/manifest.json) but the app base is
        // /rfx-cook-tracker/, so the browser requests /rfx-cook-tracker/manifest.json.
        // This middleware bridges the gap in dev only.
        server.middlewares.use((req, res, next) => {
          const base = '/rfx-cook-tracker/';
          if (req.url?.startsWith(base)) {
            const file = path.resolve('public', req.url.slice(base.length).split('?')[0]);
            if (fs.existsSync(file) && fs.statSync(file).isFile()) {
              res.setHeader('Content-Type', mime(file));
              res.end(fs.readFileSync(file));
              return;
            }
          }
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

function mime(file) {
  const ext = path.extname(file);
  return { '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }[ext] ?? 'text/plain';
}
