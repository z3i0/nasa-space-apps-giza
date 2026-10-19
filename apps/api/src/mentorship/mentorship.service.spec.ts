import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { MentorshipService } from './mentorship.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('MentorshipService access and state', () => {
  for (const userId of [
    'assigned-mentor',
    'teammate-one',
    'teammate-two',
    'other-mentor',
    'other-participant',
    'former-member',
  ]) {
    const allowed = [
      'assigned-mentor',
      'teammate-one',
      'teammate-two',
    ].includes(userId);
    it(`${allowed ? 'allows' : 'denies'} conversation reads and writes for ${userId}`, async () => {
      const db = {
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValue({
              role: 'mentor',
              isActive: true,
              deletedAt: null,
              roles: [],
            }),
        },
        mentorshipRequest: {
          findUnique: vi.fn().mockImplementation(({ include }) =>
            Promise.resolve({
              id: 'request',
              teamId: 'team',
              mentorId: 'assigned-mentor',
              status: 'accepted',
              team: {
                members: ['teammate-one', 'teammate-two'].includes(
                  include.team.select.members.where.userId,
                )
                  ? [{ id: 'membership' }]
                  : [],
              },
            }),
          ),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        mentorshipMessage: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'sent' }),
        },
      };
      const prisma = {
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValue({
              role: 'mentor',
              isActive: true,
              deletedAt: null,
              roles: [],
            }),
        },
        ...db,
        $transaction: (fn: (tx: typeof db) => Promise<unknown>) => fn(db),
      } as unknown as PrismaService;
      const service = new MentorshipService(prisma);
      if (allowed) {
        await expect(service.messages('request', userId)).resolves.toEqual([]);
        await expect(
          service.send('request', userId, 'Team guidance'),
        ).resolves.toEqual({ id: 'sent' });
      } else {
        await expect(
          service.messages('request', userId),
        ).rejects.toBeInstanceOf(ForbiddenException);
        await expect(
          service.send('request', userId, 'Team guidance'),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(db.mentorshipMessage.findMany).not.toHaveBeenCalled();
        expect(db.mentorshipMessage.create).not.toHaveBeenCalled();
      }
    });
  }

  it('lists only the assigned mentor conversations and the current team conversations', async () => {
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            role: 'mentor',
            isActive: true,
            deletedAt: null,
            roles: [],
          }),
      },
      teamMember: {
        findUnique: vi.fn().mockResolvedValue({ teamId: 'current-team' }),
      },
      mentorshipRequest: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    await new MentorshipService(prisma).requests('teammate-two');
    expect(prisma.mentorshipRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            {
              mentorId: 'teammate-two',
              mentor: {
                isActive: true,
                deletedAt: null,
                OR: [
                  { role: 'mentor' },
                  { roles: { some: { role: { name: 'mentor' } } } },
                ],
              },
            },
            { teamId: 'current-team' },
          ],
        },
      }),
    );
  });

  it('persists the assigned mentor session notes', async () => {
    const request = {
      id: 'request',
      mentorId: 'mentor',
      status: 'accepted',
      sessionNotes: '',
      team: { members: [] },
    };
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            role: 'mentor',
            isActive: true,
            deletedAt: null,
            roles: [],
          }),
      },
      mentorshipRequest: {
        findUnique: vi
          .fn()
          .mockImplementation(() => Promise.resolve({ ...request })),
        updateMany: vi.fn().mockImplementation(({ data }) => {
          request.sessionNotes = data.sessionNotes;
          return Promise.resolve({ count: 1 });
        }),
      },
    } as unknown as PrismaService;
    const saved = await new MentorshipService(prisma).saveNotes(
      'request',
      'mentor',
      '  Review the NASA dataset  ',
    );
    expect(saved?.sessionNotes).toBe('Review the NASA dataset');
    expect(prisma.mentorshipRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'request',
          mentorId: 'mentor',
          status: { in: ['accepted', 'completed'] },
        },
      }),
    );
  });
  it('does not reveal another team conversation', async () => {
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            role: 'mentor',
            isActive: true,
            deletedAt: null,
            roles: [],
          }),
      },
      mentorshipRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'request',
          mentorId: 'mentor',
          team: { members: [] },
        }),
      },
      mentorshipMessage: { findMany: vi.fn() },
    } as unknown as PrismaService;
    const service = new MentorshipService(prisma);
    await expect(
      service.messages('request', 'outsider'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.mentorshipMessage.findMany).not.toHaveBeenCalled();
  });

  it('rejects a repeated decision after the request changes', async () => {
    const db = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            role: 'mentor',
            isActive: true,
            deletedAt: null,
            roles: [],
          }),
      },
      $executeRaw: vi.fn().mockResolvedValue(1),
      mentorshipRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'request',
          mentorId: 'mentor',
          status: 'pending',
          team: { members: [] },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            role: 'mentor',
            isActive: true,
            deletedAt: null,
            roles: [],
          }),
      },
      ...db,
      $transaction: (fn: (tx: typeof db) => Promise<unknown>) => fn(db),
    } as unknown as PrismaService;
    const service = new MentorshipService(prisma);
    await expect(
      service.decide('request', 'mentor', 'accepted'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets only the mentor save session notes', async () => {
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            role: 'mentor',
            isActive: true,
            deletedAt: null,
            roles: [],
          }),
      },
      mentorshipRequest: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'request',
          mentorId: 'mentor',
          status: 'accepted',
          team: { members: [{ id: 'member' }] },
        }),
        update: vi.fn(),
      },
    } as unknown as PrismaService;
    const service = new MentorshipService(prisma);
    await expect(
      service.saveNotes('request', 'team-member', 'Follow up'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.mentorshipRequest.update).not.toHaveBeenCalled();
  });
});
