import { randomUUID } from 'node:crypto';
import { afterAll, describe, it, expect } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { AccountService } from '../src/account/account.service.js';

describe('Competition Analytics System (live PostgreSQL)', () => {
  const db = new PrismaService();
  const auth = new AuthService(db);
  const account = new AccountService(db);
  const suffix = randomUUID().slice(0, 8);

  const users: string[] = [];
  const teams: string[] = [];

  afterAll(async () => {
    await db.judgingAssignment.deleteMany({ where: { judgeId: { in: users } } });
    await db.mentorshipRequest.deleteMany({ where: { mentorId: { in: users } } });
    await db.communityAnswer.deleteMany({ where: { authorId: { in: users } } });
    await db.communityQuestion.deleteMany({ where: { authorId: { in: users } } });
    await db.team.deleteMany({ where: { id: { in: teams } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });

  async function register(name: string, role = 'participant') {
    const res = await auth.register({
      name,
      email: `${name.toLowerCase()}.${suffix}@analyticstest.io`,
      password: 'Password123!',
      requestedRole: role,
    });
    users.push(res.user.id);
    return res.user;
  }

  it('generates competition analytics containing all 5 metric sections', async () => {
    const organizer = await register('OrgAnalytics');
    await db.user.update({ where: { id: organizer.id }, data: { role: 'organizer' } });
    const judge = await register('JudgeAnalytics', 'judge');
    const mentor = await register('MentorAnalytics', 'mentor');
    const participant = await register('PartAnalytics', 'participant');

    // Create session to verify active users
    await db.session.create({
      data: {
        userId: organizer.id,
        token: `session-${suffix}-1`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Create a team with challenge
    const challenge = await db.challenge.findFirst();
    const team = await db.team.create({
      data: {
        name: `Analytics Team ${suffix}`,
        createdById: participant.id,
        challengeId: challenge?.id,
        challenge: challenge?.slug,
      },
    });
    teams.push(team.id);

    // Call competitionAnalytics
    const analytics = await account.competitionAnalytics();

    // 1. Verify Active Users
    expect(analytics.activeUsers).toBeDefined();
    expect(analytics.activeUsers.currentCount).toBeGreaterThanOrEqual(1);
    expect(analytics.activeUsers.breakdownByRole).toBeDefined();
    expect(Array.isArray(analytics.activeUsers.hourlyTrend)).toBe(true);

    // 2. Verify Challenge Distribution
    expect(analytics.challenges).toBeDefined();
    expect(Array.isArray(analytics.challenges.distribution)).toBe(true);
    expect(analytics.challenges.totalTeams).toBeGreaterThanOrEqual(1);

    // 3. Verify Community Analytics
    expect(analytics.community).toBeDefined();
    expect(typeof analytics.community.totalQuestions).toBe('number');
    expect(typeof analytics.community.answeredCount).toBe('number');
    expect(typeof analytics.community.unansweredCount).toBe('number');
    expect(Array.isArray(analytics.community.categoryBreakdown)).toBe(true);

    // 4. Verify Mentors Analytics
    expect(analytics.mentors).toBeDefined();
    expect(typeof analytics.mentors.totalRequests).toBe('number');
    expect(typeof analytics.mentors.acceptanceRate).toBe('number');
    expect(typeof analytics.mentors.rejectionRate).toBe('number');
    expect(Array.isArray(analytics.mentors.topMentors)).toBe(true);

    // 5. Verify Judges Performance
    expect(analytics.judges).toBeDefined();
    expect(typeof analytics.judges.totalAssignments).toBe('number');
    expect(typeof analytics.judges.completionRate).toBe('number');
    expect(Array.isArray(analytics.judges.judgePerformance)).toBe(true);
  });
});
