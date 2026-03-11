import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as nodeCrypto from 'node:crypto';
import * as path from 'path';

// Polyfill global crypto for environments where it's not defined
// This allows libraries calling `crypto.randomUUID()` to work in Node.js
// without relying on `globalThis.crypto` being present as a global binding.

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: nodeCrypto,
    configurable: true,
  });
}

// 환경 변수 수동 로드
const envFile = path.join(
  process.cwd(),
  `.env.${process.env.NODE_ENV || 'development'}`,
);
console.log('Loading env file:', envFile);
dotenv.config({ path: envFile });

// 기본 .env 파일도 로드
dotenv.config({ path: path.join(process.cwd(), '.env') });

console.log(
  'Environment loaded. TWILIO_ACCOUNT_SID:',
  !!process.env.TWILIO_ACCOUNT_SID,
);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // CORS 설정 추가
  const corsOrigins = configService.get<string[]>('app.cors.origins') || [];
  const credentials = !!configService.get('app.cors.credentials');
  const useReflectOrigin = corsOrigins.includes('*');

  app.enableCors({
    origin: useReflectOrigin ? true : corsOrigins,
    credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = configService.get('app.server.port') || 3000;
  await app.listen(port);

  logger.log(`🚀 통신 서버가 실행 중입니다: http://localhost:${port}`);
  logger.log(`📡 WebSocket 서버: ws://localhost:${port}`);
  logger.log(
    `🌐 CORS 허용 도메인: ${useReflectOrigin ? '[reflect request origin]' : corsOrigins.join(', ')}`,
  );
  logger.log(`📊 환경: ${configService.get('NODE_ENV') || 'development'}`);
}
bootstrap();
