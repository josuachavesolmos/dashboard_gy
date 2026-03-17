import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/dashboard_gy/',
  server: {
    port: 53000,
  },
  build: {
    outDir: 'build',
  },
})
