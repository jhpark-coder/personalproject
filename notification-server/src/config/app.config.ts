import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // 공통 설정
  name: 'notification-server',
  version: '1.0.0',
  
  // 서버 설정
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
  },

  // CORS 설정
  cors: {
    origins: [
      'http://localhost:8080',
      'http://localhost:4000',
      'http://localhost:5173',
      process.env.FRONTEND_URL || 'http://localhost:8080'
    ],
    credentials: true,
  },

  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.NODE_ENV !== 'production',
  },
})); 