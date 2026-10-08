import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const API_BASE = 'http://localhost:4000/api';

describe('🚀 Full End-to-End Live HTTP Test Suite', () => {
  const prisma = new PrismaClient();

  const timestamp = Date.now();
  const user1Email = `e2e.leader.${timestamp}@hackathon.local`;
  const user2Email = `e2e.member.${timestamp}@hackathon.local`;
  const teamName = `Galactic Vanguard ${timestamp}`;

  let user1Token = '';
  let user2Token = '';
  let user1Id = '';
  let user2Id = '';
  let createdTeamId = '';
  let createdTaskId = '';
  let invitationId = '';

  afterAll(async () => {
    // Cleanup any created test resources
    if (createdTeamId) {
      await prisma.team.deleteMany({ where: { id: createdTeamId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [user1Email, user2Email] } },
    });
    await prisma.$disconnect();
  });

  // -----------------------------------------------------------------
  // 1. Account Creation & Profile Setup
  // -----------------------------------------------------------------
  it('1.1. Registers User 1 with complete profile details', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Commander Shepard',
        email: user1Email,
        password: 'Password123!',
        phone: '+201011112222',
        institution: 'Cairo University',
        academicLevel: 'Senior',
        skills: ['Python', 'AI', 'Orbital Mechanics'],
        bio: 'Mission Lead exploring deep space navigation.',
        interests: ['Space Exploration', 'AI'],
        experience: 'Space Apps Winner 2024',
        preferredChallenge: 'Deep Space Communications',
        teamStatus: 'want_to_create_team',
        desiredRole: 'AI & Flight Dynamics Lead',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(user1Email);
    expect(data.user.profile).toBeDefined();
    expect(data.user.profile.institution).toBe('Cairo University');
    expect(data.tokens.accessToken).toBeDefined();

    user1Id = data.user.id;
    user1Token = data.tokens.accessToken;
  });

  it('1.2. Registers User 2 with complementary skills', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Liara Tsoni',
        email: user2Email,
        password: 'Password123!',
        phone: '+201033334444',
        institution: 'AUC',
        academicLevel: 'Junior',
        skills: ['React', 'TypeScript', 'UI/UX'],
        bio: 'Frontend and UI designer for mission control consoles.',
        interests: ['Space Exploration', 'Data Visualization'],
        preferredChallenge: 'Deep Space Communications',
        teamStatus: 'want_to_join_team',
        desiredRole: 'Frontend Developer',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.user.id).toBeDefined();
    expect(data.user.email).toBe(user2Email);
    expect(data.user.profile.desiredRole).toBe('Frontend Developer');

    user2Id = data.user.id;
    user2Token = data.tokens.accessToken;
  });

  // -----------------------------------------------------------------
  // 2. Authentication & Login
  // -----------------------------------------------------------------
  it('2.1. Logs in User 1 and retrieves fresh access token', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user1Email,
        password: 'Password123!',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tokens.accessToken).toBeDefined();
    user1Token = data.tokens.accessToken;
  });

  // -----------------------------------------------------------------
  // 3. Profile Management, Search & Recommendations
  // -----------------------------------------------------------------
  it('3.1. User 1 retrieves their profile via GET /profiles/me', async () => {
    const res = await fetch(`${API_BASE}/profiles/me`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    expect(res.status).toBe(200);
    const profile = await res.json();
    expect(profile.userId).toBe(user1Id);
    expect(profile.institution).toBe('Cairo University');
    expect(profile.user.email).toBe(user1Email);
  });

  it('3.2. User 1 updates their profile via PUT /profiles/me', async () => {
    const res = await fetch(`${API_BASE}/profiles/me`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        skills: ['Python', 'AI', 'Orbital Mechanics', 'PyTorch', 'FastAPI'],
        bio: 'Updated bio: Ready to lead space exploration teams.',
      }),
    });

    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.skills).toHaveLength(5);
    expect(updated.bio).toContain('Updated bio');
  });

  it('3.3. User 1 gets teammate recommendations (Section 3.2 matching)', async () => {
    const res = await fetch(`${API_BASE}/profiles/recommendations`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    expect(res.status).toBe(200);
    const recs = await res.json();
    expect(Array.isArray(recs)).toBe(true);

    // Should include User 2 who shares the challenge and has complementary Frontend skills
    const user2Match = recs.find((r: any) => r.profile.userId === user2Id);
    expect(user2Match).toBeDefined();
    expect(user2Match.matchScore).toBeGreaterThan(0);
    expect(user2Match.matchReasons.length).toBeGreaterThan(0);
  });

  it('3.4. Searches public profiles by skill and challenge', async () => {
    const res = await fetch(`${API_BASE}/profiles?skills=Python&preferredChallenge=Deep Space`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items.length).toBeGreaterThanOrEqual(1);
    expect(data.items.some((p: any) => p.userId === user1Id)).toBe(true);
  });

  // -----------------------------------------------------------------
  // 4. Team Management (Section 3)
  // -----------------------------------------------------------------
  it('4.1. User 1 creates team and becomes Team Leader', async () => {
    const res = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: teamName,
        description: 'Deep Space communications relay array simulation',
        challenge: 'Deep Space Communications',
        track: 'astrophysics',
        assignedRole: 'Lead Mission Commander',
      }),
    });

    expect(res.status).toBe(201);
    const team = await res.json();
    expect(team.name).toBe(teamName);
    expect(team.membersCount).toBe(1);
    expect(team.members[0].role).toBe('leader');
    createdTeamId = team.id;
  });

  it('4.2. User 1 views their team via GET /teams/me', async () => {
    const res = await fetch(`${API_BASE}/teams/me`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    expect(res.status).toBe(200);
    const myTeam = await res.json();
    expect(myTeam.id).toBe(createdTeamId);
    expect(myTeam.myRole).toBe('leader');
  });

  it('4.3. Leader invites User 2 to the team', async () => {
    const res = await fetch(`${API_BASE}/teams/${createdTeamId}/invitations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user2Id,
        assignedRole: 'Frontend Lead',
      }),
    });

    expect(res.status).toBe(201);
    const inviteData = await res.json();
    expect(inviteData.success).toBe(true);
    expect(inviteData.invitation).toBeDefined();
    invitationId = inviteData.invitation.id;
  });

  it('4.4. User 2 accepts invitation and joins the team', async () => {
    const res = await fetch(`${API_BASE}/teams/invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accept: true }),
    });

    expect(res.status).toBe(201);
    const joinRes = await res.json();
    expect(joinRes.success).toBe(true);

    // User 2 now has this team
    const teamRes = await fetch(`${API_BASE}/teams/me`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    expect(teamRes.status).toBe(200);
    const u2Team = await teamRes.json();
    expect(u2Team.id).toBe(createdTeamId);
    expect(u2Team.myRole).toBe('member');
    expect(u2Team.membersCount).toBe(2);
  });

  // -----------------------------------------------------------------
  // 5. Team Tasks / To-Do List (Section 4)
  // -----------------------------------------------------------------
  it('5.1. Leader creates a task assigned to User 2', async () => {
    const res = await fetch(`${API_BASE}/teams/${createdTeamId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user1Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Build Telemetry Dashboard UI',
        description: 'React chart components for orbital ping latency and packet loss',
        status: 'not_started',
        assignedToId: user2Id,
      }),
    });

    expect(res.status).toBe(201);
    const task = await res.json();
    expect(task.title).toBe('Build Telemetry Dashboard UI');
    expect(task.status).toBe('not_started');
    expect(task.assignedToId).toBe(user2Id);
    createdTaskId = task.id;
  });

  it('5.2. User 2 transitions task from not_started to in_progress', async () => {
    const res = await fetch(`${API_BASE}/teams/tasks/${createdTaskId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${user2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'in_progress',
      }),
    });

    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe('in_progress');
  });

  it('5.3. User 2 transitions task to completed', async () => {
    const res = await fetch(`${API_BASE}/teams/tasks/${createdTaskId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${user2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'completed',
      }),
    });

    expect(res.status).toBe(200);
    const completed = await res.json();
    expect(completed.status).toBe('completed');
  });

  it('5.4. Both members see the completed task in GET /teams/me', async () => {
    const res = await fetch(`${API_BASE}/teams/me`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    expect(res.status).toBe(200);
    const myTeam = await res.json();
    const task = myTeam.tasks.find((t: any) => t.id === createdTaskId);
    expect(task).toBeDefined();
    expect(task.status).toBe('completed');
    expect(task.assignedTo.name).toBe('Liara Tsoni');
  });

  // -----------------------------------------------------------------
  // 6. Leaving Team
  // -----------------------------------------------------------------
  it('6.1. User 2 leaves the team', async () => {
    const res = await fetch(`${API_BASE}/teams/${createdTeamId}/members/${user2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user2Token}` },
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('Delete member failed:', res.status, text);
    }
    expect(res.status).toBe(200);
    const delData = JSON.parse(text);
    expect(delData.success).toBe(true);

    // User 2 no longer has a team
    const meRes = await fetch(`${API_BASE}/teams/me`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    expect(meRes.status).toBe(200);
    const emptyTeam = await meRes.json();
    expect(emptyTeam.team).toBeNull();
  });
});
