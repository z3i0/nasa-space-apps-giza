import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppLoggerService } from './app-logger.service.js';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let responseBody: any;
    if (isHttpException) {
      responseBody = exception.getResponse();
    } else if (exception instanceof Error) {
      responseBody = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        error: exception.name || 'Internal Server Error',
      };
    } else {
      responseBody = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }

    const message =
      typeof responseBody === 'object' && responseBody !== null
        ? responseBody.message || responseBody
        : responseBody;

    const errorName =
      typeof responseBody === 'object' && responseBody !== null && responseBody.error
        ? responseBody.error
        : isHttpException
          ? exception.name
          : 'InternalServerError';

    // Extract authenticated user if available
    const user = (request as any).user;
    const userId = user?.id || null;
    const userRole = user?.role || user?.roles || null;

    const clientIp =
      request.headers['x-forwarded-for'] ||
      request.socket?.remoteAddress ||
      'unknown';

    const logPayload = {
      statusCode: status,
      method: request.method,
      path: request.url,
      userId,
      userRole,
      ip: clientIp,
      error: message,
      errorName,
      body: request.method !== 'GET' ? request.body : undefined,
    };

    const summary = `[HTTP ${status}] ${request.method} ${request.url} - ${typeof message === 'object' ? JSON.stringify(message) : message}`;

    // Log severity: 500+ as error with stack trace; 4xx as warning
    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        {
          message: summary,
          ...logPayload,
        },
        stack,
        'AllExceptionsFilter',
      );
    } else {
      this.logger.warn(
        {
          message: summary,
          ...logPayload,
        },
        'AllExceptionsFilter',
      );
    }

    // Send formatted JSON response to client
    if (typeof responseBody === 'object' && responseBody !== null) {
      response.status(status).json({
        ...responseBody,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message,
        error: errorName,
      });
    }
  }
}
