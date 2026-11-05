import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

@Global()
@Module({
  providers: [AppLoggerService, AllExceptionsFilter],
  exports: [AppLoggerService, AllExceptionsFilter],
})
export class LoggerModule {}

