import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { officialChallengeWhere } from '../challenges/official-catalogue.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountService {
  constructor(private readonly db: PrismaService) {}
  async organizerSummary() {
    const active = { isActive: true, deletedAt: null };
    const roleWhere = (name: string) => ({
      ...active,
      OR: [{ role: name }, { roles: { some: { role: { name } } } }],
    });
    const [
      participants,
      mentors,
      judges,
      teams,
      submitted,
      pending,
      assigned,
      completed,
    ] = await Promise.all([
      this.db.user.count({ where: roleWhere('participant') }),
      this.db.user.count({ where: roleWhere('mentor') }),
      this.db.user.count({ where: roleWhere('judge') }),
      this.db.team.count(),
      this.db.teamSubmission.count({ where: { status: 'submitted' } }),
      this.db.roleApplication.count({ where: { status: 'pending' } }),
      this.db.judgingAssignment.count(),
      this.db.judgingAssignment.count({ where: { completed: true } }),
    ]);
    const deadline = process.env.SUBMISSION_DEADLINE;
    return {
      participants,
      mentors,
      judges,
      teams,
      submitted,
      pending,
      assigned,
      completed,
      deadline:
        deadline &&
        /(Z|[+-]\d{2}:\d{2})$/.test(deadline) &&
        Number.isFinite(Date.parse(deadline))
          ? deadline
          : null,
    };
  }
  async directory(
    kind: 'participants' | 'teams',
    search: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    if (kind === 'participants') {
      const where: Prisma.UserWhereInput = {
        deletedAt: null,
        OR: [
          { role: 'participant' },
          { roles: { some: { role: { name: 'participant' } } } },
        ],
        ...(search
          ? {
              AND: [
                {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                  ],
                },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        this.db.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            profile: { select: { institution: true, skills: true } },
            teamMemberships: {
              select: { team: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        this.db.user.count({ where }),
      ]);
      return {
        items: items.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          isActive: u.isActive,
          institution: u.profile?.institution || null,
          skills: u.profile?.skills || [],
          team: u.teamMemberships[0]?.team || null,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }
    const where: Prisma.TeamWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { challenge: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.db.team.findMany({
        where,
        select: {
          id: true,
          name: true,
          challenge: true,
          maxMembers: true,
          members: {
            select: {
              userId: true,
              role: true,
              user: { select: { name: true } },
            },
          },
          submission: { select: { title: true, status: true, version: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.db.team.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }
  challengeOptions() {
    return this.db.challenge.findMany({
      where: officialChallengeWhere,
      select: { id: true, title: true, titleAr: true },
      orderBy: [{ year: 'desc' }, { title: 'asc' }],
    });
  }
  async access(userId: string, role: string) {
    if (!['mentor', 'judge'].includes(role))
      throw new BadRequestException('Invalid dashboard role.');
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        roleApplications: { where: { role } },
      },
    });
    if (!user?.isActive || user.deletedAt) throw new ForbiddenException();
    const roles = user.roles.length
      ? user.roles.map((r) => r.role.name)
      : [user.role || 'participant'];
    const application = user.roleApplications[0];
    return {
      role,
      roles,
      status:
        roles.includes(role) || roles.includes('organizer')
          ? 'approved'
          : application?.status === 'approved'
            ? 'rejected'
            : application?.status || 'not_requested',
      reason: application?.reason || '',
    };
  }
  async overview(userId: string) {
    const [profile, membership, applications] = await Promise.all([
      this.db.profile.findUnique({
        where: { userId },
        select: { skills: true, preferredChallenge: true, bio: true },
      }),
      this.db.teamMember.findUnique({
        where: { userId },
        select: {
          team: {
            select: {
              id: true,
              name: true,
              challenge: true,
              maxMembers: true,
              members: {
                select: { userId: true, user: { select: { name: true } } },
              },
              submission: { select: { status: true } },
              _count: { select: { mentorshipRequests: true } },
            },
          },
        },
      }),
      this.db.roleApplication.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const team = membership?.team;
    return {
      skills: profile?.skills || [],
      challenge: team?.challenge || profile?.preferredChallenge || null,
      profileComplete: !!profile?.skills.length && !!profile?.bio,
      team: team
        ? {
            id: team.id,
            name: team.name,
            maxMembers: team.maxMembers,
            members: team.members.map((m) => ({
              id: m.userId,
              name: m.user.name,
            })),
          }
        : null,
      mentorshipCount: team?._count.mentorshipRequests || 0,
      submitted: team?.submission?.status === 'submitted',
      applications,
    };
  }
  async selectRole(userId: string, role: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
      if (!user?.isActive || user.deletedAt) throw new ForbiddenException();
      const roles = user.roles.length
        ? user.roles.map((r) => r.role.name)
        : [user.role || 'participant'];
      if (roles.includes(role)) return { role, status: 'approved', roles };
      if (role !== 'mentor' && role !== 'judge')
        throw new ForbiddenException(
          'This role has not been assigned to your account.',
        );
      const application = await tx.roleApplication.upsert({
        where: { userId_role: { userId, role } },
        create: { userId, role },
        update: {},
      });
      // The requested dashboard can display approval status without granting
      // its protected capabilities. Only database roles authorize those APIs.
      return {
        role,
        status: application.status,
        roles,
      };
    });
  }
  applications() {
    return this.db.roleApplication.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }
  review(
    id: string,
    organizerId: string,
    decision: 'approved' | 'rejected',
    reason = '',
    expectedStatus?: string,
  ) {
    return this.db.$transaction(async (tx) => {
      let application = await tx.roleApplication.findUnique({
        where: { id },
      });
      if (!application) throw new NotFoundException();
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${application.userId}))`;
      application = await tx.roleApplication.findUniqueOrThrow({
        where: { id },
      });
      if (expectedStatus && application.status !== expectedStatus)
        throw new ConflictException(
          'This request has changed. Refresh before reviewing.',
        );
      if (application.status === decision) return application;
      const changed = await tx.roleApplication.updateMany({
        where: { id, status: application.status },
        data: {
          status: decision,
          reason: reason.trim(),
          reviewedAt: new Date(),
          reviewedById: organizerId,
        },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          'This application has already been reviewed.',
        );
      if (decision === 'approved') {
        const user = await tx.user.findUnique({
          where: { id: application.userId },
        });
        if (!user?.isActive || user.deletedAt)
          throw new BadRequestException('Cannot approve an inactive account.');
        const role = await tx.role.upsert({
          where: { name: application.role },
          create: { name: application.role },
          update: {},
        });
        await tx.userRole.upsert({
          where: {
            userId_roleId: { userId: application.userId, roleId: role.id },
          },
          create: { userId: application.userId, roleId: role.id },
          update: {},
        });
        await tx.user.update({
          where: { id: application.userId },
          data: { role: application.role },
        });
      } else {
        await tx.userRole.deleteMany({
          where: {
            userId: application.userId,
            role: { name: application.role },
          },
        });
        const user = await tx.user.findUniqueOrThrow({
          where: { id: application.userId },
          include: { roles: { include: { role: true } } },
        });
        if (user.role === application.role)
          await tx.user.update({
            where: { id: user.id },
            data: { role: user.roles[0]?.role.name || 'participant' },
          });
      }
      return tx.roleApplication.findUniqueOrThrow({ where: { id } });
    });
  }
}
