import { randomUUID } from 'node:crypto';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TeamsService } from '../src/teams/teams.service.js';

// Uses isolated disposable users in the local database; never touches demo data.
describe('Team workspace (live database)', () => {
  const prisma = new PrismaService();
  const service = new TeamsService(prisma);
  let ids: string[] = [];
  let suffix: string;
  beforeAll(async () => {
    await prisma.$connect();
  });
  beforeEach(async () => {
    suffix = randomUUID();
    ids = Array.from({ length: 7 }, () => randomUUID());
    await prisma.user.createMany({
      data: ids.map((id, index) => ({
        id,
        name: `Crew ${index}`,
        email: `${index}.${suffix}@workspace.test`,
        phone: `+20100000000${index}`,
      })),
    });
  });
  afterEach(async () => {
    await prisma.team.deleteMany({ where: { createdById: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('shares applicant details only with the receiving leader and keeps contacts out of public lists', async () => {
    const team = await service.createTeam(ids[0], { name: `Private ${suffix}` });
    await prisma.teamMember.create({ data: { teamId: team.id, userId: ids[2] } });
    await prisma.profile.create({ data: {
      userId: ids[1], isPublic: false, hideFromSearch: true, bio: 'I analyse satellite imagery',
      skills: ['Python', 'GIS'], interests: ['Climate'], experience: 'Built a flood map',
      institution: 'Cairo University', academicLevel: 'Graduate', desiredRole: 'GIS analyst',
      githubUrl: 'https://github.com/example',
    } });
    await service.requestToJoinTeam(team.id, ids[1], { message: 'Ready to help' });
    const leaderView = await service.getMyTeam(ids[0]);
    expect(leaderView?.joinRequests?.[0].user).toMatchObject({
      phone: '+201000000001', profile: {
        bio: 'I analyse satellite imagery', skills: ['Python', 'GIS'],
        experience: 'Built a flood map', institution: 'Cairo University',
      },
    });
    expect(leaderView?.joinRequests?.[0].user).not.toHaveProperty('email');
    expect((await service.getMyTeam(ids[2]))?.joinRequests).toEqual([]);
    const publicViews = JSON.stringify([await service.getTeamById(team.id), await service.listTeams({ search: suffix })]);
    expect(publicViews).not.toContain('phone');
    expect(publicViews).not.toContain('I analyse satellite imagery');
    expect(await service.getLeaderContact(team.id)).toMatchObject({ id: ids[0], phone: '+201000000000' });
    await service.transferLeadership(team.id, ids[0], ids[2]);
    expect(await service.getLeaderContact(team.id)).toMatchObject({ id: ids[2], phone: '+201000000002' });
    expect((await service.getMyTeam(ids[0]))?.joinRequests).toEqual([]);
    expect((await service.getMyTeam(ids[2]))?.joinRequests).toHaveLength(1);
  });

  it('requires contact information before creating, requesting, or accepting membership', async () => {
    await prisma.user.update({ where: { id: ids[1] }, data: { phone: null } });
    await expect(service.createTeam(ids[1], { name: `No phone ${suffix}` })).rejects.toMatchObject({ response: { code: 'CONTACT_REQUIRED' } });
    const team = await service.createTeam(ids[0], { name: `Contact ${suffix}` });
    await expect(service.requestToJoinTeam(team.id, ids[1], {})).rejects.toMatchObject({ response: { code: 'CONTACT_REQUIRED' } });
    const invite = await service.inviteMember(team.id, ids[0], { userId: ids[1] });
    await expect(service.respondToInvitation(invite.invitation.id, ids[1], true)).rejects.toMatchObject({ response: { code: 'CONTACT_REQUIRED' } });
    expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(1);
  });

  it('persists creation, search, join approval, edits and removal with profile status', async () => {
    const team = await service.createTeam(ids[0], {
      name: `Crew ${suffix}`,
      description: 'Earth data',
    });
    expect((await service.getMyTeam(ids[0]))?.myRole).toBe('leader');
    expect((await service.listTeams({ search: suffix })).items[0].id).toBe(
      team.id,
    );
    const request = await service.requestToJoinTeam(team.id, ids[1], {
      message: 'I build maps',
    });
    expect((await service.getMyRequests(ids[1])).joinRequests).toHaveLength(1);
    await expect(
      service.respondToJoinRequest(request.request.id, ids[2], true),
    ).rejects.toMatchObject({ status: 403 });
    await service.respondToJoinRequest(request.request.id, ids[0], true);
    expect((await service.getMyTeam(ids[1]))?.membersCount).toBe(2);
    expect(
      (await prisma.profile.findUnique({ where: { userId: ids[1] } }))
        ?.teamStatus,
    ).toBe('already_have_team');
    await expect(
      service.updateTeam(team.id, ids[1], ['participant'], {
        description: 'Unauthorized',
      }),
    ).rejects.toMatchObject({ status: 403 });
    await service.updateTeam(team.id, ids[0], ['participant'], {
      description: 'Updated mission',
    });
    expect((await service.getMyTeam(ids[0]))?.description).toBe(
      'Updated mission',
    );
    await service.removeMember(team.id, ids[0], ids[1]);
    expect(await service.getMyTeam(ids[1])).toBeNull();
    expect(
      (await prisma.profile.findUnique({ where: { userId: ids[1] } }))
        ?.teamStatus,
    ).toBe('want_to_join_team');
  });

  it('delivers email invitations privately and prevents joining multiple teams', async () => {
    const team = await service.createTeam(ids[0], { name: `Invite ${suffix}` });
    const response = await service.inviteMember(team.id, ids[0], {
      email: `1.${suffix}@workspace.test`,
    });
    expect(response.invitation).not.toHaveProperty('invitedUser');
    expect((await service.getMyRequests(ids[1])).invitations[0].team.name).toBe(
      team.name,
    );
    expect((await service.getMyRequests(ids[2])).invitations).toHaveLength(0);
    await expect(
      service.respondToInvitation(response.invitation.id, ids[2], true),
    ).rejects.toMatchObject({ status: 404 });
    await service.respondToInvitation(response.invitation.id, ids[1], true);
    expect((await service.getMyRequests(ids[1])).invitations).toHaveLength(0);
    await expect(
      service.createTeam(ids[1], { name: `Second ${suffix}` }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.respondToInvitation(response.invitation.id, ids[1], true),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('allows only one simultaneous approval into the fifth seat, across both admission paths', async () => {
    const team = await service.createTeam(ids[0], {
      name: `Capacity ${suffix}`,
    });
    await prisma.teamMember.createMany({
      data: ids.slice(1, 4).map((userId) => ({ teamId: team.id, userId })),
    });
    const a = await service.requestToJoinTeam(team.id, ids[4], {});
    const b = await service.requestToJoinTeam(team.id, ids[5], {});
    const c = await service.inviteMember(team.id, ids[0], { userId: ids[6] });
    const results = await Promise.allSettled([
      service.respondToJoinRequest(a.request.id, ids[0], true),
      service.respondToJoinRequest(b.request.id, ids[0], true),
      service.respondToInvitation(c.invitation.id, ids[6], true),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(
      5,
    );
    expect((await service.getMyTeam(ids[0]))?.maxMembers).toBe(5);
  });

  it('transfers leadership, protects the roster, and deletes only after the last member leaves', async () => {
    const team = await service.createTeam(ids[0], { name: `Leader ${suffix}` });
    const request = await service.requestToJoinTeam(team.id, ids[1], {});
    await service.respondToJoinRequest(request.request.id, ids[0], true);
    await expect(
      service.removeMember(team.id, ids[0], ids[0]),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.transferLeadership(team.id, ids[1], ids[0]),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.transferLeadership(team.id, ids[0], ids[2]),
    ).rejects.toMatchObject({ status: 400 });
    await service.transferLeadership(team.id, ids[0], ids[1]);
    expect((await service.getMyTeam(ids[1]))?.myRole).toBe('leader');
    await expect(
      service.removeMember(team.id, ids[0], ids[1]),
    ).rejects.toMatchObject({ status: 403 });
    await service.removeMember(team.id, ids[0], ids[0]);
    expect((await service.getMyTeam(ids[1]))?.membersCount).toBe(1);
    await service.removeMember(team.id, ids[1], ids[1]);
    expect(await prisma.team.findUnique({ where: { id: team.id } })).toBeNull();
  });
});
