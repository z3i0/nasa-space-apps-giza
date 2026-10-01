import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { auth } from '../auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import type { AuthenticatedUser } from '../types/auth-user.interface.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Validate session via Better Auth (supports both cookies and Authorization: Bearer <token>)
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Authentication token missing or invalid');
    }

    const user = session.user as any;

    if (!user.isActive || user.deletedAt !== null) {
      throw new UnauthorizedException('Account is deactivated or deleted');
    }

    const primaryRole = user.role || 'participant';

    // Fetch user roles
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    const roles: string[] =
      dbUser?.roles && dbUser.roles.length > 0
        ? dbUser.roles.map((r) => r.role.name)
        : [primaryRole];

    const authUser: AuthenticatedUser = {
      id: user.id,
      name: user.name || '',
      email: user.email,
      phone: user.phone || null,
      roles,
    };

    request.user = authUser;
    request.session = session.session;
    return true;
  }
}
