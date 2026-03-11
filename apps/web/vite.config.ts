import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    // 터널 도메인 및 로컬 접근 허용 (loca.lt 전 도메인 허용)
    allowedHosts: ['.loca.lt', '.ngrok-free.app', '.trycloudflare.com', 'localhost', '192.168.50.28'],
    // HTTPS 터널 환경에서 HMR 안정화: 호스트는 자동으로 현재 호스트 사용
    hmr: {
      protocol: 'wss',
      clientPort: 443
    },
    proxy: {
      // 백엔드(Spring, 8080)는 /api/** 등 일반 REST
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
      '/oauth2': {
        target: 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
      '/login': {
        target: 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
      '/test': {
        target: 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
      // 통신 서버(Nest, 3000)는 알림/소켓/SMS
      '/api/notifications': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/sms': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
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
  }
})
