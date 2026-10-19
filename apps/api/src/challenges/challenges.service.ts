import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { SaveChallengeDto, SearchChallengesDto } from './dto.js';

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  titleAr: true,
  summary: true,
  summaryAr: true,
  category: true,
  difficulty: true,
  year: true,
  tags: true,
  isPublished: true,
  isArchived: true,
  isDemo: true,
  version: true,
  updatedAt: true,
} satisfies Prisma.ChallengeSelect;

@Injectable()
export class ChallengesService {
  constructor(private readonly db: PrismaService) {}

  async list(userId: string, query: SearchChallengesDto, management = false) {
    const visible: Prisma.ChallengeWhereInput = management
      ? {}
      : { isPublished: true, isArchived: false };
    const where: Prisma.ChallengeWhereInput = { ...visible };
    if (query.search?.trim()) {
      const contains = {
        contains: query.search.trim(),
        mode: 'insensitive' as const,
      };
      where.OR = [
        { title: contains },
        { titleAr: contains },
        { summary: contains },
        { summaryAr: contains },
        { category: contains },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.year) where.year = query.year;
    if (query.view === 'saved') where.favorites = { some: { userId } };
    if (management && query.status && query.status !== 'all') {
      if (query.status === 'archived') where.isArchived = true;
      else {
        where.isArchived = false;
        where.isPublished = query.status === 'published';
      }
    }
    const page = query.page ?? 1,
      limit = query.limit ?? 20;
    const [records, total, categories, years] = await Promise.all([
      this.db.challenge.findMany({
        where,
        select: {
          ...cardSelect,
          favorites: { where: { userId }, select: { userId: true } },
        },
        orderBy: [{ year: 'desc' }, { title: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.challenge.count({ where }),
      this.db.challenge.findMany({
        where: visible,
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' },
      }),
      this.db.challenge.findMany({
        where: visible,
        distinct: ['year'],
        select: { year: true },
        orderBy: { year: 'desc' },
      }),
    ]);
    return {
      items: records.map(({ favorites, ...challenge }) => ({
        ...challenge,
        saved: favorites.length > 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categories: categories.map((item) => item.category),
      years: years.map((item) => item.year),
    };
  }

  async detail(key: string, userId: string, management = false) {
    const record = await this.db.challenge.findFirst({
      where: {
        OR: [{ id: key }, { slug: key }],
        ...(!management ? { isPublished: true } : {}),
      },
      include: {
        resources: { orderBy: { position: 'asc' } },
        favorites: { where: { userId }, select: { userId: true } },
      },
    });
    if (!record) throw new NotFoundException('Challenge not found');
    const { favorites, createdById: _createdById, ...challenge } = record;
    return { ...challenge, saved: favorites.length > 0 };
  }

  private data(dto: SaveChallengeDto) {
    return {
      title: dto.title.trim(),
      titleAr: dto.titleAr?.trim() || null,
      summary: dto.summary.trim(),
      summaryAr: dto.summaryAr?.trim() || null,
      description: dto.description.trim(),
      descriptionAr: dto.descriptionAr?.trim() || null,
      category: dto.category.trim(),
      difficulty: dto.difficulty,
      year: dto.year,
      tags: [...new Set(dto.tags.map((tag) => tag.trim()).filter(Boolean))],
      sourceUrl: dto.sourceUrl || null,
      isPublished: dto.isPublished,
      isArchived: dto.isArchived,
    };
  }

  async create(userId: string, dto: SaveChallengeDto) {
    const base =
      dto.title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 90) || 'challenge';
    return this.db.challenge.create({
      data: {
        ...this.data(dto),
        slug: `${dto.year}-${base}-${randomUUID().slice(0, 8)}`,
        createdById: userId,
        resources: {
          create: dto.resources.map((resource, position) => ({
            ...resource,
            position,
          })),
        },
      },
      include: { resources: { orderBy: { position: 'asc' } } },
    });
  }

  async update(id: string, dto: SaveChallengeDto) {
    if (!dto.expectedVersion)
      throw new BadRequestException('Expected version is required');
    return this.db.$transaction(async (tx) => {
      const saved = await tx.challenge.updateMany({
        where: { id, version: dto.expectedVersion },
        data: { ...this.data(dto), version: { increment: 1 } },
      });
      if (!saved.count)
        throw new ConflictException('Challenge changed; reload before saving');
      await tx.challengeResource.deleteMany({ where: { challengeId: id } });
      if (dto.resources.length)
        await tx.challengeResource.createMany({
          data: dto.resources.map((resource, position) => ({
            ...resource,
            challengeId: id,
            position,
          })),
        });
      return tx.challenge.findUniqueOrThrow({
        where: { id },
        include: { resources: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async archive(id: string, expectedVersion: number) {
    const saved = await this.db.challenge.updateMany({
      where: { id, version: expectedVersion },
      data: { isArchived: true, version: { increment: 1 } },
    });
    if (!saved.count)
      throw new ConflictException('Challenge changed; reload before archiving');
    return { success: true };
  }

  async favorite(id: string, userId: string, saved: boolean) {
    if (!saved) {
      await this.db.challengeFavorite.deleteMany({
        where: { userId, challengeId: id },
      });
      return { saved: false };
    }
    const challenge = await this.db.challenge.findUnique({ where: { id } });
    if (!challenge?.isPublished || challenge.isArchived)
      throw new NotFoundException('Challenge unavailable');
    await this.db.challengeFavorite.createMany({
      data: [{ userId, challengeId: id }],
      skipDuplicates: true,
    });
    return { saved: true };
  }

  async selection(userId: string) {
    const membership = await this.db.teamMember.findUnique({
      where: { userId },
      select: {
        role: true,
        team: {
          select: { id: true, name: true, challengeId: true, challenge: true },
        },
      },
    });
    return {
      team: membership
        ? { ...membership.team, canSelect: membership.role === 'leader' }
        : null,
    };
  }

  async select(id: string, userId: string, organizerTeamId?: string) {
    return this.db.$transaction(async (tx) => {
      const member = await tx.teamMember.findUnique({ where: { userId } });
      const teamId = organizerTeamId || member?.teamId;
      if (!teamId || (!organizerTeamId && member?.role !== 'leader'))
        throw new ForbiddenException(
          'Only the team leader can select a challenge',
        );
      const deadline = process.env.SUBMISSION_DEADLINE;
      if (
        !organizerTeamId &&
        deadline &&
        /(Z|[+-]\d{2}:\d{2})$/.test(deadline) &&
        Number.isFinite(Date.parse(deadline)) &&
        Date.now() >= Date.parse(deadline)
      )
        throw new ForbiddenException({
          code: 'SUBMISSION_CLOSED',
          message: 'The submission deadline has passed',
        });
      await tx.$queryRaw`SELECT id FROM teams WHERE id = ${teamId} FOR UPDATE`;
      const challenge = await tx.challenge.findUnique({ where: { id } });
      if (!challenge?.isPublished || challenge.isArchived)
        throw new NotFoundException('Challenge unavailable');
      const [currentTeam, submission] = await Promise.all([
        tx.team.findUnique({
          where: { id: teamId },
          select: { challengeId: true, challenge: true },
        }),
        tx.teamSubmission.findUnique({ where: { teamId } }),
      ]);
      if (
        submission &&
        currentTeam?.challengeId !== id &&
        currentTeam?.challenge !== challenge.title
      )
        throw new ConflictException(
          'A project is already saved for this team. Its challenge cannot be changed.',
        );
      const team = await tx.team.update({
        where: { id: teamId },
        data: { challengeId: id, challenge: challenge.title },
        select: { id: true, name: true, challengeId: true, challenge: true },
      });
      return { team };
    });
  }

  async legacy(query: SearchChallengesDto) {
    const where: Prisma.TeamWhereInput = {
      challengeId: null,
      challenge: { not: null },
      NOT: { challenge: '' },
    };
    const [items, total] = await Promise.all([
      this.db.team.findMany({
        where,
        select: { id: true, name: true, challenge: true },
        orderBy: { name: 'asc' },
        take: query.limit,
        skip: (query.page - 1) * query.limit,
      }),
      this.db.team.count({ where }),
    ]);
    return {
      items,
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
