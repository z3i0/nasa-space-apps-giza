import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';
import { SubmissionsService } from './submissions.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [TeamsController],
  providers: [TeamsService, SubmissionsService],
  exports: [TeamsService],
})
export class TeamsModule {}
