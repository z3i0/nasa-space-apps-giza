import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { officialChallengeWhere } from './official-catalogue.js';
import { ChallengesService } from './challenges.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function setup() {
  const db = {
    challenge: {
      findMany: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  return { db, service: new ChallengesService(db as unknown as PrismaService) };
}
describe('Integrated challenge catalogue', () => {
  it('combines subject, skill and text filters with publication visibility', async () => {
    const { db, service } = setup();
    db.challenge.findMany
      .mockResolvedValueOnce([{ id: 'c', favorites: [] }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const result = await service.list('user', {
      subject: 'planets',
      skill: 'React',
      search: 'Lunar',
      page: 1,
      limit: 20,
    });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(db.challenge.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          isPublished: true,
          isArchived: false,
          subjects: { has: 'planets' },
          recommendedSkills: { has: 'React' },
          OR: expect.any(Array),
        }),
      }),
    );
  });
  it('reads a published detail with resources and only this user favorites', async () => {
    const { db, service } = setup();
    db.challenge.findFirst.mockResolvedValue({
      id: 'c',
      slug: 'lunar',
      createdById: 'organizer',
      resources: [],
      favorites: [],
    });
    const result = await service.detail('lunar', 'user');
    expect(result.slug).toBe('lunar');
    expect(result).not.toHaveProperty('createdById');
    expect(db.challenge.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ id: 'lunar' }, { slug: 'lunar' }],
          ...officialChallengeWhere,
        },
        include: expect.objectContaining({
          favorites: { where: { userId: 'user' }, select: { userId: true } },
        }),
      }),
    );
  });
  it('does not expose an absent or unpublished challenge', async () => {
    const { db, service } = setup();
    db.challenge.findFirst.mockResolvedValue(null);
    await expect(service.detail('missing', 'user')).rejects.toThrow(
      NotFoundException,
    );
  });
  it('aggregates subjects across visible challenges without double counting a challenge', async () => {
    const { db, service } = setup();
    db.challenge.findMany.mockResolvedValue([
      { subjects: ['space', 'space', 'planets'] },
      { subjects: ['space', 'climate'] },
    ]);
    expect(await service.getSubjects(2026)).toEqual([
      { subject: 'space', count: 2 },
      { subject: 'planets', count: 1 },
      { subject: 'climate', count: 1 },
    ]);
    expect(db.challenge.findMany).toHaveBeenCalledWith({
      where: { ...officialChallengeWhere, year: 2026 },
      select: { subjects: true },
    });
  });
});
