import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth.js';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

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

  const betterAuthHandler = toNodeHandler(auth);
  const nestAuthRoutes = new Set([
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ]);

  // Mount Better Auth handler for Better Auth specific routes
  expressApp.all('/api/auth/*splat', (req: Request, res: Response, next: NextFunction) => {
    if (nestAuthRoutes.has(req.path)) {
      return next();
    }
    return betterAuthHandler(req, res);
  });

  // Mount body-parsing middleware for remaining NestJS routes
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));

  // Set global prefix for API routes
  app.setGlobalPrefix('api');

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
