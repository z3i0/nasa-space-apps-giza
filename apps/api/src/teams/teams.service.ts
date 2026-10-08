import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { CreateTaskDto, UpdateTaskDto } from './dto/team-task.dto.js';
import { InviteMemberDto, JoinRequestDto } from './dto/team-request.dto.js';
import { SearchTeamsDto } from './dto/search-teams.dto.js';
import {
  TeamMemberRole,
  TeamStatus,
  RequestStatus,
  TaskStatus,
} from '@prisma/client';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // Helper: Format Team Object
  // -------------------------------------------------------------
  private formatTeam(team: any) {
    if (!team) return null;
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      challenge: team.challenge,
      track: team.track,
      createdById: team.createdById,
      maxMembers: team.maxMembers,
      submissionStatus: team.submissionStatus,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      membersCount: team.members ? team.members.length : (team._count?.members ?? 0),
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
              email: m.user.email,
              avatar: m.user.avatar,
              phone: m.user.phone,
              profile: m.user.profile || null,
            }
          : undefined,
      })),
      tasks: team.tasks?.map((t: any) => ({
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
              email: t.assignedTo.email,
              avatar: t.assignedTo.avatar,
            }
          : null,
      })),
      invitations: team.invitations,
      joinRequests: team.joinRequests,
      createdBy: team.createdBy
        ? {
            id: team.createdBy.id,
            name: team.createdBy.name,
            email: team.createdBy.email,
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

    const team = await this.prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          challenge: dto.challenge?.trim() || null,
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
      ...this.formatTeam(membership.team),
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
  async updateTeam(teamId: string, userId: string, userRoles: string[], dto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({
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
      throw new ForbiddenException('Only the team leader or organizers can update team details');
    }

    if (dto.name && dto.name.trim() !== team.name) {
      const conflict = await this.prisma.team.findUnique({
        where: { name: dto.name.trim() },
      });
      if (conflict) {
        throw new ConflictException('A team with this name already exists.');
      }
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.challenge !== undefined ? { challenge: dto.challenge?.trim() || null } : {}),
        ...(dto.track !== undefined ? { track: dto.track?.trim() || null } : {}),
        ...(dto.submissionStatus !== undefined ? { submissionStatus: dto.submissionStatus } : {}),
      },
      include: {
        members: {
          include: { user: true },
        },
        createdBy: true,
      },
    });

    return this.formatTeam(updated);
  }

  // -------------------------------------------------------------
  // 6. Invite Member (Team Leader)
  // -------------------------------------------------------------
  async inviteMember(teamId: string, leaderUserId: string, dto: InviteMemberDto) {
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
      throw new ForbiddenException('Only the team leader can invite new members');
    }

    if (team.members.length >= team.maxMembers) {
      throw new BadRequestException(`Team is full (max ${team.maxMembers} members)`);
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { teamMemberships: true },
    });

    if (!targetUser) {
      throw new NotFoundException('Invited participant not found');
    }

    if (targetUser.teamMemberships.length > 0) {
      throw new ConflictException('This participant is already a member of a team');
    }

    const invitation = await this.prisma.teamInvitation.upsert({
      where: {
        teamId_invitedUserId: {
          teamId,
          invitedUserId: dto.userId,
        },
      },
      update: {
        status: RequestStatus.pending,
        invitedByUserId: leaderUserId,
      },
      create: {
        teamId,
        invitedUserId: dto.userId,
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
      invitation,
    };
  }

  // -------------------------------------------------------------
  // 7. Respond to Invitation (Participant accept / reject)
  // -------------------------------------------------------------
  async respondToInvitation(invitationId: string, userId: string, accept: boolean) {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: {
        team: { include: { members: true } },
      },
    });

    if (!invitation || invitation.invitedUserId !== userId) {
      throw new NotFoundException('Invitation not found or not addressed to you');
    }

    if (invitation.status !== RequestStatus.pending) {
      throw new BadRequestException('This invitation is no longer pending');
    }

    if (!accept) {
      await this.prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { status: RequestStatus.rejected },
      });
      return { success: true, message: 'Invitation declined' };
    }

    // Accepting
    if (invitation.team.members.length >= invitation.team.maxMembers) {
      throw new BadRequestException('This team is already full');
    }

    const existingMembership = await this.prisma.teamMember.findUnique({
      where: { userId },
    });
    if (existingMembership) {
      throw new ConflictException('You are already a member of another team');
    }

    await this.prisma.$transaction(async (tx) => {
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
    });

    return { success: true, message: `Successfully joined ${invitation.team.name}!` };
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

    if (team.members.length >= team.maxMembers) {
      throw new BadRequestException('Team is already full');
    }

    const existingMembership = await this.prisma.teamMember.findUnique({
      where: { userId },
    });
    if (existingMembership) {
      throw new ConflictException('You are already in a team');
    }

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
  async respondToJoinRequest(requestId: string, leaderUserId: string, accept: boolean) {
    const joinReq = await this.prisma.teamJoinRequest.findUnique({
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
      throw new ForbiddenException('Only the team leader can respond to join requests');
    }

    if (joinReq.status !== RequestStatus.pending) {
      throw new BadRequestException('This join request is no longer pending');
    }

    if (!accept) {
      await this.prisma.teamJoinRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.rejected },
      });
      return { success: true, message: 'Join request declined' };
    }

    // Accepting
    if (joinReq.team.members.length >= joinReq.team.maxMembers) {
      throw new BadRequestException('Team is already full');
    }

    const existingMembership = await this.prisma.teamMember.findUnique({
      where: { userId: joinReq.userId },
    });
    if (existingMembership) {
      throw new ConflictException('The user is already a member of another team');
    }

    await this.prisma.$transaction(async (tx) => {
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
    });

    return { success: true, message: 'Member successfully added to team' };
  }

  // -------------------------------------------------------------
  // 10. Remove Member / Leave Team
  // -------------------------------------------------------------
  async removeMember(teamId: string, callerUserId: string, targetUserId: string) {
    const team = await this.prisma.team.findUnique({
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

    const targetMembership = team.members.find((m) => m.userId === targetUserId);
    if (!targetMembership) {
      throw new NotFoundException('Target user is not a member of this team');
    }

    if (targetMembership.role === TeamMemberRole.leader && team.members.length > 1) {
      throw new BadRequestException(
        'Team leader cannot leave while other members exist. Transfer leadership first.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
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
    });

    return {
      success: true,
      message: isSelf ? 'You have left the team' : 'Member removed from team',
    };
  }

  // -------------------------------------------------------------
  // 11. Create Team Task (Section 4)
  // -------------------------------------------------------------
  async createTask(teamId: string, userId: string, dto: CreateTaskDto) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId },
    });

    if (!membership || membership.teamId !== teamId) {
      throw new ForbiddenException('You must be a member of this team to create tasks');
    }

    if (dto.assignedToId) {
      const assignedMember = await this.prisma.teamMember.findFirst({
        where: { teamId, userId: dto.assignedToId },
      });
      if (!assignedMember) {
        throw new BadRequestException('Assigned user must be a member of this team');
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
        assignedTo: true,
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
      throw new ForbiddenException('You must be a member of this team to update tasks');
    }

    if (dto.assignedToId) {
      const assignedMember = task.team.members.find((m) => m.userId === dto.assignedToId);
      if (!assignedMember) {
        throw new BadRequestException('Assigned user must be a member of this team');
      }
    }

    const updatedTask = await this.prisma.teamTask.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId || null } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
      },
      include: {
        assignedTo: true,
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
