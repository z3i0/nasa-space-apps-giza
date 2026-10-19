import { randomUUID } from 'node:crypto';
import { afterAll, describe, it, expect } from 'vitest';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { AccountService } from '../src/account/account.service.js';
import { RegisterDto } from '../src/auth/dto/register.dto.js';
import { MentorshipService } from '../src/mentorship/mentorship.service.js';

describe('Account isolation and role approval (live PostgreSQL)', () => {
  const db = new PrismaService(),
    auth = new AuthService(db),
    account = new AccountService(db),
    suffix = randomUUID();
  const users: string[] = [],
    teams: string[] = [],
    challenges: string[] = [];
  afterAll(async () => {
    await db.team.deleteMany({ where: { id: { in: teams } } });
    await db.challenge.deleteMany({ where: { id: { in: challenges } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });
  async function register(
    name: string,
    requestedRole: 'participant' | 'mentor' | 'judge' = 'participant',
  ) {
    const response = await auth.register({
      name,
      email: `${name}.${suffix}@isolation.test`,
      password: 'IsolatedAccount2026!',
      requestedRole,
    });
    users.push(response.user.id);
    return response;
  }
  it('creates a blank new participant even when a different account has skills, challenge and a full team', async () => {
    const a = await register('First'),
      b = await register('Second');
    await db.profile.update({
      where: { userId: a.user.id },
      data: {
        skills: ['Python', 'GIS'],
        bio: 'First user profile',
        preferredChallenge: 'First challenge',
      },
    });
    const team = await db.team.create({
      data: {
        name: `Private team ${suffix}`,
        createdById: a.user.id,
        challenge: 'First challenge',
        members: { create: { userId: a.user.id, role: 'leader' } },
        submission: { create: { title: 'First project', status: 'submitted' } },
      },
    });
    teams.push(team.id);
    const first = await account.overview(a.user.id),
      second = await account.overview(b.user.id);
    expect(first.team?.members[0].id).toBe(a.user.id);
    expect(first.skills).toEqual(['Python', 'GIS']);
    expect(second).toMatchObject({
      skills: [],
      challenge: null,
      team: null,
      mentorshipCount: 0,
      submitted: false,
      profileComplete: false,
      applications: [],
    });
    expect(JSON.stringify(second)).not.toContain(a.user.id);
    expect(JSON.stringify(second)).not.toContain('First challenge');
    expect(b.user.roles).toEqual(['participant']);
    expect(b.user.profile?.skills).toEqual([]);
  });
  it('mentor/judge selection grants nothing until review, and decisions persist atomically', async () => {
    const mentor = await register('MentorApplicant', 'mentor'),
      judge = await register('JudgeApplicant');
    expect(mentor.user.roles).toEqual(['participant']);
    let selection = await account.selectRole(mentor.user.id, 'mentor');
    expect(selection).toMatchObject({
      role: 'mentor',
      status: 'pending',
      roles: ['participant'],
    });
    await account.selectRole(mentor.user.id, 'mentor');
    expect(
      await db.roleApplication.count({ where: { userId: mentor.user.id } }),
    ).toBe(1);
    await expect(
      account.selectRole(mentor.user.id, 'organizer'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const application = await db.roleApplication.findUniqueOrThrow({
      where: { userId_role: { userId: mentor.user.id, role: 'mentor' } },
    });
    await account.review(
      application.id,
      users[0],
      'approved',
      'Expertise verified',
    );
    selection = await account.selectRole(mentor.user.id, 'mentor');
    expect(selection.role).toBe('mentor');
    expect(selection.roles).toContain('mentor');
    const mentorship = new MentorshipService(db);
    const request = await db.mentorshipRequest.create({
      data: {
        teamId: teams[0],
        mentorId: mentor.user.id,
        topic: 'Review my project',
        status: 'accepted',
      },
    });
    await mentorship.send(request.id, mentor.user.id, 'Here are my notes.');
    await expect(
      account.review(application.id, users[0], 'rejected', '', 'pending'),
    ).rejects.toBeInstanceOf(ConflictException);
    await account.review(
      application.id,
      users[0],
      'rejected',
      'Review changed',
      'approved',
    );
    expect(await account.access(mentor.user.id, 'mentor')).toMatchObject({
      status: 'rejected',
      roles: ['participant'],
    });
    await expect(
      mentorship.messages(request.id, mentor.user.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(await mentorship.requests(mentor.user.id)).toEqual([]);
    await account.review(
      application.id,
      users[0],
      'approved',
      'Accepted after review',
      'rejected',
    );
    expect((await account.access(mentor.user.id, 'mentor')).status).toBe(
      'approved',
    );
    expect(await mentorship.messages(request.id, mentor.user.id)).toHaveLength(
      1,
    );
    await account.selectRole(judge.user.id, 'judge');
    const judgeRequest = await db.roleApplication.findUniqueOrThrow({
      where: { userId_role: { userId: judge.user.id, role: 'judge' } },
    });
    await account.review(
      judgeRequest.id,
      users[0],
      'rejected',
      'Please contact the organizer',
    );
    expect(await account.selectRole(judge.user.id, 'judge')).toMatchObject({
      role: 'judge',
      status: 'rejected',
      roles: ['participant'],
    });
    expect((await account.overview(judge.user.id)).applications[0].reason).toBe(
      'Please contact the organizer',
    );
  });
  it('does not allow public organizer registration', async () => {
    const errors = await validate(
      plainToInstance(RegisterDto, {
        name: 'Applicant',
        email: 'applicant@example.test',
        password: 'StrongPassword2026!',
        requestedRole: 'organizer',
      }),
    );
    expect(errors.some((e) => e.property === 'requestedRole')).toBe(true);
  });
  it('dropdown choices contain published challenges and exclude drafts/archived challenges', async () => {
    const owner = await register('ChallengeOwner');
    for (const [index, state] of [
      { isPublished: true, isArchived: false },
      { isPublished: false, isArchived: false },
      { isPublished: true, isArchived: true },
    ].entries()) {
      const c = await db.challenge.create({
        data: {
          slug: `approval-choice-${index}-${suffix}`,
          title: `Choice ${index} ${suffix}`,
          summary: 'Climate research challenge',
          description:
            'Analyze satellite measurements and explain observed changes.',
          category: 'Science',
          difficulty: 'beginner',
          year: 2026,
          createdById: owner.user.id,
          ...state,
        },
      });
      challenges.push(c.id);
    }
    const choices = await account.challengeOptions();
    expect(choices.some((c) => c.id === challenges[0])).toBe(true);
    expect(
      choices.some((c) => c.id === challenges[1] || c.id === challenges[2]),
    ).toBe(false);
  });
});
