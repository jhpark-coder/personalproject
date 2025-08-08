import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = this.configService.get('redis');
    
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password || undefined,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    } as any);

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis ready for commands');
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  getClient(): Redis {
    return this.redis;
  }

  // OTP 저장
  async setOtp(phone: string, code: string, ttl: number = 300): Promise<void> {
    const otpConfig = this.configService.get('redis.otp');
    const key = `${otpConfig.prefix}${phone}`;
    await this.redis.setex(key, ttl, code);
  }

  // OTP 조회
  async getOtp(phone: string): Promise<string | null> {
    const otpConfig = this.configService.get('redis.otp');
    const key = `${otpConfig.prefix}${phone}`;
    return await this.redis.get(key);
  }

  // OTP 삭제
  async deleteOtp(phone: string): Promise<void> {
    const otpConfig = this.configService.get('redis.otp');
    const key = `${otpConfig.prefix}${phone}`;
    await this.redis.del(key);
  }

  // 레이트 리밋 체크
  async checkRateLimit(phone: string): Promise<{ allowed: boolean; remainingTime?: number }> {
    const otpConfig = this.configService.get('redis.otp');
    const rateLimitKey = `${otpConfig.rateLimitPrefix}${phone}`;
    
    const attempts = await this.redis.get(rateLimitKey);
    if (!attempts) {
      return { allowed: true };
    }

    const attemptCount = parseInt(attempts);
    if (attemptCount >= otpConfig.maxAttempts) {
      const ttl = await this.redis.ttl(rateLimitKey);
      return { allowed: false, remainingTime: ttl };
    }

    return { allowed: true };
  }

  // 레이트 리밋 증가
  async incrementRateLimit(phone: string, windowMs: number = 60000): Promise<void> {
    const otpConfig = this.configService.get('redis.otp');
    const rateLimitKey = `${otpConfig.rateLimitPrefix}${phone}`;
    
    const multi = this.redis.multi();
    multi.incr(rateLimitKey);
    multi.expire(rateLimitKey, Math.ceil(windowMs / 1000));
    await multi.exec();
  }

  // 만료된 키 정리
  async cleanupExpiredKeys(): Promise<number> {
    const otpConfig = this.configService.get('redis.otp');
    const pattern = `${otpConfig.prefix}*`;
    
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return 0;

    const expiredKeys: string[] = [];
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl <= 0) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      await this.redis.del(...expiredKeys);
    }

    return expiredKeys.length;
  }
} 