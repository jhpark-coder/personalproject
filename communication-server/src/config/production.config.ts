import { registerAs } from '@nestjs/config';

export default registerAs('production', () => ({
  // 배포 환경 설정
  environment: 'production',
  
  // MongoDB 설정 (배포용)
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://mongo:27017/communication-server',
      database: process.env.MONGODB_DATABASE || 'communication-server',
      host: process.env.MONGODB_HOST || 'mongo',
      port: process.env.MONGODB_PORT || '27017',
    },
  },

  // SMS 설정 (배포용 - 실제 SMS 발송)
  sms: {
    apiKey: process.env.SMS_API_KEY,
    secretKey: process.env.SMS_SECRET_KEY,
    serviceId: process.env.SMS_SERVICE_ID,
    enabled: true, // 배포에서는 SMS 활성화
  },

  // 로깅 설정 (배포용)
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: false,
    enableFile: true,
    logFile: process.env.LOG_FILE || '/var/log/notification-server/app.log',
  },

  // 배포 환경 특화 설정
  prod: {
    hotReload: false,
    debugMode: false,
    mockSms: false,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15분
      max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 최대 요청 수
    },
  },
})); 