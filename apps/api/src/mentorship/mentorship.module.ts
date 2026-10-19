import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MentorshipController } from './mentorship.controller.js';
import { MentorshipService } from './mentorship.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [MentorshipController],
  providers: [MentorshipService],
})
export class MentorshipModule {}
