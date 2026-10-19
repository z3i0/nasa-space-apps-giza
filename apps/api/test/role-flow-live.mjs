// Run with the local API: node --env-file=.env test/role-flow-live.mjs
// Uses uniquely named disposable fixtures and cleans up its own records only.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient(),
  base = process.env.ROLE_TEST_API || 'http://localhost:4000/api',
  suffix = randomUUID();
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error(
    'Run role-flow tests only against local development services.',
  );
const userIds = [],
  challengeIds = [],
  rubricIds = [],
  teamIds = [];
let assertions = 0;
function check(condition, label) {
  assert.ok(condition, label);
  assertions++;
  console.log('PASS', label);
}
async function call(path, actor, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(actor?.cookie
        ? { Cookie: actor.cookie }
        : actor?.token
          ? { Authorization: `Bearer ${actor.token}` }
          : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data, response };
}
async function register(name, requestedRole = 'participant') {
  const email = `${name}.${suffix}@role-flow.test`,
    password = 'RoleFlowPassword2026!';
  const result = await call('/auth/register', null, 'POST', {
    name,
    email,
    password,
    phone: '+201000000001',
    requestedRole,
  });
  check(result.status === 201, `${name} account created`);
  userIds.push(result.data.user.id);
  return {
    id: result.data.user.id,
    email,
    password,
    token: result.data.tokens.accessToken,
  };
}
async function approve(
  actor,
  organizer,
  role,
  decision = 'approved',
  expectedStatus = 'pending',
) {
  const application = await db.roleApplication.findUniqueOrThrow({
    where: { userId_role: { userId: actor.id, role } },
  });
  const result = await call(
    `/account/role-applications/${application.id}/review`,
    organizer,
    'POST',
    { decision, expectedStatus },
  );
  check(result.status === 201, `${role} request ${decision}`);
}
try {
  const deadline = process.env.SUBMISSION_DEADLINE;
  assert.ok(
    deadline && Date.parse(deadline) > Date.now(),
    'Run with the actual future local event deadline configured.',
  );
  const organizerToken = randomUUID(),
    organizerUser = await db.user.create({
      data: {
        name: 'Role flow organizer',
        email: `organizer.${suffix}@role-flow.test`,
        role: 'organizer',
        sessions: {
          create: {
            token: organizerToken,
            expiresAt: new Date(Date.now() + 3600000),
          },
        },
      },
    });
  userIds.push(organizerUser.id);
  const organizer = { id: organizerUser.id, token: organizerToken };
  const leader = await register('Leader'),
    member = await register('Member'),
    outsider = await register('Outsider'),
    mentor = await register('Mentor', 'mentor'),
    judge = await register('Judge', 'judge'),
    otherJudge = await register('OtherJudge', 'judge');
  let r = await call('/account/overview', member);
  check(
    r.status === 200 &&
      r.data.team === null &&
      r.data.challenge === null &&
      r.data.skills.length === 0,
    'New account starts blank',
  );
  const login = await fetch(base + '/auth/sign-in/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ email: leader.email, password: leader.password }),
  });
  check(login.ok, 'Native cookie sign-in works');
  leader.cookie = login.headers
    .getSetCookie()
    .map((v) => v.split(';')[0])
    .join('; ');
  r = await call('/auth/me', leader);
  check(r.data.id === leader.id, 'Browser cookie resolves the correct account');
  r = await call('/profiles/me', leader);
  const profile = r.data;
  r = await call('/profiles/me', leader, 'PATCH', {
    name: 'Leader',
    skills: ['Python', 'GIS'],
    bio: 'My own participant profile.',
    expectedUpdatedAt: profile.updatedAt,
  });
  check(
    r.status === 200 && r.data.skills.includes('GIS'),
    'Participant profile saves',
  );
  for (let n = 0; n < 2; n++) {
    r = await call('/challenges/manage', organizer, 'POST', {
      title: `Flow challenge ${n} ${suffix}`,
      summary: 'Explore an environmental signal.',
      description:
        'Use satellite measurements to explain an environmental signal to local communities.',
      category: 'Science',
      difficulty: 'beginner',
      year: 2026,
      tags: ['Maps'],
      isPublished: true,
      isArchived: false,
      resources: [],
    });
    check(r.status === 201, `Organizer creates published challenge ${n}`);
    challengeIds.push(r.data.id);
  }
  const challenge = await db.challenge.findUniqueOrThrow({
    where: { id: challengeIds[0] },
  });
  r = await call('/teams', leader, 'POST', {
    name: `Flow ${suffix}`,
    challenge: challenge.title,
  });
  check(
    r.status === 201 && r.data.challengeId === challenge.id,
    'Team creation links the published dropdown choice',
  );
  const teamId = r.data.id;
  teamIds.push(teamId);
  r = await call(`/teams/${teamId}/invitations`, leader, 'POST', {
    email: member.email,
  });
  check(r.status === 201, 'Leader invites a member');
  const invitation = r.data.invitation;
  r = await call(
    `/teams/invitations/${invitation.id}/respond`,
    member,
    'POST',
    { accept: true },
  );
  check(r.status === 201, 'Member accepts invitation');
  r = await call('/teams/me', member);
  check(
    r.status === 200 &&
      r.data.members.length === 2 &&
      r.data.myRole === 'member',
    'Current member sees the team roster',
  );
  r = await call('/teams/me', outsider);
  check(r.data.team === null, 'An unrelated account has no inherited team');
  const outsiderUsername = `outsider_${suffix.replaceAll('-', '')}`;
  await db.user.update({ where: { id: outsider.id }, data: { username: outsiderUsername } });
  r = await call(`/teams/${teamId}/invitations`, leader, 'POST', { username: outsiderUsername });
  check(r.status === 201, 'Leader invites by username through the merged team API');
  const usernameInvitation = r.data.invitation.id;
  r = await call('/teams/invitations/me', outsider);
  check(r.status === 200 && r.data.invitations.some(item => item.id === usernameInvitation), 'Participant sees their received username invitation');
  r = await call('/teams/invitations/me', member);
  check(r.status === 200 && !r.data.invitations.some(item => item.id === usernameInvitation), 'Invitation inbox is isolated to its recipient');
  r = await call(`/teams/invitations/${usernameInvitation}/respond`, outsider, 'POST', { accept: false });
  check(r.status === 201, 'Recipient can decline a username invitation');
  r = await call(`/teams/${teamId}/tasks`, leader, 'POST', {
    title: 'Analyze observations',
    assignedToId: member.id,
  });
  check(r.status === 201, 'Leader assigns task');
  const taskId = r.data.id;
  r = await call(`/teams/tasks/${taskId}`, member, 'PATCH', {
    status: 'completed',
  });
  check(
    r.status === 200 && r.data.status === 'completed',
    'Assigned member completes task',
  );
  r = await call(`/teams/tasks/${taskId}`, outsider, 'PATCH', {
    status: 'in_progress',
  });
  check(r.status === 403, 'Outsider cannot modify team tasks');
  r = await call('/account/role-selection', mentor, 'POST', { role: 'mentor' });
  check(
    r.data.role === 'mentor' &&
      r.data.status === 'pending' &&
      !r.data.roles.includes('mentor'),
    'Mentor gets pending destination without role privileges',
  );
  r = await call('/mentorship/profile', mentor, 'PUT', {
    expertise: ['Science'],
    bio: 'Mentor profile',
    availability: 'Weekends',
  });
  check(r.status === 403, 'Pending mentor cannot use protected mentor APIs');
  await approve(mentor, organizer, 'mentor');
  r = await call('/mentorship/profile', mentor, 'PUT', {
    expertise: ['Science'],
    bio: 'Mentor profile',
    availability: 'Weekends',
  });
  check(r.status === 200, 'Approved mentor saves profile');
  r = await call('/mentorship/requests', leader, 'POST', {
    mentorId: mentor.id,
    message: 'Please review our environmental data approach.',
  });
  check(r.status === 201, 'Team requests mentor');
  const requestId = r.data.id;
  r = await call(`/mentorship/requests/${requestId}`, mentor, 'PATCH', {
    status: 'accepted',
  });
  check(r.status === 200, 'Mentor accepts team request');
  for (const actor of [leader, member, mentor]) {
    r = await call(
      `/mentorship/requests/${requestId}/messages`,
      actor,
      'POST',
      { content: 'Shared team conversation' },
    );
    check(r.status === 201, 'Assigned mentor/current team member sends chat');
  }
  r = await call(`/mentorship/requests/${requestId}/messages`, member);
  check(
    r.status === 200 &&
      r.data.length === 4 &&
      r.data.filter((m) => m.content === 'Shared team conversation').length ===
        3,
    'All current team members see the shared chat',
  );
  r = await call(`/mentorship/requests/${requestId}/messages`, outsider);
  check(r.status === 403, 'Unrelated participant cannot read chat');
  r = await call(`/mentorship/requests/${requestId}/notes`, member, 'PUT', {
    content: 'Tampered notes',
  });
  check(r.status === 403, 'Participants cannot overwrite mentor notes');
  r = await call(`/mentorship/requests/${requestId}/notes`, mentor, 'PUT', {
    content: 'Use consistent units in the analysis.',
  });
  check(r.status === 200, 'Mentor saves persistent notes');
  r = await call('/mentorship/requests', member);
  check(
    r.data.find((q) => q.id === requestId)?.sessionNotes ===
      'Use consistent units in the analysis.',
    'Team reload sees saved notes',
  );
  await approve(mentor, organizer, 'mentor', 'rejected', 'approved');
  r = await call(`/mentorship/requests/${requestId}/messages`, mentor);
  check(r.status === 403, 'Denied mentor immediately loses chat access');
  await approve(mentor, organizer, 'mentor', 'approved', 'rejected');
  r = await call(`/mentorship/requests/${requestId}/messages`, mentor);
  check(r.status === 200, 'Reaccepted mentor regains assigned chat');
  const project = {
    title: 'Environmental signals',
    summary: 'We explain satellite observations to our community.',
    challenge: challenge.title,
    projectUrl: 'https://example.com/project',
    repositoryUrl: '',
    demoUrl: '',
    status: 'draft',
    version: 0,
  };
  r = await call(`/teams/${teamId}/submission`, leader, 'PUT', project);
  check(
    r.status === 200 && r.data.submission.version === 1,
    'Leader saves project draft',
  );
  r = await call(`/challenges/${challengeIds[1]}/select`, leader, 'POST');
  check(r.status === 409, 'Catalog cannot change a saved project challenge');
  r = await call(`/teams/${teamId}`, leader, 'PUT', {
    challenge: 'Changed through team editor',
  });
  check(
    r.status === 409,
    'Team editor cannot bypass saved project challenge protection',
  );
  r = await call(`/teams/${teamId}/submission`, member, 'PUT', {
    ...project,
    status: 'submitted',
    version: 1,
  });
  check(r.status === 403, 'Member cannot submit on behalf of leader');
  r = await call(`/teams/${teamId}/submission`, leader, 'PUT', {
    ...project,
    status: 'submitted',
    version: 1,
  });
  check(
    r.status === 200 && r.data.submission.status === 'submitted',
    'Leader submits before 14 November deadline',
  );
  r = await call(`/teams/${teamId}/submission`, leader, 'PUT', {
    ...project,
    version: 1,
  });
  check(r.status === 409, 'Stale submission overwrite is rejected');
  r = await call('/judging/assignments', judge);
  check(r.status === 403, 'Pending judge has no scoring access');
  await approve(judge, organizer, 'judge');
  r = await call('/judging/results', judge);
  check(
    r.status === 200 && r.response.headers.get('content-type')?.includes('application/json') &&
      r.response.headers.get('content-length') === '4' && r.data === null,
    'Unpublished results return explicit JSON null',
  );
  await approve(otherJudge, organizer, 'judge');
  const existingRound = await db.judgingAssignment.findFirst({
    include: { rubric: true },
  });
  let rubric = existingRound?.rubric;
  if (!rubric) {
    r = await call('/judging/rubrics', organizer, 'POST', {
      name: `Flow rubric ${suffix}`,
      criteria: [
        { name: 'Science', weight: 60 },
        { name: 'Impact', weight: 40 },
      ],
    });
    check(r.status === 201, 'Organizer creates judging rubric');
    rubric = r.data;
    rubricIds.push(rubric.id);
  }
  r = await call('/judging/assignments', organizer, 'POST', {
    judgeId: judge.id,
    teamId,
    rubricId: rubric.id,
  });
  check(
    r.status === 201 && r.data.submissionVersion === 2,
    'Judge assignment preserves submitted version snapshot',
  );
  const assignmentId = r.data.id;
  r = await call('/judging/assignments', otherJudge);
  check(
    r.status === 200 && r.data.every((a) => a.id !== assignmentId),
    'Other judges cannot see this assignment',
  );
  const scores = Object.fromEntries(
    rubric.criteria.map((_, i) => [String(i), 8]),
  );
  r = await call(`/judging/assignments/${assignmentId}`, otherJudge, 'PUT', {
    scores,
    feedback: 'Unauthorized',
    completed: true,
    version: 1,
  });
  check(r.status === 404, 'Other judge cannot score the assignment');
  r = await call(`/judging/assignments/${assignmentId}`, judge, 'PUT', {
    scores,
    feedback: 'Strong evidence.',
    completed: false,
    version: 1,
  });
  check(r.status === 200, 'Judge saves evaluation draft');
  r = await call(`/judging/assignments/${assignmentId}`, judge, 'PUT', {
    scores,
    feedback: 'Strong evidence and clear method.',
    completed: true,
    version: 2,
  });
  check(r.status === 200 && r.data.completed, 'Judge finalizes own evaluation');
  r = await call('/judging/manage', organizer);
  check(
    r.status === 200 &&
      r.data.rankings.find((x) => x.teamId === teamId)?.score === 80,
    'Organizer sees weighted completed result',
  );
  r = await call('/judging/publication', organizer, 'POST');
  check(r.status === 409, 'Results cannot be published before the deadline');
  for (const endpoint of [
    '/account/organizer-summary',
    '/account/directory?kind=participants',
    '/account/role-applications',
  ]) {
    r = await call(endpoint, member);
    check(r.status === 403, 'Participant cannot access organizer data');
  }
  r = await call(
    '/account/directory?kind=participants&search=' +
      encodeURIComponent(leader.email),
    organizer,
  );
  check(
    r.status === 200 &&
      r.data.items.some((x) => x.id === leader.id) &&
      !JSON.stringify(r.data).includes('passwordHash'),
    'Organizer directory contains real records without credentials',
  );
  r = await call('/auth/logout', otherJudge, 'POST');
  check(r.status === 200, 'Logout invalidates current session');
  r = await call('/auth/me', otherJudge);
  check(r.status === 401, 'Logged out token cannot be reused');
  const resetToken = randomUUID();
  await db.passwordResetToken.create({
    data: {
      userId: outsider.id,
      tokenHash: createHash('sha256').update(resetToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  r = await call('/auth/reset-password', null, 'POST', {
    token: resetToken,
    newPassword: 'ResetRoleFlow2026!',
  });
  check(r.status === 200, 'Password reset succeeds');
  r = await call('/auth/me', outsider);
  check(r.status === 401, 'Password reset revokes previous sessions');
  r = await call('/auth/reset-password', null, 'POST', {
    token: resetToken,
    newPassword: 'ResetRoleFlow2026!',
  });
  check(r.status === 400, 'Password reset token is single use');
  console.log(`Completed ${assertions} real HTTP assertions across all roles.`);
} finally {
  await db.team.deleteMany({ where: { id: { in: teamIds } } });
  await db.judgingRubric.deleteMany({ where: { id: { in: rubricIds } } });
  await db.challenge.deleteMany({ where: { id: { in: challengeIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
}
