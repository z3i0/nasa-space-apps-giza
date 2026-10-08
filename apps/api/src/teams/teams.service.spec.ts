import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeamsService } from './teams.service.js';
import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { TeamMemberRole, TeamStatus, RequestStatus, TaskStatus } from '@prisma/client';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      team: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      teamMember: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      profile: {
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      teamTask: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      teamInvitation: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      teamJoinRequest: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(mockPrisma);
        }
        return Promise.all(cb);
      }),
    };

    service = new TeamsService(mockPrisma as unknown as PrismaService);
  });

  describe('createTeam', () => {
    it('creates team and assigns creator as leader', async () => {
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);
      mockPrisma.team.findUnique.mockResolvedValue(null);

      const mockCreatedTeam = {
        id: 't-1',
        name: 'Apollo Stars',
        createdById: 'u-1',
        maxMembers: 5,
        members: [{ id: 'm-1', userId: 'u-1', role: TeamMemberRole.leader }],
      };
      mockPrisma.team.create.mockResolvedValue(mockCreatedTeam);
      mockPrisma.profile.upsert.mockResolvedValue({});

      const result = await service.createTeam('u-1', {
        name: 'Apollo Stars',
        challenge: 'Deep Space Exploration',
      });

      expect(result.id).toBe('t-1');
      expect(result.name).toBe('Apollo Stars');
      expect(mockPrisma.team.create).toHaveBeenCalled();
      expect(mockPrisma.profile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u-1' },
          update: { teamStatus: TeamStatus.already_have_team },
        }),
      );
    });

    it('rejects team creation if user already belongs to another team', async () => {
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        id: 'm-1',
        team: { name: 'Existing Team' },
      });

      await expect(
        service.createTeam('u-1', { name: 'New Team' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getMyTeam', () => {
    it('returns team information for a member', async () => {
      const mockTeam = {
        id: 't-1',
        name: 'Super Novas',
        members: [
          { id: 'm-1', userId: 'u-1', role: TeamMemberRole.leader, assignedRole: 'Captain' },
        ],
        tasks: [],
        invitations: [],
        joinRequests: [],
      };
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        userId: 'u-1',
        role: TeamMemberRole.leader,
        assignedRole: 'Captain',
        team: mockTeam,
      });

      const result = await service.getMyTeam('u-1');
      expect(result).toBeDefined();
      expect(result?.myRole).toBe(TeamMemberRole.leader);
      expect(result?.name).toBe('Super Novas');
    });

    it('returns null if user does not belong to any team', async () => {
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);
      const result = await service.getMyTeam('u-unassigned');
      expect(result).toBeNull();
    });
  });

  describe('inviteMember', () => {
    it('allows team leader to invite an unassigned participant', async () => {
      const mockTeam = {
        id: 't-1',
        name: 'Team Rocket',
        maxMembers: 5,
        members: [{ userId: 'leader-1', role: TeamMemberRole.leader }],
      };
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'candidate-1',
        name: 'Sarah Candidate',
        teamMemberships: [],
      });
      mockPrisma.teamInvitation.upsert.mockResolvedValue({
        id: 'inv-1',
        status: RequestStatus.pending,
      });

      const res = await service.inviteMember('t-1', 'leader-1', {
        userId: 'candidate-1',
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.teamInvitation.upsert).toHaveBeenCalled();
    });

    it('rejects invitation if caller is not the team leader', async () => {
      const mockTeam = {
        id: 't-1',
        members: [{ userId: 'member-1', role: TeamMemberRole.member }],
      };
      mockPrisma.team.findUnique.mockResolvedValue(mockTeam);

      await expect(
        service.inviteMember('t-1', 'member-1', { userId: 'candidate-1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Tasks management', () => {
    it('creates a task in the team', async () => {
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        userId: 'u-1',
        teamId: 't-1',
      });
      mockPrisma.teamTask.create.mockResolvedValue({
        id: 'task-1',
        title: 'Design Logo',
        status: TaskStatus.not_started,
      });

      const task = await service.createTask('t-1', 'u-1', {
        title: 'Design Logo',
        status: TaskStatus.not_started,
      });

      expect(task.id).toBe('task-1');
      expect(task.title).toBe('Design Logo');
    });

    it('updates task status', async () => {
      mockPrisma.teamTask.findUnique.mockResolvedValue({
        id: 'task-1',
        teamId: 't-1',
        team: {
          members: [{ userId: 'u-1' }],
        },
      });
      mockPrisma.teamTask.update.mockResolvedValue({
        id: 'task-1',
        status: TaskStatus.completed,
      });

      const updated = await service.updateTask('task-1', 'u-1', {
        status: TaskStatus.completed,
      });

      expect(updated.status).toBe(TaskStatus.completed);
    });
  });
});
