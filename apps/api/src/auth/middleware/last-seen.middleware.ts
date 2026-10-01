import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../types/auth-user.interface.js';

@Injectable()
export class LastSeenMiddleware implements NestMiddleware {
  // In-memory cache mapping userId -> timestamp of last DB update
  private static readonly updateThrottleMap = new Map<string, number>();
  private static readonly THROTTLE_MS = 60 * 1000; // 1 minute throttle

  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // If request has an authenticated user attached
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id;

    if (userId) {
      const now = Date.now();
      const lastUpdated = LastSeenMiddleware.updateThrottleMap.get(userId) || 0;

      if (now - lastUpdated >= LastSeenMiddleware.THROTTLE_MS) {
        LastSeenMiddleware.updateThrottleMap.set(userId, now);

        // Update database asynchronously without blocking response
        this.prisma.user
          .update({
            where: { id: userId },
            data: { lastSeenAt: new Date() },
          })
          .catch(() => {
            // Silently ignore background tracking errors
          });

        // Periodic map cleanup if it exceeds 10,000 entries
        if (LastSeenMiddleware.updateThrottleMap.size > 10000) {
          const expirationCutoff = now - LastSeenMiddleware.THROTTLE_MS * 5;
          for (const [id, ts] of LastSeenMiddleware.updateThrottleMap.entries()) {
            if (ts < expirationCutoff) {
              LastSeenMiddleware.updateThrottleMap.delete(id);
            }
          }
        }
      }
    }

    next();
  }
}
