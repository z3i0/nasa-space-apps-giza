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

      await tx.notification.create({
        data: {
          userId: application.userId,
          title:
            decision === 'approved'
              ? 'Role Application Approved'
              : 'Role Application Decision',
          titleAr:
            decision === 'approved'
              ? 'تمت الموافقة على طلب الدور'
              : 'قرار بشأن طلب الدور',
          message:
            decision === 'approved'
              ? `Your application for ${application.role} has been approved.`
              : `Your application for ${application.role} was declined.` +
                (reason ? ` Reason: ${reason}` : ''),
          messageAr:
            decision === 'approved'
              ? `تمت الموافقة على طلبك للانضمام كـ ${application.role === 'mentor' ? 'موجه' : 'محكّم'}.`
              : `تم رفض طلبك للانضمام كـ ${application.role === 'mentor' ? 'موجه' : 'محكّم'}.` +
                (reason ? ` السبب: ${reason}` : ''),
          type: 'role_application',
          link:
            decision === 'approved'
              ? `/dashboard/${application.role}`
              : '/dashboard/participant',
        },
      });

      return tx.roleApplication.findUniqueOrThrow({ where: { id } });
    });
  }

  async createNotification(
    data: {
      userId: string;
      title: string;
      titleAr?: string;
      message: string;
      messageAr?: string;
      type?: string;
      link?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.db;
    return client.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        titleAr: data.titleAr,
        message: data.message,
        messageAr: data.messageAr,
        type: data.type ?? 'info',
        link: data.link,
      },
    });
  }

  async getNotifications(userId: string) {
    const [notifications, unreadCount] = await Promise.all([
      this.db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.db.notification.count({
        where: { userId, isRead: false },
      }),
    ]);
    return { notifications, unreadCount };
  }

  async markNotificationRead(userId: string, id?: string) {
    if (id) {
      await this.db.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });
    } else {
      await this.db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    }
    return { success: true };
  }

  async deleteNotification(userId: string, id: string) {
    await this.db.notification.deleteMany({
      where: { id, userId },
    });
    return { success: true };
  }

  async requestsTracking(options: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 30));

    const [mentorships, joinRequests, invitations, roleApps] =
      await Promise.all([
        this.db.mentorshipRequest.findMany({
          include: {
            team: {
              select: {
                id: true,
                name: true,
                createdBy: { select: { id: true, name: true, email: true } },
              },
            },
            mentor: { select: { id: true, name: true, email: true } },
            _count: { select: { messages: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.db.teamJoinRequest.findMany({
          include: {
            user: { select: { id: true, name: true, email: true } },
            team: {
              select: {
                id: true,
                name: true,
                createdBy: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.db.teamInvitation.findMany({
          include: {
            team: { select: { id: true, name: true } },
            invitedUser: { select: { id: true, name: true, email: true } },
            invitedByUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.db.roleApplication.findMany({
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const reviewerIds = [
      ...new Set(roleApps.map((a) => a.reviewedById).filter(Boolean)),
    ] as string[];
    const reviewers =
      reviewerIds.length > 0
        ? await this.db.user.findMany({
            where: { id: { in: reviewerIds } },
            select: { id: true, name: true },
          })
        : [];
    const reviewerMap = new Map(reviewers.map((r) => [r.id, r.name]));

    const unified: Array<{
      id: string;
      type: 'mentorship' | 'team_join' | 'team_invitation' | 'role_application';
      status: 'pending' | 'accepted' | 'rejected' | 'canceled' | 'completed';
      rawStatus: string;
      requester: {
        id: string;
        name: string;
        email?: string;
        teamName?: string;
        role?: string;
      };
      responder: {
        id?: string;
        name: string;
        email?: string;
        teamName?: string;
        role?: string;
      } | null;
      title: string;
      summary: string;
      notes?: string | null;
      createdAt: string;
      respondedAt: string | null;
      durationMinutes: number | null;
      messagesCount?: number;
    }> = [];

    for (const m of mentorships) {
      const isPending = m.status === 'pending';
      const normStatus: 'pending' | 'accepted' | 'rejected' | 'canceled' | 'completed' =
        m.status === 'declined'
          ? 'rejected'
          : m.status === 'accepted'
            ? 'accepted'
            : (m.status as any);
      const duration = !isPending
        ? Math.max(
            1,
            Math.round(
              (new Date(m.updatedAt).getTime() -
                new Date(m.createdAt).getTime()) /
                60000,
            ),
          )
        : null;

      unified.push({
        id: m.id,
        type: 'mentorship',
        status: normStatus,
        rawStatus: m.status,
        requester: {
          id: m.team.createdBy.id,
          name: m.team.createdBy.name,
          email: m.team.createdBy.email,
          teamName: m.team.name,
          role: 'Team Leader',
        },
        responder: {
          id: m.mentor.id,
          name: m.mentor.name,
          email: m.mentor.email,
          role: 'Mentor',
        },
        title: `Mentorship: ${m.topic.slice(0, 50)}`,
        summary: `Team ${m.team.name} requested mentor ${m.mentor.name}`,
        notes: m.sessionNotes || m.topic,
        createdAt: m.createdAt.toISOString(),
        respondedAt: !isPending ? m.updatedAt.toISOString() : null,
        durationMinutes: duration,
        messagesCount: m._count?.messages ?? 0,
      });
    }

    for (const j of joinRequests) {
      const isPending = j.status === 'pending';
      const normStatus: 'pending' | 'accepted' | 'rejected' | 'canceled' | 'completed' =
        j.status === 'accepted'
          ? 'accepted'
          : j.status === 'rejected'
            ? 'rejected'
            : (j.status as any);
      const duration = !isPending
        ? Math.max(
            1,
            Math.round(
              (new Date(j.updatedAt).getTime() -
                new Date(j.createdAt).getTime()) /
                60000,
            ),
          )
        : null;

      unified.push({
        id: j.id,
        type: 'team_join',
        status: normStatus,
        rawStatus: j.status,
        requester: {
          id: j.user.id,
          name: j.user.name,
          email: j.user.email,
          role: 'Participant',
        },
        responder: {
          id: j.team.createdBy.id,
          name: j.team.createdBy.name,
          email: j.team.createdBy.email,
          teamName: j.team.name,
          role: 'Team Leader',
        },
        title: `Join Request: ${j.team.name}`,
        summary: `${j.user.name} requested to join team ${j.team.name}`,
        notes: j.message,
        createdAt: j.createdAt.toISOString(),
        respondedAt: !isPending ? j.updatedAt.toISOString() : null,
        durationMinutes: duration,
      });
    }

    for (const inv of invitations) {
      const isPending = inv.status === 'pending';
      const normStatus: 'pending' | 'accepted' | 'rejected' | 'canceled' | 'completed' =
        inv.status === 'accepted'
          ? 'accepted'
          : inv.status === 'rejected'
            ? 'rejected'
            : (inv.status as any);
      const duration = !isPending
        ? Math.max(
            1,
            Math.round(
              (new Date(inv.updatedAt).getTime() -
                new Date(inv.createdAt).getTime()) /
                60000,
            ),
          )
        : null;

      unified.push({
        id: inv.id,
        type: 'team_invitation',
        status: normStatus,
        rawStatus: inv.status,
        requester: {
          id: inv.invitedByUser.id,
          name: inv.invitedByUser.name,
          email: inv.invitedByUser.email,
          teamName: inv.team.name,
          role: 'Team Member',
        },
        responder: {
          id: inv.invitedUser.id,
          name: inv.invitedUser.name,
          email: inv.invitedUser.email,
          role: 'Invited User',
        },
        title: `Team Invitation: ${inv.team.name}`,
        summary: `${inv.invitedByUser.name} invited ${inv.invitedUser.name} to join ${inv.team.name}`,
        notes: null,
        createdAt: inv.createdAt.toISOString(),
        respondedAt: !isPending ? inv.updatedAt.toISOString() : null,
        durationMinutes: duration,
      });
    }

    for (const app of roleApps) {
      const isPending = app.status === 'pending';
      const normStatus: 'pending' | 'accepted' | 'rejected' | 'canceled' | 'completed' =
        app.status === 'approved'
          ? 'accepted'
          : app.status === 'rejected'
            ? 'rejected'
            : 'pending';
      const duration =
        app.reviewedAt && !isPending
          ? Math.max(
              1,
              Math.round(
                (new Date(app.reviewedAt).getTime() -
                  new Date(app.createdAt).getTime()) /
                  60000,
              ),
            )
          : null;

      unified.push({
        id: app.id,
        type: 'role_application',
        status: normStatus,
        rawStatus: app.status,
        requester: {
          id: app.user.id,
          name: app.user.name,
          email: app.user.email,
          role: 'Participant',
        },
        responder: app.reviewedById
          ? {
              id: app.reviewedById,
              name: reviewerMap.get(app.reviewedById) || 'Organizer',
              role: 'Organizer',
            }
          : null,
        title: `Role Upgrade: ${app.role}`,
        summary: `${app.user.name} applied for role ${app.role}`,
        notes: app.reason,
        createdAt: app.createdAt.toISOString(),
        respondedAt: app.reviewedAt ? app.reviewedAt.toISOString() : null,
        durationMinutes: duration,
      });
    }

    // Sort by createdAt descending
    unified.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Compute stats
    const totalRequests = unified.length;
    const pendingCount = unified.filter((x) => x.status === 'pending').length;
    const acceptedCount = unified.filter((x) => x.status === 'accepted').length;
    const rejectedCount = unified.filter((x) => x.status === 'rejected').length;
    const completedCount = unified.filter(
      (x) => x.status === 'completed',
    ).length;
    const canceledCount = unified.filter((x) => x.status === 'canceled').length;

    const respondedWithDuration = unified.filter(
      (x) => typeof x.durationMinutes === 'number',
    );
    const avgResponseTimeMinutes = respondedWithDuration.length
      ? Math.round(
          respondedWithDuration.reduce(
            (sum, x) => sum + (x.durationMinutes || 0),
            0,
          ) / respondedWithDuration.length,
        )
      : 0;

    const breakdown = {
      mentorship: unified.filter((x) => x.type === 'mentorship').length,
      team_join: unified.filter((x) => x.type === 'team_join').length,
      team_invitation: unified.filter((x) => x.type === 'team_invitation')
        .length,
      role_application: unified.filter((x) => x.type === 'role_application')
        .length,
    };

    // Filter
    let filtered = unified;
    if (options.type && options.type !== 'all') {
      filtered = filtered.filter((x) => x.type === options.type);
    }
    if (options.status && options.status !== 'all') {
      filtered = filtered.filter((x) => x.status === options.status);
    }
    if (options.search?.trim()) {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.summary.toLowerCase().includes(q) ||
          x.requester.name.toLowerCase().includes(q) ||
          x.requester.email?.toLowerCase().includes(q) ||
          x.requester.teamName?.toLowerCase().includes(q) ||
          x.responder?.name.toLowerCase().includes(q) ||
          x.responder?.teamName?.toLowerCase().includes(q) ||
          (x.notes && x.notes.toLowerCase().includes(q)),
      );
    }

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const items = filtered.slice(skip, skip + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalRequests,
        pendingCount,
        acceptedCount,
        rejectedCount,
        completedCount,
        canceledCount,
        avgResponseTimeMinutes,
        breakdown,
      },
    };
  }
}

