import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  define: {
    'process.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:8080'),
    'process.env.VITE_DEV_MODE': JSON.stringify('true')
  }
})
