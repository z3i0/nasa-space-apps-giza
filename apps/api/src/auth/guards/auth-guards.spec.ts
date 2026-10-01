import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { TeamLeaderGuard } from './team-leader.guard.js';
import { TeamMemberGuard } from './team-member.guard.js';
import { getScoresFilter } from '../helpers/score-query.helper.js';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../types/auth-user.interface.js';

describe('Auth & Authorization Guards & Policies', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('AuthGuard', () => {
    let authGuard: AuthGuard;
    let mockJwt: any;
    let mockPrisma: any;

    beforeEach(() => {
      mockJwt = { verifyAsync: vi.fn() };
      mockPrisma = { user: { findUnique: vi.fn() } };
      authGuard = new AuthGuard(reflector, mockJwt, mockPrisma);
    });

    it('allows public endpoints marked with @Public()', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({ getRequest: () => ({}) }),
      };

      expect(await authGuard.canActivate(ctx)).toBe(true);
    });

    it('throws UnauthorizedException when Authorization header is missing', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      };

      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('blocks inactive user even with valid JWT token', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-inactive' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-inactive',
        isActive: false, // Inactive
        deletedAt: null,
        roles: [],
      });

      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer valid.jwt.token' },
          }),
        }),
      };

      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('blocks soft-deleted user even with valid JWT token', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-deleted' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-deleted',
        isActive: true,
        deletedAt: new Date(), // Soft deleted
        roles: [],
      });

      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer valid.jwt.token' },
          }),
        }),
      };

      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('RolesGuard (RBAC)', () => {
    let rolesGuard: RolesGuard;

    beforeEach(() => {
      rolesGuard = new RolesGuard(reflector);
    });

    it('blocks participant from admin routes (requireRole organizer)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['organizer']);

      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'p-1',
              roles: ['participant'],
            },
          }),
        }),
      };

      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('allows organizer to access organizer-only admin routes', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['organizer']);

      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'org-1',
              roles: ['organizer'],
            },
          }),
        }),
      };

      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });
  });

  describe('TeamLeaderGuard (Contextual Team Leader Check)', () => {
    let leaderGuard: TeamLeaderGuard;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = { teamMember: { findUnique: vi.fn() } };
      leaderGuard = new TeamLeaderGuard(reflector, mockPrisma);
    });

    it('blocks regular member from leader-only route', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: 'team-1',
        userId: 'member-1',
        teamRole: 'MEMBER', // Not leader
      });

      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'member-1', roles: ['participant'] },
            params: { teamId: 'team-1' },
          }),
        }),
      };

      await expect(leaderGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('allows designated team leader on leader-only route', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: 'team-1',
        userId: 'leader-1',
        teamRole: 'LEADER',
      });

      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'leader-1', roles: ['participant'] },
            params: { teamId: 'team-1' },
          }),
        }),
      };

      expect(await leaderGuard.canActivate(ctx)).toBe(true);
    });

    it('allows organizer to bypass leader requirement', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'org-1', roles: ['organizer'] },
            params: { teamId: 'team-1' },
          }),
        }),
      };

      expect(await leaderGuard.canActivate(ctx)).toBe(true);
    });
  });

  describe('TeamMemberGuard (Team Membership Check)', () => {
    let memberGuard: TeamMemberGuard;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = { teamMember: { findUnique: vi.fn() } };
      memberGuard = new TeamMemberGuard(reflector, mockPrisma);
    });

    it('blocks user who is not a member of the team', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);

      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'outsider-1', roles: ['participant'] },
            params: { teamId: 'team-99' },
          }),
        }),
      };

      await expect(memberGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('allows team member to access team resource', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        teamId: 'team-1',
        userId: 'user-1',
      });

      const ctx: any = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-1', roles: ['participant'] },
            params: { teamId: 'team-1' },
          }),
        }),
      };

      expect(await memberGuard.canActivate(ctx)).toBe(true);
    });
  });

  describe('Scores Isolation Helper Policy (getScoresFilter)', () => {
    it('CRITICAL: judge is strictly filtered by judgeId = user.id (cannot see other judges)', () => {
      const judge: AuthenticatedUser = {
        id: 'judge-42',
        name: 'Evaluating Judge',
        email: 'judge@hackathon.local',
        roles: ['judge'],
      };

      const filter = getScoresFilter(judge, { teamId: 'team-alpha' });
      expect(filter).toEqual({
        teamId: 'team-alpha',
        judgeId: 'judge-42',
      });
      expect(filter.judgeId).toBe('judge-42');
    });

    it('organizer can view all scores across all judges and teams', () => {
      const organizer: AuthenticatedUser = {
        id: 'org-1',
        name: 'Admin Organizer',
        email: 'organizer@hackathon.local',
        roles: ['organizer'],
      };

      const filter = getScoresFilter(organizer, { teamId: 'team-alpha' });
      expect(filter).toEqual({
        teamId: 'team-alpha',
      });
      expect(filter.judgeId).toBeUndefined();
    });

    it('participant without scoring role is forbidden', () => {
      const participant: AuthenticatedUser = {
        id: 'p-1',
        name: 'Competitor',
        email: 'p@hackathon.local',
        roles: ['participant'],
      };

      expect(() => getScoresFilter(participant)).toThrow(ForbiddenException);
    });
  });
});
