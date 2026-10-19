import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChallengeFilterDto } from './dto/challenge-filter.dto.js';
import { CreateChallengeDto, UpdateChallengeDto } from './dto/create-challenge.dto.js';
import { CreateChallengeResourceDto } from './dto/challenge-resource.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChallengesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: ChallengeFilterDto) {
    const where: Prisma.ChallengeWhereInput = {
      isActive: true,
      year: filter.year || 2026,
    };

    if (filter.difficulty) {
      where.difficulty = filter.difficulty;
    }

    if (filter.subject) {
      where.subjects = {
        has: filter.subject,
      };
    }

    if (filter.skill) {
      where.recommendedSkills = {
        has: filter.skill,
      };
    }

    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      where.OR = [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { titleAr: { contains: q, mode: 'insensitive' } },
        { taglineEn: { contains: q, mode: 'insensitive' } },
        { taglineAr: { contains: q, mode: 'insensitive' } },
        { descriptionEn: { contains: q, mode: 'insensitive' } },
        { descriptionAr: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, challenges] = await Promise.all([
      this.prisma.challenge.count({ where }),
      this.prisma.challenge.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        take: filter.limit || 50,
        skip: filter.offset || 0,
        include: {
          _count: {
            select: {
              teams: true,
              resources: true,
            },
          },
          resources: {
            where: { isFeatured: true },
            take: 3,
            select: {
              id: true,
              titleEn: true,
              titleAr: true,
              url: true,
              type: true,
              language: true,
              isOfficial: true,
              isCurated: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      challenges,
    };
  }

  async findBySlugOrId(slugOrId: string) {
    const challenge = await this.prisma.challenge.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      include: {
        _count: {
          select: {
            teams: true,
            resources: true,
          },
        },
        resources: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
        teams: {
          select: {
            id: true,
            name: true,
            submissionStatus: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with identifier "${slugOrId}" not found`);
    }

    return challenge;
  }

  async getSubjects(year: number = 2026) {
    const challenges = await this.prisma.challenge.findMany({
      where: {
        isActive: true,
        year,
      },
      select: {
        subjects: true,
      },
    });

    const subjectCounts: Record<string, number> = {};
    for (const c of challenges) {
      for (const s of c.subjects) {
        subjectCounts[s] = (subjectCounts[s] || 0) + 1;
      }
    }

    return Object.entries(subjectCounts).map(([subject, count]) => ({
      subject,
      count,
    })).sort((a, b) => b.count - a.count);
  }

  async create(dto: CreateChallengeDto) {
    const existing = await this.prisma.challenge.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Challenge with slug "${dto.slug}" already exists`);
    }

    return this.prisma.challenge.create({
      data: {
        slug: dto.slug,
        year: dto.year ?? 2026,
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        taglineEn: dto.taglineEn,
        taglineAr: dto.taglineAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        requirementsEn: dto.requirementsEn,
        requirementsAr: dto.requirementsAr,
        deliverablesEn: dto.deliverablesEn,
        deliverablesAr: dto.deliverablesAr,
        subjects: dto.subjects || [],
        recommendedSkills: dto.recommendedSkills || [],
        difficulty: dto.difficulty,
        nasaOriginalUrl: dto.nasaOriginalUrl,
        nasaChallengeId: dto.nasaChallengeId,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateChallengeDto) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id } });
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${id}" not found`);
    }

    return this.prisma.challenge.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id } });
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${id}" not found`);
    }

    return this.prisma.challenge.delete({ where: { id } });
  }

  async addResource(challengeId: string, dto: CreateChallengeResourceDto) {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found`);
    }

    return this.prisma.challengeResource.create({
      data: {
        challengeId,
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        url: dto.url,
        type: dto.type,
        language: dto.language,
        isOfficial: dto.isOfficial ?? false,
        isCurated: dto.isCurated ?? true,
        isFeatured: dto.isFeatured ?? false,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        order: dto.order ?? 0,
      },
    });
  }

  async removeResource(resourceId: string) {
    const res = await this.prisma.challengeResource.findUnique({ where: { id: resourceId } });
    if (!res) {
      throw new NotFoundException(`Resource with ID "${resourceId}" not found`);
    }

    return this.prisma.challengeResource.delete({ where: { id: resourceId } });
  }
}
