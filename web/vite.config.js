import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../web-dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/product': 'http://localhost:8000',
      '/products': 'http://localhost:8000',
      '/show': 'http://localhost:8000',
      '/category': 'http://localhost:8000',
      '/categories': 'http://localhost:8000',
      '/unit': 'http://localhost:8000',
      '/units': 'http://localhost:8000',
    },
  },
})
