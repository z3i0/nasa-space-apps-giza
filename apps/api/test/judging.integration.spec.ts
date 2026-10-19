import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  JudgingService,
  weightedScore,
} from '../src/judging/judging.service.js';

describe('Judging (live PostgreSQL)', () => {
  const db = new PrismaService(),
    service = new JudgingService(db),
    suffix = randomUUID();
  const users: string[] = [],
    teams: string[] = [],
    rubrics: string[] = [];
  afterAll(async () => {
    await db.team.deleteMany({ where: { id: { in: teams } } });
    await db.judgingRubric.deleteMany({ where: { id: { in: rubrics } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });
  it('weights scores out of 100 without rounding individual criteria', () => {
    expect(
      weightedScore(
        [
          { name: 'Science', weight: 60 },
          { name: 'Impact', weight: 40 },
        ],
        { '0': 8, '1': 9 },
      ),
    ).toBe(84);
  });
  it('persists snapshots, isolates judges, validates scores, excludes drafts, preserves ties and locks final evaluations', async () => {
    // Do not change an existing published event round.
    expect(await service.results()).toBeNull();
    const accounts = await Promise.all(
      ['participant', 'judge', 'judge'].map((role, i) =>
        db.user.create({
          data: {
            name: `Judging test ${i}`,
            email: `${i}.${suffix}@judging.test`,
            role,
          },
        }),
      ),
    );
    users.push(...accounts.map((a) => a.id));
    const [leader, judge, peer] = accounts;
    for (let i = 0; i < 2; i++) {
      const team = await db.team.create({
        data: {
          name: `Judging ${i} ${suffix}`,
          createdById: leader.id,
          submission: {
            create: {
              title: `Project ${i}`,
              summary: 'Saved science proposal',
              challenge: 'Climate',
              projectUrl: 'https://example.com',
              status: 'submitted',
            },
          },
        },
      });
      teams.push(team.id);
    }
    await expect(
      service.createRubric({
        name: 'Invalid',
        criteria: [{ name: 'Science', weight: 90 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const existing = await db.judgingAssignment.findFirst();
    // The local development round may already have assignments; preserve its rubric.
    const rubric = existing
      ? await db.judgingRubric.findUniqueOrThrow({
          where: { id: existing.rubricId },
        })
      : await service.createRubric({
          name: `Test rubric ${suffix}`,
          criteria: [
            { name: 'Science', weight: 60 },
            { name: 'Impact', weight: 40 },
          ],
        });
    if (!existing) rubrics.push(rubric.id);
    const first = await service.assign({
      judgeId: judge.id,
      teamId: teams[0],
      rubricId: rubric.id,
    });
    await expect(
      service.assign({
        judgeId: judge.id,
        teamId: teams[0],
        rubricId: rubric.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.assign({
        judgeId: leader.id,
        teamId: teams[0],
        rubricId: rubric.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect((await service.list(peer.id)).length).toBe(0);
    const dto = {
      scores: { '0': 8 },
      feedback: 'Useful work',
      completed: false,
      version: 1,
    };
    await expect(service.save(first.id, peer.id, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.save(first.id, judge.id, { ...dto, scores: { '0': 11 } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.save(first.id, judge.id, { ...dto, scores: { '99': 5 } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.save(first.id, judge.id, { ...dto, completed: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const draft = await service.save(first.id, judge.id, dto);
    expect(draft.version).toBe(2);
    await expect(service.unassign(first.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(
      (await service.manage()).rankings.some((r) => r.teamId === teams[0]),
    ).toBe(false);
    await expect(service.save(first.id, judge.id, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await db.teamSubmission.update({
      where: { teamId: teams[0] },
      data: { title: 'Later edit', version: { increment: 1 } },
    });
    expect((await service.list(judge.id))[0].snapshot).toMatchObject({
      title: 'Project 0',
    });
    await expect(
      service.assign({
        judgeId: peer.id,
        teamId: teams[0],
        rubricId: rubric.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const scores = Object.fromEntries(
      (rubric.criteria as { name: string }[]).map((_, i) => [String(i), 8]),
    );
    await service.save(first.id, judge.id, {
      scores,
      feedback: 'Strong evidence and a clear method.',
      completed: true,
      version: 2,
    });
    await expect(
      service.save(first.id, judge.id, { ...dto, version: 3 }),
    ).rejects.toBeInstanceOf(ConflictException);
    const second = await service.assign({
      judgeId: peer.id,
      teamId: teams[1],
      rubricId: rubric.id,
    });
    await expect(service.publish()).rejects.toBeInstanceOf(ConflictException);
    await service.save(second.id, peer.id, {
      scores,
      feedback: 'Strong evidence and a clear method.',
      completed: true,
      version: 1,
    });
    const rows = (await service.manage()).rankings.filter((r) =>
      teams.includes(r.teamId),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].score).toBe(80);
    expect(rows[0].rank).toBe(rows[1].rank);
    expect((await service.list(judge.id))[0].feedback).toBe(
      'Strong evidence and a clear method.',
    );
  });
});
