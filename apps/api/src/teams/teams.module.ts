import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [TeamsController],
})
export class TeamsModule {}
