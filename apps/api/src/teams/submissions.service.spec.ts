import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmissionsService } from './submissions.service.js';
import { SaveSubmissionDto } from './dto/submission.dto.js';
import { CreateTaskDto, UpdateTaskDto } from './dto/team-task.dto.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('Team submissions', () => {
  let db: any;
  let service: SubmissionsService;
  const draft: SaveSubmissionDto = {
    title: 'Flood map',
    summary: 'Useful satellite data',
    challenge: 'Earth',
    projectUrl: 'https://example.org/project',
    repositoryUrl: '',
    demoUrl: '',
    status: 'draft',
    version: 0,
  };
  beforeEach(() => {
    vi.stubEnv('SUBMISSION_DEADLINE', '2099-10-25T18:00:00+02:00');
    db = {
      teamMember: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ teamId: 'team', role: 'leader' }),
      },
      teamSubmission: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi
          .fn()
          .mockImplementation(({ create }) => Promise.resolve(create)),
      },
      team: { update: vi.fn(), findUnique: vi.fn().mockResolvedValue({challengeId:null}) },
      challenge: { findFirst: vi.fn().mockResolvedValue({ id: 'official', title: 'Earth' }) },
      $transaction: vi.fn((fn) => fn(db)),
    };
    service = new SubmissionsService(db as PrismaService);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('saves drafts and mirrors their status atomically', async () => {
    const result = await service.save('team', 'leader', draft);
    expect(result.submission.version).toBe(1);
    expect(result.submission.submittedAt).toBeNull();
    expect(db.team.update).toHaveBeenCalledWith({
      where: { id: 'team' },
      data: { submissionStatus: 'draft' },
    });
  });
  it('rejects custom project challenges and mismatches with the team choice', async () => {
    db.challenge.findFirst.mockResolvedValue(null);
    await expect(service.save('team','leader',draft)).rejects.toThrow('published NASA challenge');
    expect(db.teamSubmission.upsert).not.toHaveBeenCalled();
    db.challenge.findFirst.mockResolvedValue({id:'official',title:'Earth'});
    db.team.findUnique.mockResolvedValue({challengeId:'another-official'});
    await expect(service.save('team','leader',draft)).rejects.toThrow('selected by your team');
    expect(db.teamSubmission.upsert).not.toHaveBeenCalled();
  });
  it('submits a complete project and preserves submission when editing', async () => {
    const result = await service.save('team', 'leader', {
      ...draft,
      status: 'submitted',
    });
    expect(result.submission.submittedAt).toBeInstanceOf(Date);
    db.teamSubmission.findUnique.mockResolvedValue(result.submission);
    const edited = await service.save('team', 'leader', {
      ...draft,
      version: 1,
    });
    expect(edited.submission.status).toBe('submitted');
    expect(edited.submission.submittedAt).toEqual(
      result.submission.submittedAt,
    );
  });
  it('rejects stale versions without writing', async () => {
    db.teamSubmission.findUnique.mockResolvedValue({ ...draft, version: 2 });
    await expect(service.save('team', 'leader', draft)).rejects.toMatchObject({
      response: { code: 'SUBMISSION_CONFLICT' },
    });
    expect(db.teamSubmission.upsert).not.toHaveBeenCalled();
  });
  it('blocks nonmembers from reading and members from editing', async () => {
    db.teamMember.findUnique.mockResolvedValue({
      teamId: 'other',
      role: 'leader',
    });
    await expect(service.get('team', 'outsider')).rejects.toThrow(
      'Team membership',
    );
    db.teamMember.findUnique.mockResolvedValue({
      teamId: 'team',
      role: 'member',
    });
    expect((await service.get('team', 'member')).canEdit).toBe(false);
    await expect(service.save('team', 'member', draft)).rejects.toThrow(
      'Only the leader',
    );
  });
  it('blocks all writes at and after the deadline', async () => {
    vi.stubEnv('SUBMISSION_DEADLINE', '2020-01-01T00:00:00Z');
    expect((await service.get('team', 'leader')).canEdit).toBe(false);
    await expect(service.save('team', 'leader', draft)).rejects.toMatchObject({
      response: { code: 'SUBMISSION_CLOSED' },
    });
    expect(db.teamSubmission.upsert).not.toHaveBeenCalled();
  });
  it.each(['', 'invalid', '2099-01-01T00:00:00'])(
    'allows drafts but not final submission with invalid or missing deadline: %s',
    async (value) => {
      vi.stubEnv('SUBMISSION_DEADLINE', value);
      expect((await service.save('team', 'leader', draft)).deadline).toBeNull();
      await expect(
        service.save('team', 'leader', { ...draft, status: 'submitted' }),
      ).rejects.toMatchObject({ response: { code: 'SUBMISSION_NOT_OPEN' } });
    },
  );
  it('rejects incomplete final submissions and clearing required submitted fields', async () => {
    await expect(
      service.save('team', 'leader', {
        ...draft,
        title: ' ',
        status: 'submitted',
      }),
    ).rejects.toMatchObject({ response: { code: 'SUBMISSION_INCOMPLETE' } });
    db.teamSubmission.findUnique.mockResolvedValue({
      ...draft,
      version: 1,
      status: 'submitted',
    });
    await expect(
      service.save('team', 'leader', { ...draft, version: 1, summary: '' }),
    ).rejects.toMatchObject({ response: { code: 'SUBMISSION_INCOMPLETE' } });
  });
  it('validates safe URLs, versions, and task titles', async () => {
    expect(
      await validate(plainToInstance(SaveSubmissionDto, draft)),
    ).toHaveLength(0);
    expect(
      (
        await validate(
          plainToInstance(SaveSubmissionDto, {
            ...draft,
            projectUrl: 'javascript:alert(1)',
            version: -1,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (await validate(plainToInstance(CreateTaskDto, { title: '   ' }))).length,
    ).toBeGreaterThan(0);
    expect(
      (await validate(plainToInstance(UpdateTaskDto, { title: null }))).length,
    ).toBeGreaterThan(0);
    expect(
      await validate(
        plainToInstance(UpdateTaskDto, { assignedToId: null, dueDate: null }),
      ),
    ).toHaveLength(0);
  });
});
