import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/communication-server',
    database: process.env.MONGODB_DATABASE || 'communication-server',
    host: process.env.MONGODB_HOST || 'localhost',
    port: process.env.MONGODB_PORT || '27017',
  },
  sms: {
    apiKey: process.env.SMS_API_KEY,
    secretKey: process.env.SMS_SECRET_KEY,
    serviceId: process.env.SMS_SERVICE_ID,
  },
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
  },
}));
