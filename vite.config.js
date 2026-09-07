import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/1971/',
  build: {
    outDir: 'dist'
  },
  server: {
    proxy: {
      '/api/fred': {
        target: 'https://api.stlouisfed.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fred/, '')
      },
      '/api/bls': {
        target: 'https://api.bls.gov/publicAPI/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bls/, '')
      },
      '/api/bea': {
        target: 'https://apps.bea.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bea/, '/api/data')
      }
    }
  }
})
