import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { auth } from '../src/auth/auth.js';
import { MentorshipService } from '../src/mentorship/mentorship.service.js';

describe('Registration and private mentorship (live PostgreSQL)', () => {
  const db = new PrismaService();
  const users: string[] = [];
  const suffix = randomUUID();
  let teamId: string | undefined;

  afterAll(async () => {
    if (teamId) await db.team.deleteMany({ where: { id: teamId } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });

  it('creates a usable account, saves notes, and shares chat with exactly the assigned mentor and team', async () => {
    const accounts = new AuthService(db);
    const mentorship = new MentorshipService(db);
    const email = `new.${suffix}@mentorship.test`;
    const password = 'IntegrationPassword123!';
    const participant = await accounts.register({
      name: 'New Participant',
      email,
      password,
      phone: '+201000000001',
    });
    users.push(participant.user.id);
    const created = await db.user.findUniqueOrThrow({
      where: { id: participant.user.id },
      include: {
        accounts: true,
        profile: true,
        roles: { include: { role: true } },
      },
    });
    expect(created.accounts[0].providerId).toBe('credential');
    expect(created.profile).not.toBeNull();
    expect(created.roles.map((item) => item.role.name)).toEqual([
      'participant',
    ]);

    const signedIn = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
      headers: new Headers({ origin: 'http://localhost:3000' }),
    });
    expect(signedIn.status).toBe(200);
    expect(signedIn.headers.get('set-cookie')).toContain(
      'better-auth.session_token',
    );
    const signInBody = await signedIn.json();
    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${signInBody.token}` }),
    });
    expect(session?.user.id).toBe(participant.user.id);

    const extra = await Promise.all(
      ['teammate', 'outsider', 'mentor', 'other-mentor'].map((role) =>
        db.user.create({
          data: {
            name: role,
            email: `${role}.${suffix}@mentorship.test`,
            role: role.includes('mentor') ? 'mentor' : 'participant',
          },
        }),
      ),
    );
    users.push(...extra.map((user) => user.id));
    const [teammate, outsider, mentor, otherMentor] = extra;
    const team = await db.team.create({
      data: {
        name: `Mentorship ${suffix}`,
        createdById: participant.user.id,
        members: {
          create: [
            { userId: participant.user.id, role: 'leader' },
            { userId: teammate.id },
          ],
        },
      },
    });
    teamId = team.id;
    const request = await mentorship.createRequest(
      participant.user.id,
      mentor.id,
      'Help us interpret satellite imagery',
    );
    await mentorship.decide(request.id, mentor.id, 'accepted');
    await mentorship.saveNotes(
      request.id,
      mentor.id,
      '  Review the Earth observation dataset.  ',
    );
    expect(
      (
        await db.mentorshipRequest.findUniqueOrThrow({
          where: { id: request.id },
        })
      ).sessionNotes,
    ).toBe('Review the Earth observation dataset.');
    expect((await mentorship.requests(teammate.id))[0].sessionNotes).toBe(
      'Review the Earth observation dataset.',
    );
    for (const userId of [participant.user.id, teammate.id, mentor.id]) {
      await mentorship.send(request.id, userId, `Message from ${userId}`);
      expect(
        (await mentorship.messages(request.id, userId)).length,
      ).toBeGreaterThan(0);
    }
    for (const userId of [outsider.id, otherMentor.id]) {
      expect(await mentorship.requests(userId)).toEqual([]);
      await expect(
        mentorship.messages(request.id, userId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        mentorship.send(request.id, userId, 'Unauthorized message'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        mentorship.saveNotes(request.id, userId, 'Unauthorized notes'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    await db.mentorshipMessage.createMany({
      data: Array.from({ length: 55 }, (_, index) => ({
        requestId: request.id,
        senderId: teammate.id,
        content: `History ${index}`,
      })),
    });
    const latest = await mentorship.messages(request.id, mentor.id);
    const older = await mentorship.messages(
      request.id,
      mentor.id,
      latest.at(-1)!.id,
    );
    expect(latest).toHaveLength(50);
    expect(
      new Set([...latest, ...older].map((message) => message.id)).size,
    ).toBe(59);
    await db.teamMember.delete({ where: { userId: teammate.id } });
    await expect(
      mentorship.messages(request.id, teammate.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  }, 30000);
});
