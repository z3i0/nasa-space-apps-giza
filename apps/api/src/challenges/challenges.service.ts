import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  officialChallengeWhere,
  isOfficialChallenge,
} from './official-catalogue.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SearchChallengesDto } from './dto.js';

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

  async list(userId: string, query: SearchChallengesDto) {
    const visible: Prisma.ChallengeWhereInput = officialChallengeWhere;
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
    if (query.subject) where.subjects = { has: query.subject };
    if (query.skill) where.recommendedSkills = { has: query.skill };
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.year) where.year = query.year;
    if (query.view === 'saved') where.favorites = { some: { userId } };
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

  async getSubjects(year?: number) {
    const records = await this.db.challenge.findMany({
      where: { ...officialChallengeWhere, ...(year ? { year } : {}) },
      select: { subjects: true },
    });
    const counts = new Map<string, number>();
    for (const record of records)
      for (const subject of new Set(record.subjects))
        counts.set(subject, (counts.get(subject) || 0) + 1);
    return [...counts]
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);
  }

  async detail(key: string, userId: string) {
    const record = await this.db.challenge.findFirst({
      where: {
        OR: [{ id: key }, { slug: key }],
        ...officialChallengeWhere,
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

  async favorite(id: string, userId: string, saved: boolean) {
    if (!saved) {
      await this.db.challengeFavorite.deleteMany({
        where: { userId, challengeId: id },
      });
      return { saved: false };
    }
    const challenge = await this.db.challenge.findUnique({ where: { id } });
    if (!isOfficialChallenge(challenge))
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

  async select(id: string, userId: string) {
    return this.db.$transaction(async (tx) => {
      const member = await tx.teamMember.findUnique({ where: { userId } });
      const teamId = member?.teamId;
      if (!teamId || member?.role !== 'leader')
        throw new ForbiddenException(
          'Only the team leader can select a challenge',
        );
      const deadline = process.env.SUBMISSION_DEADLINE;
      if (
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
      if (!isOfficialChallenge(challenge))
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
        currentTeam?.challengeId &&
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
}
