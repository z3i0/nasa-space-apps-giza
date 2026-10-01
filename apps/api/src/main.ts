import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth.js';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();

  // Mount Better Auth handler before body parsers
  expressApp.all('/api/auth/*splat', toNodeHandler(auth));

  // Mount body-parsing middleware for remaining NestJS routes
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));

  // Set global prefix for API routes excluding Better Auth endpoints
  app.setGlobalPrefix('api', {
    exclude: ['api/auth/{*path}'],
  });

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`NestJS API is running on: http://localhost:${port}/api`);
}
await bootstrap();
