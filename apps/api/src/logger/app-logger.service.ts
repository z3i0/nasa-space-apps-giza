import { Injectable, LoggerService } from '@nestjs/common';
import winston from 'winston';
import { createWinstonLogger } from './winston.config.js';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = createWinstonLogger();
  }

  log(message: any, context?: string) {
    if (typeof message === 'object') {
      this.logger.info(message.message || 'Log', { context, ...message });
    } else {
      this.logger.info(String(message), { context });
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (typeof message === 'object') {
      this.logger.error(message.message || 'Error', {
        context,
        trace,
        ...message,
      });
    } else {
      this.logger.error(String(message), { trace, context });
    }
  }

  warn(message: any, context?: string) {
    if (typeof message === 'object') {
      this.logger.warn(message.message || 'Warning', { context, ...message });
    } else {
      this.logger.warn(String(message), { context });
    }
  }

  debug?(message: any, context?: string) {
    if (typeof message === 'object') {
      this.logger.debug(message.message || 'Debug', { context, ...message });
    } else {
      this.logger.debug(String(message), { context });
    }
  }

  verbose?(message: any, context?: string) {
    if (typeof message === 'object') {
      this.logger.verbose(message.message || 'Verbose', {
        context,
        ...message,
      });
    } else {
      this.logger.verbose(String(message), { context });
    }
  }

  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

