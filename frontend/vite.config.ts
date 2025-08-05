import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',  // 모든 네트워크 인터페이스에서 접근 가능
    https: {
      key: '../cert.key',
      cert: '../cert.crt'
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom']
        }
      }
    }
  },
  define: {
    'process.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:8080'),
    'process.env.VITE_DEV_MODE': JSON.stringify('true')
  }
})
