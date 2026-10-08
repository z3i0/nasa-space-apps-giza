import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { TeamsService } from '../src/teams/teams.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TaskStatus, TeamMemberRole, TeamStatus } from '@prisma/client';
import type { INestApplicationContext } from '@nestjs/common';

describe('Teams Module Integration Flow (Live DB)', () => {
  let app: INestApplicationContext;
  let teamsService: TeamsService;
  let authService: AuthService;
  let prisma: PrismaService;

  const leaderEmail = `leader.${Date.now()}@hackathon.local`;
  const memberEmail = `member.${Date.now()}@hackathon.local`;
  let leaderId: string;
  let memberId: string;
  let teamId: string;
  let invitationId: string;
  let taskId: string;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    teamsService = app.get(TeamsService);
    authService = app.get(AuthService);
    prisma = app.get(PrismaService);

    // Register 2 test participants
    const leaderRes = await authService.register({
      name: 'Leader Test',
      email: leaderEmail,
      password: 'Password123!',
      preferredChallenge: 'Planetary Defense',
      teamStatus: TeamStatus.want_to_create_team,
    });
    leaderId = leaderRes.user.id;

    const memberRes = await authService.register({
      name: 'Member Test',
      email: memberEmail,
      password: 'Password123!',
      preferredChallenge: 'Planetary Defense',
      teamStatus: TeamStatus.want_to_join_team,
    });
    memberId = memberRes.user.id;
  });

  afterAll(async () => {
    if (teamId) {
      await prisma.team.deleteMany({ where: { id: teamId } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [leaderId, memberId] } },
    });
    await app.close();
  });

  it('1. Leader creates a new team', async () => {
    const team = await teamsService.createTeam(leaderId, {
      name: `Pioneers ${Date.now()}`,
      description: 'Asteroid tracking and mitigation algorithms',
      challenge: 'Planetary Defense',
      assignedRole: 'Lead Astrodynamicist',
    });

    expect(team).toBeDefined();
    expect(team.id).toBeDefined();
    teamId = team.id;
    expect(team.membersCount).toBe(1);
    expect(team.members[0].role).toBe(TeamMemberRole.leader);

    // Profile teamStatus should have been updated to already_have_team
    const profile = await prisma.profile.findUnique({ where: { userId: leaderId } });
    expect(profile?.teamStatus).toBe(TeamStatus.already_have_team);
  });

  it('2. Leader invites member to the team', async () => {
    const inviteRes = await teamsService.inviteMember(teamId, leaderId, {
      userId: memberId,
    });

    expect(inviteRes.success).toBe(true);
    expect(inviteRes.invitation).toBeDefined();
    invitationId = inviteRes.invitation.id;
  });

  it('3. Member accepts the invitation and joins team', async () => {
    const res = await teamsService.respondToInvitation(invitationId, memberId, true);
    expect(res.success).toBe(true);

    const team = await teamsService.getTeamById(teamId);
    expect(team.membersCount).toBe(2);

    const memberProfile = await prisma.profile.findUnique({ where: { userId: memberId } });
    expect(memberProfile?.teamStatus).toBe(TeamStatus.already_have_team);
  });

  it('4. Leader creates a task assigned to the new member', async () => {
    const task = await teamsService.createTask(teamId, leaderId, {
      title: 'Analyze CNEOS Orbit Data',
      description: 'Calculate orbital intersection distance',
      status: TaskStatus.not_started,
      assignedToId: memberId,
    });

    expect(task).toBeDefined();
    expect(task.title).toBe('Analyze CNEOS Orbit Data');
    expect(task.assignedToId).toBe(memberId);
    taskId = task.id;
  });

  it('5. Member updates task status to in_progress then completed', async () => {
    const inProgress = await teamsService.updateTask(taskId, memberId, {
      status: TaskStatus.in_progress,
    });
    expect(inProgress.status).toBe(TaskStatus.in_progress);

    const completed = await teamsService.updateTask(taskId, memberId, {
      status: TaskStatus.completed,
    });
    expect(completed.status).toBe(TaskStatus.completed);
  });

  it('6. Member retrieves team info via getMyTeam', async () => {
    const myTeam = await teamsService.getMyTeam(memberId);
    expect(myTeam).toBeDefined();
    expect(myTeam?.id).toBe(teamId);
    expect(myTeam?.myRole).toBe(TeamMemberRole.member);
    expect(myTeam?.tasks.length).toBeGreaterThanOrEqual(1);
    expect(myTeam?.tasks[0].status).toBe(TaskStatus.completed);
  });
});
