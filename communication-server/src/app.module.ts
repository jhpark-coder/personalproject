import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommunicationModule } from './communication/communication.module';
import { SmsModule } from './sms/sms.module';
import { NotificationsModule } from './notifications/notifications.module';
import * as path from 'path';

// 환경별 설정 파일들
import appConfig from './config/app.config';
import developmentConfig from './config/development.config';
import productionConfig from './config/production.config';
import redisConfig from './config/redis.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        redisConfig,
        databaseConfig,
        // 환경에 따라 적절한 설정 로드
        process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig,
      ],
      envFilePath: [
        path.join(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`),
        path.join(process.cwd(), '.env'),
      ],
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongodb.uri') || process.env.MONGODB_URI || 'mongodb://localhost:27017/communication-server-dev',
      }),
      inject: [ConfigService],
    }),
    CommunicationModule,
    SmsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
