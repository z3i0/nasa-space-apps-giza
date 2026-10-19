import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ChallengesService } from '../src/challenges/challenges.service.js';
import {
  SaveChallengeDto,
  SearchChallengesDto,
} from '../src/challenges/dto.js';
import { TeamsService } from '../src/teams/teams.service.js';

describe('Challenge explorer (live PostgreSQL)', () => {
  const db = new PrismaService(),
    service = new ChallengesService(db),
    suffix = randomUUID();
  const users: string[] = [],
    challenges: string[] = [];
  let teamId: string | undefined;
  afterAll(async () => {
    if (teamId) await db.team.deleteMany({ where: { id: teamId } });
    await db.challenge.deleteMany({ where: { id: { in: challenges } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });

  it('hides drafts, scopes favorites, protects stale edits, and preserves team choices', async () => {
    const accounts = await Promise.all(
      ['organizer', 'leader', 'member', 'outsider'].map((role) =>
        db.user.create({
          data: {
            name: role,
            email: `${role}.${suffix}@challenge.test`,
            role: role === 'organizer' ? 'organizer' : 'participant',
            phone: '+201000000001',
          },
        }),
      ),
    );
    users.push(...accounts.map((user) => user.id));
    const [organizer, leader, member, outsider] = accounts;
    const dto: SaveChallengeDto = {
      title: `Mission ${suffix}`,
      summary: 'A challenge for climate data explorers.',
      description:
        'Use an environmental dataset to explain a change and its uncertainty.',
      category: `Climate ${suffix}`,
      difficulty: 'intermediate',
      year: 2026,
      tags: ['Data'],
      isPublished: false,
      isArchived: false,
      resources: [{ label: 'NASA data', url: 'https://data.nasa.gov/' }],
    };
    const challenge = await service.create(organizer.id, dto);
    challenges.push(challenge.id);
    await expect(
      service.detail(challenge.id, leader.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      (
        await service.list(leader.id, {
          ...new SearchChallengesDto(),
          search: suffix,
        })
      ).total,
    ).toBe(0);
    await db.challengeResource.updateMany({
      where: { challengeId: challenge.id },
      data: { titleAr: 'Preserved Arabic resource', type: 'api', isOfficial: true, metadata: { provider: 'NASA' } },
    });
    const published = await service.update(challenge.id, {
      ...dto,
      isPublished: true,
      expectedVersion: 1,
    });
    expect(published.resources[0]).toMatchObject({ titleAr: 'Preserved Arabic resource', type: 'api', isOfficial: true, metadata: { provider: 'NASA' } });
    expect(
      (
        await service.list(leader.id, {
          ...new SearchChallengesDto(),
          category: dto.category,
          difficulty: 'intermediate',
          year: 2026,
        })
      ).items.map((item) => item.id),
    ).toEqual([challenge.id]);
    await Promise.all([
      service.favorite(challenge.id, leader.id, true),
      service.favorite(challenge.id, leader.id, true),
    ]);
    expect(
      await db.challengeFavorite.count({
        where: { challengeId: challenge.id },
      }),
    ).toBe(1);
    expect(
      (
        await service.list(leader.id, {
          ...new SearchChallengesDto(),
          view: 'saved',
          search: suffix,
        })
      ).total,
    ).toBe(1);
    expect(
      (
        await service.list(outsider.id, {
          ...new SearchChallengesDto(),
          view: 'saved',
          search: suffix,
        })
      ).total,
    ).toBe(0);
    const detail = await service.detail(challenge.slug, leader.id);
    expect(detail.saved).toBe(true);
    expect(detail.resources[0].label).toBe('NASA data');
    expect(detail).not.toHaveProperty('favorites');
    expect(detail).not.toHaveProperty('createdById');
    await expect(
      service.update(challenge.id, {
        ...dto,
        expectedVersion: 1,
        resources: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      (await service.detail(challenge.id, leader.id)).resources,
    ).toHaveLength(1);
    const team = await db.team.create({
      data: {
        name: `Choice ${suffix}`,
        createdById: leader.id,
        challenge: 'Original legacy choice',
        members: {
          create: [
            { userId: leader.id, role: 'leader' },
            { userId: member.id },
          ],
        },
      },
    });
    teamId = team.id;
    expect(
      (await service.legacy(new SearchChallengesDto())).items.some(
        (item) => item.id === team.id,
      ),
    ).toBe(true);
    await expect(
      service.select(challenge.id, member.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await service.select(challenge.id, leader.id);
    expect((await service.selection(member.id)).team).toMatchObject({
      challengeId: challenge.id,
      challenge: dto.title,
      canSelect: false,
    });
    await service.archive(challenge.id, published.version);
    expect(
      (
        await service.list(leader.id, {
          ...new SearchChallengesDto(),
          search: suffix,
        })
      ).total,
    ).toBe(0);
    expect((await service.detail(challenge.id, leader.id)).isArchived).toBe(
      true,
    );
    expect((await service.selection(leader.id)).team?.challengeId).toBe(
      challenge.id,
    );
    await expect(
      service.select(challenge.id, leader.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await new TeamsService(db).updateTeam(team.id, leader.id, ['participant'], {
      challenge: 'Preserved custom choice',
    });
    expect(
      await db.team.findUnique({
        where: { id: team.id },
        select: { challenge: true, challengeId: true },
      }),
    ).toEqual({ challenge: 'Preserved custom choice', challengeId: null });
  }, 30000);

  it('rejects executable resource URLs before writes', async () => {
    const dto = plainToInstance(SaveChallengeDto, {
      title: 'Valid title',
      summary: 'Valid summary of challenge',
      description: 'A sufficiently detailed description',
      category: 'Earth',
      difficulty: 'beginner',
      year: 2026,
      tags: [],
      isPublished: false,
      isArchived: false,
      resources: [{ label: 'Unsafe', url: 'javascript:alert(1)' }],
    });
    expect(
      (await validate(dto)).some((error) => error.property === 'resources'),
    ).toBe(true);
  });
});
