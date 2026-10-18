// Run after building: node --env-file=.env test/team-work-smoke.mjs
// Creates and removes only its own uniquely named local fixtures.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { TeamsService } from '../dist/teams/teams.service.js';
import { SubmissionsService } from '../dist/teams/submissions.service.js';

const db = new PrismaClient();
const teams = new TeamsService(db);
const submissions = new SubmissionsService(db);
const id = randomUUID();
const leaderId = `work-smoke-leader-${id}`;
const memberId = `work-smoke-member-${id}`;
const teamId = `work-smoke-team-${id}`;
const previousDeadline = process.env.SUBMISSION_DEADLINE;
try {
  await db.user.createMany({
    data: [leaderId, memberId].map((userId) => ({
      id: userId,
      email: `${userId}@example.invalid`,
      name: 'Work smoke fixture',
      phone: '+201000000001',
    })),
  });
  await db.team.create({
    data: {
      id: teamId,
      name: teamId,
      createdById: leaderId,
      members: {
        create: [
          { userId: leaderId, role: 'leader' },
          { userId: memberId, role: 'member' },
        ],
      },
    },
  });
  const task = await teams.createTask(teamId, leaderId, {
    title: 'Plan prototype',
    assignedToId: memberId,
    dueDate: '2099-01-01T23:59:59Z',
  });
  assert.equal(task.assignedTo.name, 'Work smoke fixture');
  assert.equal('email' in task.assignedTo, false);
  await teams.updateTask(task.id, memberId, {
    status: 'completed',
    assignedToId: null,
    dueDate: null,
  });
  const storedTask = await db.teamTask.findUniqueOrThrow({
    where: { id: task.id },
  });
  assert.equal(storedTask.status, 'completed');
  assert.equal(storedTask.dueDate, null);
  await assert.rejects(
    teams.deleteTask(task.id, memberId),
    /Only the team leader/,
  );
  process.env.SUBMISSION_DEADLINE = '2099-10-25T18:00:00Z';
  const draft = {
    title: 'Flood signals',
    summary: 'Satellite-powered flood maps',
    challenge: 'Earth',
    projectUrl: 'https://example.org/project',
    repositoryUrl: '',
    demoUrl: '',
    version: 0,
    status: 'draft',
  };
  await submissions.save(teamId, leaderId, draft);
  assert.equal(
    (await submissions.get(teamId, memberId)).submission.title,
    draft.title,
  );
  await assert.rejects(
    submissions.save(teamId, memberId, { ...draft, version: 1 }),
    /Only the leader/,
  );
  const outcomes = await Promise.allSettled([
    submissions.save(teamId, leaderId, {
      ...draft,
      version: 1,
      status: 'submitted',
    }),
    submissions.save(teamId, leaderId, {
      ...draft,
      version: 1,
      status: 'submitted',
    }),
  ]);
  assert.equal(
    outcomes.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.equal(
    outcomes
      .filter((result) => result.status === 'rejected')[0]
      .reason.getStatus(),
    409,
  );
  assert.equal(
    (await db.team.findUniqueOrThrow({ where: { id: teamId } }))
      .submissionStatus,
    'submitted',
  );
  process.env.SUBMISSION_DEADLINE = '2020-01-01T00:00:00Z';
  await assert.rejects(
    submissions.save(teamId, leaderId, { ...draft, version: 2 }),
    /deadline/,
  );
  await teams.deleteTask(task.id, leaderId);
  console.log(
    'Live database smoke passed: task persistence, permissions, submission persistence, concurrent saves, deadline enforcement.',
  );
} finally {
  if (previousDeadline === undefined) delete process.env.SUBMISSION_DEADLINE;
  else process.env.SUBMISSION_DEADLINE = previousDeadline;
  await db.team.deleteMany({ where: { id: teamId } });
  await db.user.deleteMany({ where: { id: { in: [leaderId, memberId] } } });
  await db.$disconnect();
}
