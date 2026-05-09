import { registerAs } from '@nestjs/config';

const defaultCorsOrigins = [
  'http://localhost',
  'http://localhost:8080',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:4000',
];

const configuredCorsOrigins = [
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin) && origin !== '*');

export default registerAs('app', () => ({
  name: 'communication-server',
  version: '1.0.0',

  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '127.0.0.1',
  },

  cors: {
    origins:
      configuredCorsOrigins.length > 0
        ? configuredCorsOrigins
        : defaultCorsOrigins,
    credentials: true,
  },

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fitmate',
  },

  websocket: {
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.NODE_ENV !== 'production',
  },
}));
