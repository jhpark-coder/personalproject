import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';

// 환경별 설정 파일들
import appConfig from './config/app.config';
import developmentConfig from './config/development.config';
import productionConfig from './config/production.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        // 환경에 따라 적절한 설정 로드
        process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig,
      ],
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const env = process.env.NODE_ENV || 'development';
        const configKey = env === 'production' ? 'production' : 'development';
        const config = configService.get(configKey);
        
        if (!config?.database?.mongodb?.uri) {
          console.warn(`MongoDB URI not found in ${configKey} configuration, using default`);
          return {
            uri: 'mongodb://localhost:27017/communication-server-dev',
          };
        }
        
        return {
          uri: config.database.mongodb.uri,
        };
      },
      inject: [ConfigService],
    }),
    NotificationsModule, 
    ChatModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
