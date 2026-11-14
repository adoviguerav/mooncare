import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_URL = 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': API_URL } },
})
