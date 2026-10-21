import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { officialChallengeWhere } from '../challenges/official-catalogue.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { CreateTaskDto, UpdateTaskDto } from './dto/team-task.dto.js';
import { InviteMemberDto, JoinRequestDto } from './dto/team-request.dto.js';
import { SearchTeamsDto } from './dto/search-teams.dto.js';
import { publicProfile } from '../profile/public-profile.js';
import { normalizePhone, phonePattern } from '../profile/contact.js';
import { applicationProfile } from './application-profile.js';
import {
  TeamMemberRole,
  TeamStatus,
  RequestStatus,
  TaskStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireContact(
    userId: string,
    db: Pick<Prisma.TransactionClient, 'user'> = this.prisma,
    applicant = false,
  ) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user?.phone || !phonePattern.test(normalizePhone(user.phone))) {
      throw new BadRequestException({
        code: applicant ? 'APPLICANT_CONTACT_REQUIRED' : 'CONTACT_REQUIRED',
        message:
          'A valid participant contact number is required in the profile',
      });
    }
  }

  async getLeaderContact(teamId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { teamId, role: TeamMemberRole.leader },
      select: { user: { select: { id: true, name: true, phone: true } } },
    });
    if (!member) throw new NotFoundException('Team leader not found');
    return {
      ...member.user,
      phone: member.user.phone ? normalizePhone(member.user.phone) : null,
    };
  }

  // Membership checks and writes must share one serializable snapshot. Retry
  // conflicting approvals so the last available seat can only be filled once.
  private async membershipTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 3) continue;
          if (error.code === 'P2002' || error.code === 'P2034') {
            throw new ConflictException(
              'Team membership changed. Refresh and try again.',
            );
          }
        }
        throw error;
      }
    }
  }

  async getMyRequests(userId: string) {
    const [invitations, joinRequests] = await Promise.all([
      this.prisma.teamInvitation.findMany({
        where: { invitedUserId: userId, status: RequestStatus.pending },
        select: {
          id: true,
          teamId: true,
          status: true,
          team: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.teamJoinRequest.findMany({
        where: { userId, status: RequestStatus.pending },
        select: {
          id: true,
          teamId: true,
          status: true,
          team: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { invitations, joinRequests };
  }

  async transferLeadership(
    teamId: string,
    userId: string,
    targetUserId: string,
  ) {
    return this.membershipTransaction(async (tx) => {
      const leader = await tx.teamMember.findUnique({ where: { userId } });
      if (leader?.teamId !== teamId || leader.role !== TeamMemberRole.leader) {
        throw new ForbiddenException(
          'Only the team leader can transfer leadership',
        );
      }
      const target = await tx.teamMember.findUnique({
        where: { userId: targetUserId },
      });
      if (target?.teamId !== teamId || targetUserId === userId) {
        throw new BadRequestException('Choose another member of your team');
      }
      await this.requireContact(targetUserId, tx, true);
      await tx.teamMember.update({
        where: { userId },
        data: { role: TeamMemberRole.member },
      });
      await tx.teamMember.update({
        where: { userId: targetUserId },
        data: { role: TeamMemberRole.leader },
      });
      return { success: true };
    });
  }

  // -------------------------------------------------------------
  // Helper: Format Team Object
  // -------------------------------------------------------------
  private formatTeam(team: any, memberView = false) {
    if (!team) return null;
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      challenge: team.challenge,
      challengeId: team.challengeId ?? null,
      challengeNeedsReview: Boolean(team.challenge && !team.challengeId),
      track: team.track,
      createdById: team.createdById,
      maxMembers: Math.min(team.maxMembers, 5),
      submissionStatus: team.submissionStatus,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      membersCount: team.members
        ? team.members.length
        : (team._count?.members ?? 0),
      members: team.members?.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        assignedRole: m.assignedRole,
        joinedAt: m.joinedAt,
        user: m.user
          ? {
              id: m.user.id,
              name: m.user.name,
              username: m.user.username,
              avatar: m.user.avatar,
              ...(memberView
                ? { phone: m.user.phone ? normalizePhone(m.user.phone) : null }
                : {}),
              profile: publicProfile(m.user.profile),
            }
          : undefined,
      })),
      tasks: (memberView ? team.tasks : undefined)?.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        assignedToId: t.assignedToId,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        assignedTo: t.assignedTo
          ? {
              id: t.assignedTo.id,
              name: t.assignedTo.name,
              avatar: t.assignedTo.avatar,
            }
          : null,
      })),
      invitations: team.invitations?.map((invitation: any) => ({
        id: invitation.id,
        teamId: invitation.teamId,
        invitedUserId: invitation.invitedUserId,
        status: invitation.status,
        message: invitation.message,
        createdAt: invitation.createdAt,
        invitedUser: invitation.invitedUser
          ? {
              id: invitation.invitedUser.id,
              name: invitation.invitedUser.name,
              avatar: invitation.invitedUser.avatar,
              profile: publicProfile(invitation.invitedUser.profile),
            }
          : undefined,
      })),
      joinRequests: team.joinRequests?.map((request: any) => ({
        id: request.id,
        teamId: request.teamId,
        userId: request.userId,
        status: request.status,
        message: request.message,
        createdAt: request.createdAt,
        user: request.user
          ? {
              id: request.user.id,
              name: request.user.name,
              avatar: request.user.avatar,
              ...(memberView
                ? {
                    phone: request.user.phone
                      ? normalizePhone(request.user.phone)
                      : null,
                    profile: applicationProfile(request.user.profile),
                  }
                : { profile: publicProfile(request.user.profile) }),
            }
          : undefined,
      })),
      createdBy: team.createdBy
        ? {
            id: team.createdBy.id,
            name: team.createdBy.name,
            avatar: team.createdBy.avatar,
          }
        : undefined,
    };
  }

  // -------------------------------------------------------------
  // 1. Create Team (Creator becomes Team Leader)
  // -------------------------------------------------------------
  async createTeam(userId: string, dto: CreateTeamDto) {
    const existingMembership = await this.prisma.teamMember.findUnique({
      where: { userId },
      include: { team: true },
    });

    if (existingMembership) {
      throw new ConflictException(
        `You are already a member of team "${existingMembership.team.name}". Leave your current team before creating a new one.`,
      );
    }

    const nameExists = await this.prisma.team.findUnique({
      where: { name: dto.name.trim() },
    });

    if (nameExists) {
      throw new ConflictException('A team with this name already exists.');
    }

    await this.requireContact(userId);

    const team = await this.prisma.$transaction(async (tx) => {
      const choice = dto.challenge?.trim()
        ? await tx.challenge.findFirst({
            where: {
              title: dto.challenge.trim(),
              ...officialChallengeWhere,
            },
            select: { id: true },
          })
        : null;
      if (dto.challenge?.trim() && !choice) throw new BadRequestException('Choose a published NASA challenge from the catalogue.');
      const created = await tx.team.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          challenge: dto.challenge?.trim() || null,
          challengeId: choice?.id || null,
          track: dto.track?.trim() || null,
          createdById: userId,
          members: {
            create: {
              userId,
              role: TeamMemberRole.leader,
              assignedRole: dto.assignedRole?.trim() || 'Team Leader',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
          createdBy: true,
        },
      });

      // Update user's profile team status
      await tx.profile.upsert({
        where: { userId },
        update: { teamStatus: TeamStatus.already_have_team },
        create: {
          userId,
          teamStatus: TeamStatus.already_have_team,
          skills: [],
          interests: [],
          isPublic: true,
        },
      });

      return created;
    });

    return this.formatTeam(team);
  }

  // -------------------------------------------------------------
  // 2. Get My Team
  // -------------------------------------------------------------
  async getMyTeam(userId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  include: { profile: true },
                },
              },
              orderBy: { joinedAt: 'asc' },
            },
            tasks: {
              include: {
                assignedTo: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            invitations: {
              where: { status: RequestStatus.pending },
              include: {
                invitedUser: {
                  include: { profile: true },
                },
              },
            },
            joinRequests: {
              where: { status: RequestStatus.pending },
              include: {
                user: {
                  include: { profile: true },
                },
              },
            },
            createdBy: true,
          },
        },
      },
    });

    if (!membership) {
      return null;
    }

    return {
      myRole: membership.role,
      myAssignedRole: membership.assignedRole,
      ...this.formatTeam(
        {
          ...membership.team,
          // Applications, including contact details, are for the reviewing leader.
          joinRequests:
            membership.role === TeamMemberRole.leader
              ? membership.team.joinRequests
              : [],
        },
        true,
      ),
    };
  }

  // -------------------------------------------------------------
  // 3. Get Team by ID
  // -------------------------------------------------------------
  async getTeamById(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        tasks: {
          include: {
            assignedTo: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        createdBy: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.formatTeam(team);
  }

  // -------------------------------------------------------------
  // 4. List / Search Teams
  // -------------------------------------------------------------
  async listTeams(dto: SearchTeamsDto) {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(100, Math.max(1, dto.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (dto.challenge) {
      where.challenge = { contains: dto.challenge.trim(), mode: 'insensitive' };
    }

    if (dto.track) {
      where.track = { contains: dto.track.trim(), mode: 'insensitive' };
    }

    if (dto.submissionStatus) {
      where.submissionStatus = dto.submissionStatus;
    }

    if (dto.search) {
      const q = dto.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { challenge: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          createdBy: true,
        },
      }),
      this.prisma.team.count({ where }),
    ]);

    return {
      items: items.map((t) => this.formatTeam(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // -------------------------------------------------------------
  // 5. Update Team (Leader or Organizer)
  // -------------------------------------------------------------
  async updateTeam(
    teamId: string,
    userId: string,
    userRoles: string[],
    dto: UpdateTeamDto,
  ) {
    if (dto.submissionStatus !== undefined) {
      throw new BadRequestException(
        'Use the submission endpoint to change submission status',
      );
    }
    return this.membershipTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM teams WHERE id = ${teamId} FOR UPDATE`;
      const team = await tx.team.findUnique({
        where: { id: teamId },
        include: { members: true },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const isLeader = team.members.some(
        (m) => m.userId === userId && m.role === TeamMemberRole.leader,
      );
      const isOrganizer = userRoles.includes('organizer');

      if (!isLeader && !isOrganizer) {
        throw new ForbiddenException(
          'Only the team leader or organizers can update team details',
        );
      }

      if (dto.name && dto.name.trim() !== team.name) {
        const conflict = await tx.team.findUnique({
          where: { name: dto.name.trim() },
        });
        if (conflict) {
          throw new ConflictException('A team with this name already exists.');
        }
      }

      let challengeId = team.challengeId;
      if (
        dto.challenge !== undefined &&
        (dto.challenge.trim() || null) !== team.challenge
      ) {
        const deadline = process.env.SUBMISSION_DEADLINE;
        if (
          !isOrganizer &&
          deadline &&
          /(Z|[+-]\d{2}:\d{2})$/.test(deadline) &&
          Number.isFinite(Date.parse(deadline)) &&
          Date.now() >= Date.parse(deadline)
        )
          throw new ForbiddenException({
            code: 'SUBMISSION_CLOSED',
            message: 'The submission deadline has passed',
          });
        if (team.challengeId && await tx.teamSubmission.findUnique({ where: { teamId } }))
          throw new ConflictException(
            'A project is already saved for this team. Its challenge cannot be changed.',
          );
        const choice = dto.challenge.trim()
          ? await tx.challenge.findFirst({
              where: {
                title: dto.challenge.trim(),
                ...officialChallengeWhere,
              },
              select: { id: true },
            })
          : null;
        if (dto.challenge.trim() && !choice) throw new BadRequestException('Choose a published NASA challenge from the catalogue.');
        challengeId = choice?.id || null;
      }
      const updated = await tx.team.update({
        where: { id: teamId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(dto.challenge !== undefined
            ? {
                challenge: dto.challenge?.trim() || null,
                challengeId,
              }
            : {}),
          ...(dto.track !== undefined
            ? { track: dto.track?.trim() || null }
            : {}),
          ...(dto.submissionStatus !== undefined
            ? { submissionStatus: dto.submissionStatus }
            : {}),
        },
        include: {
          members: {
            include: { user: true },
          },
          createdBy: true,
        },
      });

      return this.formatTeam(updated);
    });
  }

  // -------------------------------------------------------------
  // 6. Invite Member (Team Leader)
  // -------------------------------------------------------------
  async inviteMember(
    teamId: string,
    leaderUserId: string,
    dto: InviteMemberDto,
  ) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const isLeader = team.members.some(
      (m) => m.userId === leaderUserId && m.role === TeamMemberRole.leader,
    );
    if (!isLeader) {
      throw new ForbiddenException(
        'Only the team leader can invite new members',
      );
    }

    if (team.members.length >= Math.min(team.maxMembers, 5)) {
      throw new BadRequestException(
        `Team is full (max ${team.maxMembers} members)`,
      );
    }

    if ([dto.userId, dto.email, dto.username].filter(Boolean).length !== 1) {
      throw new BadRequestException('Provide one participant username, email or user ID');
    }
    const targetUser = dto.username ? await this.prisma.user.findFirst({
      where: { username: { equals: dto.username.trim().replace(/^@/, ''), mode: 'insensitive' } },
      include: { teamMemberships: true },
    }) : await this.prisma.user.findUnique({
      where: dto.userId
        ? { id: dto.userId }
        : { email: dto.email!.trim().toLowerCase() },
      include: { teamMemberships: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Invited participant not found');
    }

    if (targetUser.teamMemberships.length > 0) {
      throw new ConflictException(
        'This participant is already a member of a team',
      );
    }

    const invitation = await this.prisma.teamInvitation.upsert({
      where: {
        teamId_invitedUserId: {
          teamId,
          invitedUserId: targetUser.id,
        },
      },
      update: {
        status: RequestStatus.pending,
        invitedByUserId: leaderUserId,
      },
      create: {
        teamId,
        invitedUserId: targetUser.id,
        invitedByUserId: leaderUserId,
        status: RequestStatus.pending,
      },
      include: {
        team: true,
        invitedUser: true,
      },
    });

    return {
      success: true,
      message: `Invitation sent to ${targetUser.name || targetUser.email}`,
      invitation: { id: invitation.id, status: invitation.status, teamId },
    };
  }

  // -------------------------------------------------------------
  // 7. Respond to Invitation (Participant accept / reject)
  // -------------------------------------------------------------
  async getMyInvitations(userId: string) {
    const invitations = await this.prisma.teamInvitation.findMany({
      where: { invitedUserId: userId, status: RequestStatus.pending },
      include: {
        team: { select: { id: true, name: true, track: true } },
        invitedByUser: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { invitations };
  }

  async respondToInvitation(
    invitationId: string,
    userId: string,
    accept: boolean,
  ) {
    return this.membershipTransaction(async (tx) => {
      const invitation = await tx.teamInvitation.findUnique({
        where: { id: invitationId },
        include: {
          team: { include: { members: true } },
        },
      });

      if (!invitation || invitation.invitedUserId !== userId) {
        throw new NotFoundException(
          'Invitation not found or not addressed to you',
        );
      }

      if (invitation.status !== RequestStatus.pending) {
        throw new BadRequestException('This invitation is no longer pending');
      }

      if (!accept) {
        await tx.teamInvitation.update({
          where: { id: invitationId },
          data: { status: RequestStatus.rejected },
        });

        await tx.notification.create({
          data: {
            userId: invitation.invitedByUserId,
            title: 'Team Invitation Declined',
            titleAr: 'تم رفض دعوة الفريق',
            message: `The user declined your invitation to join ${invitation.team.name}.`,
            messageAr: `تم رفض دعوتك للانضمام إلى فريق ${invitation.team.name}.`,
            type: 'team_invite',
            link: '/dashboard/participant/team',
          },
        });

        return { success: true, message: 'Invitation declined' };
      }

      // Accepting
      if (
        invitation.team.members.length >=
        Math.min(invitation.team.maxMembers, 5)
      ) {
        throw new BadRequestException('This team is already full');
      }

      const existingMembership = await tx.teamMember.findUnique({
        where: { userId },
      });
      if (existingMembership) {
        throw new ConflictException('You are already a member of another team');
      }

      await this.requireContact(userId, tx);

      {
        await tx.teamMember.create({
          data: {
            teamId: invitation.teamId,
            userId,
            role: TeamMemberRole.member,
          },
        });

        await tx.teamInvitation.update({
          where: { id: invitationId },
          data: { status: RequestStatus.accepted },
        });

        await tx.notification.create({
          data: {
            userId: invitation.invitedByUserId,
            title: 'Team Invitation Accepted',
            titleAr: 'تم قبول دعوة الفريق',
            message: `A new member has accepted your invitation and joined team ${invitation.team.name}!`,
            messageAr: `قبل العضو دعوتك وانضم رسمياً إلى فريق ${invitation.team.name}!`,
            type: 'team_invite',
            link: '/dashboard/participant/team',
          },
        });

        await tx.profile.upsert({
          where: { userId },
          update: { teamStatus: TeamStatus.already_have_team },
          create: {
            userId,
            teamStatus: TeamStatus.already_have_team,
            skills: [],
            interests: [],
            isPublic: true,
          },
        });
      }

      return {
        success: true,
        message: `Successfully joined ${invitation.team.name}!`,
      };
    });
  }

  // -------------------------------------------------------------
  // 8. Request to Join Team (Participant requests to join)
  // -------------------------------------------------------------
  async requestToJoinTeam(teamId: string, userId: string, dto: JoinRequestDto) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.members.length >= Math.min(team.maxMembers, 5)) {
      throw new BadRequestException('Team is already full');
    }

    const existingMembership = await this.prisma.teamMember.findUnique({
      where: { userId },
    });
    if (existingMembership) {
      throw new ConflictException('You are already in a team');
    }

    await this.requireContact(userId);

    const request = await this.prisma.teamJoinRequest.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
      update: {
        message: dto.message?.trim() || null,
        status: RequestStatus.pending,
      },
      create: {
        teamId,
        userId,
        message: dto.message?.trim() || null,
        status: RequestStatus.pending,
      },
    });

    return {
      success: true,
      message: 'Join request submitted to team leader',
      request,
    };
  }

  // -------------------------------------------------------------
  // 9. Respond to Join Request (Team Leader accepts/rejects)
  // -------------------------------------------------------------
  async respondToJoinRequest(
    requestId: string,
    leaderUserId: string,
    accept: boolean,
  ) {
    return this.membershipTransaction(async (tx) => {
      const joinReq = await tx.teamJoinRequest.findUnique({
        where: { id: requestId },
        include: {
          team: { include: { members: true } },
        },
      });

      if (!joinReq) {
        throw new NotFoundException('Join request not found');
      }

      const isLeader = joinReq.team.members.some(
        (m) => m.userId === leaderUserId && m.role === TeamMemberRole.leader,
      );
      if (!isLeader) {
        throw new ForbiddenException(
          'Only the team leader can respond to join requests',
        );
      }

      if (joinReq.status !== RequestStatus.pending) {
        throw new BadRequestException('This join request is no longer pending');
      }

      if (!accept) {
        await tx.teamJoinRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.rejected },
        });

        await tx.notification.create({
          data: {
            userId: joinReq.userId,
            title: 'Team Join Request Declined',
            titleAr: 'تم رفض طلب الانضمام للفريق',
            message: `Your request to join team ${joinReq.team.name} was not accepted.`,
            messageAr: `تم رفض طلب انضمامك إلى فريق ${joinReq.team.name}.`,
            type: 'team_join',
            link: '/dashboard/participant/find-team',
          },
        });

        return { success: true, message: 'Join request declined' };
      }

      // Accepting
      if (joinReq.team.members.length >= Math.min(joinReq.team.maxMembers, 5)) {
        throw new BadRequestException('Team is already full');
      }

      const existingMembership = await tx.teamMember.findUnique({
        where: { userId: joinReq.userId },
      });
      if (existingMembership) {
        throw new ConflictException(
          'The user is already a member of another team',
        );
      }

      await this.requireContact(joinReq.userId, tx, true);

      {
        await tx.teamMember.create({
          data: {
            teamId: joinReq.teamId,
            userId: joinReq.userId,
            role: TeamMemberRole.member,
          },
        });

        await tx.teamJoinRequest.update({
          where: { id: requestId },
          data: { status: RequestStatus.accepted },
        });

        await tx.notification.create({
          data: {
            userId: joinReq.userId,
            title: 'Team Join Request Accepted',
            titleAr: 'تم قبول طلب الانضمام للفريق',
            message: `Congratulations! You have been accepted into team ${joinReq.team.name}.`,
            messageAr: `تهانينا! تم قبولك كعضو في فريق ${joinReq.team.name}.`,
            type: 'team_join',
            link: '/dashboard/participant/team',
          },
        });

        await tx.profile.upsert({
          where: { userId: joinReq.userId },
          update: { teamStatus: TeamStatus.already_have_team },
          create: {
            userId: joinReq.userId,
            teamStatus: TeamStatus.already_have_team,
            skills: [],
            interests: [],
            isPublic: true,
          },
        });
      }

      return { success: true, message: 'Member successfully added to team' };
    });
  }

  // -------------------------------------------------------------
  // 10. Remove Member / Leave Team
  // -------------------------------------------------------------
  async removeMember(
    teamId: string,
    callerUserId: string,
    targetUserId: string,
  ) {
    return this.membershipTransaction(async (tx) => {
      const team = await tx.team.findUnique({
        where: { id: teamId },
        include: { members: true },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const isLeader = team.members.some(
        (m) => m.userId === callerUserId && m.role === TeamMemberRole.leader,
      );
      const isSelf = callerUserId === targetUserId;

      if (!isLeader && !isSelf) {
        throw new ForbiddenException('Only the team leader can remove members');
      }

      const targetMembership = team.members.find(
        (m) => m.userId === targetUserId,
      );
      if (!targetMembership) {
        throw new NotFoundException('Target user is not a member of this team');
      }

      if (
        targetMembership.role === TeamMemberRole.leader &&
        team.members.length > 1
      ) {
        throw new BadRequestException(
          'Team leader cannot leave while other members exist. Transfer leadership first.',
        );
      }

      {
        await tx.teamMember.delete({
          where: { userId: targetUserId },
        });

        // Update unassigned tasks
        await tx.teamTask.updateMany({
          where: { teamId, assignedToId: targetUserId },
          data: { assignedToId: null },
        });

        // Update profile status
        await tx.profile.updateMany({
          where: { userId: targetUserId },
          data: { teamStatus: TeamStatus.want_to_join_team },
        });

        // If no members left in team, delete team
        if (team.members.length <= 1) {
          await tx.team.delete({ where: { id: teamId } });
        }
      }

      return {
        success: true,
        message: isSelf ? 'You have left the team' : 'Member removed from team',
      };
    });
  }

  // -------------------------------------------------------------
  // 11. Create Team Task (Section 4)
  // -------------------------------------------------------------
  async createTask(teamId: string, userId: string, dto: CreateTaskDto) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId },
    });

    if (!membership || membership.teamId !== teamId) {
      throw new ForbiddenException(
        'You must be a member of this team to create tasks',
      );
    }

    if (dto.assignedToId) {
      const assignedMember = await this.prisma.teamMember.findFirst({
        where: { teamId, userId: dto.assignedToId },
      });
      if (!assignedMember) {
        throw new BadRequestException(
          'Assigned user must be a member of this team',
        );
      }
    }

    const task = await this.prisma.teamTask.create({
      data: {
        teamId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status || TaskStatus.not_started,
        assignedToId: dto.assignedToId || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
    });

    return task;
  }

  // -------------------------------------------------------------
  // 12. Update Team Task (Status / Assignment / Details)
  // -------------------------------------------------------------
  async updateTask(taskId: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.teamTask.findUnique({
      where: { id: taskId },
      include: { team: { include: { members: true } } },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isMember = task.team.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException(
        'You must be a member of this team to update tasks',
      );
    }

    if (dto.assignedToId) {
      const assignedMember = task.team.members.find(
        (m) => m.userId === dto.assignedToId,
      );
      if (!assignedMember) {
        throw new BadRequestException(
          'Assigned user must be a member of this team',
        );
      }
    }

    const updatedTask = await this.prisma.teamTask.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.assignedToId !== undefined
          ? { assignedToId: dto.assignedToId || null }
          : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
    });

    return updatedTask;
  }

  // -------------------------------------------------------------
  // 13. Delete Team Task
  // -------------------------------------------------------------
  async deleteTask(taskId: string, userId: string) {
    const task = await this.prisma.teamTask.findUnique({
      where: { id: taskId },
      include: { team: { include: { members: true } } },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isLeader = task.team.members.some(
      (m) => m.userId === userId && m.role === TeamMemberRole.leader,
    );
    if (!isLeader) {
      throw new ForbiddenException('Only the team leader can delete tasks');
    }

    await this.prisma.teamTask.delete({
      where: { id: taskId },
    });

    return { success: true, message: 'Task deleted successfully' };
  }
}
