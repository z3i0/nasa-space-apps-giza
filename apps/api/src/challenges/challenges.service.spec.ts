import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChallengesService } from './challenges.service.js';
import { ChallengeDifficulty, ResourceType, ResourceLanguage } from '@prisma/client';
import { NotFoundException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('ChallengesService', () => {
  let service: ChallengesService;
  let db: any;

  beforeEach(() => {
    db = {
      challenge: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'c-1',
            slug: 'clps-lunar-mission-browser',
            titleEn: 'CLPS Lunar Mission Browser',
            titleAr: 'متصفح مهمات القمر',
            subjects: ['planets_and_moons', 'space_exploration'],
            recommendedSkills: ['Three.js', 'React'],
            difficulty: ChallengeDifficulty.intermediate,
            isActive: true,
            year: 2026,
            _count: { teams: 2, resources: 3 },
            resources: [],
          },
        ]),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      challengeResource: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
    };

    service = new ChallengesService(db as PrismaService);
  });

  it('should find challenges with subject filter and search query', async () => {
    const result = await service.findAll({
      subject: 'planets_and_moons',
      search: 'Lunar',
    });

    expect(result.total).toBe(1);
    expect(result.challenges).toHaveLength(1);
    expect(db.challenge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subjects: { has: 'planets_and_moons' },
        }),
      }),
    );
  });

  it('should find challenge by slug and return detailed relations', async () => {
    db.challenge.findFirst.mockResolvedValue({
      id: 'c-1',
      slug: 'clps-lunar-mission-browser',
      titleEn: 'CLPS Lunar Mission Browser',
      resources: [],
      teams: [],
    });

    const challenge = await service.findBySlugOrId('clps-lunar-mission-browser');
    expect(challenge.slug).toBe('clps-lunar-mission-browser');
    expect(db.challenge.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ slug: 'clps-lunar-mission-browser' }, { id: 'clps-lunar-mission-browser' }],
      },
      include: expect.any(Object),
    });
  });

  it('should throw NotFoundException if challenge does not exist', async () => {
    db.challenge.findFirst.mockResolvedValue(null);

    await expect(service.findBySlugOrId('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should aggregate subjects with their frequencies', async () => {
    db.challenge.findMany.mockResolvedValue([
      { subjects: ['astrophysics', 'space_exploration'] },
      { subjects: ['astrophysics', 'planets_and_moons'] },
    ]);

    const subjects = await service.getSubjects(2026);
    expect(subjects).toEqual([
      { subject: 'astrophysics', count: 2 },
      { subject: 'space_exploration', count: 1 },
      { subject: 'planets_and_moons', count: 1 },
    ]);
  });

  it('should prevent duplicate slug creation', async () => {
    db.challenge.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        slug: 'existing-slug',
        titleEn: 'Title',
        titleAr: 'عنوان',
        descriptionEn: 'Desc',
        descriptionAr: 'وصف',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should add resource to challenge successfully', async () => {
    db.challenge.findUnique.mockResolvedValue({ id: 'c-1' });
    db.challengeResource.create.mockResolvedValue({
      id: 'res-1',
      titleEn: 'Dataset',
      url: 'https://nasa.gov/data',
    });

    const res = await service.addResource('c-1', {
      titleEn: 'Dataset',
      titleAr: 'بيانات',
      url: 'https://nasa.gov/data',
      type: ResourceType.dataset,
      language: ResourceLanguage.en,
    });

    expect(res.id).toBe('res-1');
    expect(db.challengeResource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          challengeId: 'c-1',
          url: 'https://nasa.gov/data',
        }),
      }),
    );
  });
});
