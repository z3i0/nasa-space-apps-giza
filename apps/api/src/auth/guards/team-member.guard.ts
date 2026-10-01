import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_TEAM_MEMBER_KEY } from '../decorators/team-member.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../types/auth-user.interface.js';

@Injectable()
export class TeamMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isRequired = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_TEAM_MEMBER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Organizers have global access
    if (user.roles?.includes('organizer')) {
      return true;
    }

    const teamId =
      request.params?.teamId ||
      request.params?.id ||
      request.body?.teamId ||
      request.query?.teamId;

    if (!teamId) {
      throw new BadRequestException('teamId parameter must be provided');
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: String(teamId),
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Action denied: You must be a member of this team to access this resource.',
      );
    }

    return true;
  }
}
