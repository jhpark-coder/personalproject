import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    base: '/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: '../resources/static/chat-manager',
        emptyOutDir: true,
        chunkSizeWarningLimit: 1000,
    },
    server: {
        port: 5173,
        proxy: {
            '/chat-manager/api': {
                target: process.env.VITE_APP_SERVER_URL || 'http://localhost:8080',
                changeOrigin: true,
                cookieDomainRewrite: ""
            },
            '/api': {
                target: process.env.VITE_APP_SERVER_URL || 'http://localhost:8080',
                changeOrigin: true,
                cookieDomainRewrite: ""
            }
        }
    }
}) 