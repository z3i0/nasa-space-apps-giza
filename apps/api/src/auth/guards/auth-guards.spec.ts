import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { getScoresFilter } from '../helpers/score-query.helper.js';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../types/auth-user.interface.js';
import { auth } from '../auth.js';
vi.mock('../auth.js', () => ({ auth: { api: { getSession: vi.fn() } } }));

describe('Auth & Authorization Guards & Policies', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('AuthGuard', () => {
    let authGuard: AuthGuard;
    let mockPrisma: any;

    beforeEach(() => {
      vi.mocked(auth.api.getSession).mockReset();
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
      mockPrisma = { user: { findUnique: vi.fn() } };
      authGuard = new AuthGuard(reflector, mockPrisma);
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

      await expect(authGuard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('blocks an inactive database user despite a cached valid session', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'user-inactive' },
        session: {},
      } as never);
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

      await expect(authGuard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('blocks a soft-deleted database user despite a cached valid session', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: 'user-deleted' },
        session: {},
      } as never);
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

      await expect(authGuard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  it('does not restore a revoked organizer role from the session cache', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'revoked', role: 'organizer' },
      session: {},
    } as never);
    const db = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: 'revoked',
            role: 'participant',
            isActive: true,
            deletedAt: null,
            roles: [],
            email: 'revoked@example.test',
            name: 'Participant',
          }),
      },
    };
    const request = {
      headers: {},
      user: undefined as AuthenticatedUser | undefined,
    };
    const guard = new AuthGuard(reflector, db as never);
    await guard.canActivate({
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as never);
    expect(request.user?.roles).toEqual(['participant']);
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
