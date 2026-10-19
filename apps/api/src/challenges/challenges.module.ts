import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller.js';
import { ChallengesService } from './challenges.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
