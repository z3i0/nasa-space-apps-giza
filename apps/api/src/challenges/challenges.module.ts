import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ChallengesController } from './challenges.controller.js';
import { ChallengesService } from './challenges.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
})
export class ChallengesModule {}
