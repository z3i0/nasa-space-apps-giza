import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { JudgingService } from './judging.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('Judging publication', () => {
  beforeEach(() =>
    vi.stubEnv('SUBMISSION_DEADLINE', '2020-11-14T23:59:59+02:00'),
  );
  afterEach(() => vi.unstubAllEnvs());
  function setup(completed = true, unassigned = 0, published = false) {
    const assignment = {
      teamId: 'team',
      snapshot: { teamName: 'Orbit' },
      completed,
      scores: { '0': 8 },
      rubric: { criteria: [{ name: 'Science', weight: 100 }] },
    };
    const tx = {
      $executeRaw: vi.fn(),
      judgingAssignment: { findMany: vi.fn().mockResolvedValue([assignment]) },
      team: { count: vi.fn().mockResolvedValue(unassigned) },
      judgingPublication: {
        findUnique: vi
          .fn()
          .mockResolvedValue(published ? { id: 'current' } : null),
        upsert: vi.fn().mockImplementation(({ create }) => create),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new JudgingService({
      $transaction: (fn: (value: typeof tx) => unknown) => fn(tx),
    } as unknown as PrismaService);
    return { service, tx };
  }
  it('publishes a snapshot containing averages and no individual scores', async () => {
    const { service } = setup();
    const result = await service.publish();
    expect(result.results).toEqual([
      {
        teamId: 'team',
        teamName: 'Orbit',
        score: 80,
        evaluations: 1,
        assigned: 1,
        rank: 1,
      },
    ]);
  });
  it('blocks publication while assigned evaluations are incomplete', async () => {
    await expect(setup(false).service.publish()).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('blocks publishing results while submissions are still open', async () => {
    vi.stubEnv('SUBMISSION_DEADLINE', '2099-11-14T23:59:59+02:00');
    await expect(setup().service.publish()).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('blocks publication when a submitted team has no assignments', async () => {
    await expect(setup(true, 1).service.publish()).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('freezes score writes while results are published', async () => {
    await expect(
      setup(true, 0, true).service.save('id', 'judge', {
        scores: { '0': 8 },
        feedback: 'ok',
        version: 1,
        completed: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
