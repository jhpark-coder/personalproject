import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS 설정 추가
  app.enableCors({
    origin: [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4000',
      'file://'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Notification server is running on: http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
