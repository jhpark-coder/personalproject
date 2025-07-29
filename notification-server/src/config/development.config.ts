import { registerAs } from '@nestjs/config';

export default registerAs('development', () => ({
  // 개발 환경 설정
  environment: 'development',
  
  // MongoDB 설정 (개발용)
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/communication-server-dev',
      database: process.env.MONGODB_DATABASE || 'communication-server-dev',
      host: process.env.MONGODB_HOST || 'localhost',
      port: process.env.MONGODB_PORT || '27017',
    },
  },

  // SMS 설정 (개발용 - 테스트용)
  sms: {
    apiKey: process.env.SMS_API_KEY || 'dev_sms_api_key',
    secretKey: process.env.SMS_SECRET_KEY || 'dev_sms_secret_key',
    serviceId: process.env.SMS_SERVICE_ID || 'dev_sms_service_id',
    enabled: false, // 개발에서는 SMS 비활성화
  },

  // 로깅 설정 (개발용)
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    enableConsole: true,
    enableFile: false,
  },

  // 개발 환경 특화 설정
  dev: {
    hotReload: true,
    debugMode: true,
    mockSms: true, // SMS 모킹
  },
})); 