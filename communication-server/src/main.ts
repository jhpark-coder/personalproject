import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  
  // CORS 설정 추가
  const corsOrigins = configService.get('app.cors.origins');
  app.enableCors({
    origin: corsOrigins,
    credentials: configService.get('app.cors.credentials'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  const port = configService.get('app.server.port') || 3000;
  await app.listen(port);
  
  logger.log(`🚀 통신 서버가 실행 중입니다: http://localhost:${port}`);
  logger.log(`📡 WebSocket 서버: ws://localhost:${port}`);
  logger.log(`🌐 CORS 허용 도메인: ${corsOrigins.join(', ')}`);
  logger.log(`📊 환경: ${configService.get('NODE_ENV') || 'development'}`);
}
bootstrap();
