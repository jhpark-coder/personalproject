import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import * as nodeCrypto from 'node:crypto';
import * as path from 'path';
import { AppModule } from './app.module';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: nodeCrypto,
    configurable: true,
  });
}

const envFile = path.join(
  process.cwd(),
  `.env.${process.env.NODE_ENV || 'development'}`,
);
dotenv.config({ path: envFile });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const corsOrigins = configService.get<string[]>('app.cors.origins') || [];
  const credentials = !!configService.get('app.cors.credentials');

  app.enableCors({
    origin: corsOrigins,
    credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
  });

  const port = configService.get('app.server.port') || 3000;
  await app.listen(port);

  logger.log(`Communication server is running: http://localhost:${port}`);
  logger.log(`WebSocket server is running: ws://localhost:${port}`);
  logger.log(`CORS origins: ${corsOrigins.join(', ')}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
