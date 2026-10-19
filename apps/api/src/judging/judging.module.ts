import { Module } from '@nestjs/common';
import { JudgingService } from './judging.service.js';
import { JudgingController } from './judging.controller.js';
import { AuthModule } from '../auth/auth.module.js';
@Module({
  imports: [AuthModule],
  providers: [JudgingService],
  controllers: [JudgingController],
})
export class JudgingModule {}
