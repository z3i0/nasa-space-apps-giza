import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EventsService } from './events.service.js';
import { WebPushService } from './web-push.service.js';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [EventsService, WebPushService],
  exports: [EventsService, WebPushService],
})
export class EventsModule {}

