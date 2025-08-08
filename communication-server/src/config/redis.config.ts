import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'fitmate:',
  
  // OTP 관련 설정
  otp: {
    ttl: parseInt(process.env.OTP_TTL || '300'), // 5분
    prefix: 'otp:',
    rateLimitPrefix: 'rate_limit:',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1분
    maxAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '5'), // 1시간에 최대 5회
  },
})); 