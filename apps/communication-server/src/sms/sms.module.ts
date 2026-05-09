import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { RedisModule } from '../shared/redis/redis.module';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [RedisModule, AuthModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
