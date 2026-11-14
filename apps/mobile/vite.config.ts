import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The crew app talks only to the MOON server. In development Vite proxies /api to it, so the page and the API
// share one origin and the session cookie works without CORS. Deployed, the same origin serves both.
const MOON_API_URL = process.env.MOON_API_URL ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@mooncare/api': fileURLToPath(new URL('../../packages/api-client/src/index.ts', import.meta.url)) },
  },
  server: { port: 5174, proxy: { '/api': MOON_API_URL } },
  preview: { port: 4174, proxy: { '/api': MOON_API_URL } },
})
