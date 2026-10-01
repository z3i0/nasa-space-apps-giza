import { Module, Global } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AuthGuard } from './guards/auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { LastSeenMiddleware } from './middleware/last-seen.middleware.js';

@Global()
@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
  ],
  controllers: [AuthController, AdminUsersController],
  providers: [
    AuthService,
    AuthGuard,
    RolesGuard,
    LastSeenMiddleware,
  ],
  exports: [
    AuthService,
    AuthGuard,
    RolesGuard,
    LastSeenMiddleware,
  ],
})
export class AuthModule {}
