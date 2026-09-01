import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // No /api proxy: the app calls each backend's absolute URL directly
    // (see src/constants/environments.js) so it can switch between the QA
    // and PROD backends at runtime — each still locked to its own AWS
    // profile server-side.
  },
})
