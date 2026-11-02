import * as dotenv from 'dotenv';
import * as path from 'path';

// Đảm bảo nạp đầy đủ biến môi trường từ apps/api/.env và root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  const config = new DocumentBuilder()
    .setTitle('TOPRunAssistant API')
    .setDescription(
      'REST API & Strava Webhook Engine cho nền tảng Quản lý Chạy bộ, Challenge & Virtual Race (Android, iOS, Web)'
    )
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 TOPRunAssistant API is running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Interactive Swagger Docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();

