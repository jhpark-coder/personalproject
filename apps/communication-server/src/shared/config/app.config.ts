import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // 공통 설정
  name: 'communication-server',
  version: '1.0.0',

  // 서버 설정
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '127.0.0.1',
  },

  // CORS 설정
  cors: {
    origins: [
      'http://localhost:8080', // Spring Boot 백엔드
      'http://localhost:5173', // React 프론트엔드 (HTTP)
      'https://localhost:5173', // React 프론트엔드 (HTTPS)
      'http://localhost:4000', // 추가 프론트엔드
      process.env.FRONTEND_URL || 'http://localhost:8080',
      process.env.NODE_ENV === 'development' ? '*' : undefined,
    ].filter(Boolean),
    credentials: true,
  },

  // MongoDB 설정
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fitmate',
  },

  // WebSocket 설정
  websocket: {
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  },

  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.NODE_ENV !== 'production',
  },
}));
