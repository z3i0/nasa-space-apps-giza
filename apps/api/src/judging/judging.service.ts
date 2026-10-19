import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignmentDto, EvaluationDto, RubricDto } from './dto.js';

export type Criterion = { name: string; weight: number };
export function weightedScore(
  criteria: Criterion[],
  scores: Record<string, number>,
) {
  return criteria.reduce(
    (sum, criterion, i) =>
      sum + ((scores[String(i)] || 0) * criterion.weight) / 10,
    0,
  );
}

@Injectable()
export class JudgingService {
  constructor(private readonly db: PrismaService) {}

  // All judging mutations use the same transaction lock. Publishing and evaluation
  // saves cannot race, and a publication freezes the complete scoring round.
  private async write<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(734921)`;
      return work(tx);
    });
  }
  private async editable(tx: Prisma.TransactionClient) {
    if (await tx.judgingPublication.findUnique({ where: { id: 'current' } }))
      throw new ConflictException(
        'Unpublish results before changing this judging round.',
      );
  }
  async manage() {
    const [rubrics, judges, teams, assignments, publication] =
      await Promise.all([
        this.db.judgingRubric.findMany({ orderBy: { createdAt: 'desc' } }),
        this.db.user.findMany({
          where: {
            isActive: true,
            deletedAt: null,
            OR: [
              { role: 'judge' },
              { roles: { some: { role: { name: 'judge' } } } },
            ],
          },
          select: { id: true, name: true },
        }),
        this.db.team.findMany({
          where: { submission: { status: 'submitted' } },
          select: {
            id: true,
            name: true,
            submission: { select: { title: true, version: true } },
          },
          orderBy: { name: 'asc' },
        }),
        this.db.judgingAssignment.findMany({
          include: {
            judge: { select: { name: true } },
            team: { select: { name: true } },
            rubric: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.results(),
      ]);
    return {
      rubrics,
      judges,
      teams,
      assignments,
      publication,
      rankings: this.rank(assignments),
    };
  }
  async createRubric(dto: RubricDto) {
    if (
      dto.criteria.reduce((sum, c) => sum + c.weight, 0) !== 100 ||
      new Set(dto.criteria.map((c) => c.name.trim().toLowerCase())).size !==
        dto.criteria.length ||
      dto.criteria.some((c) => !c.name.trim()) ||
      !dto.name.trim()
    )
      throw new BadRequestException(
        'Unique criteria must have weights totaling 100.',
      );
    // Rubrics are immutable versions, including after scoring starts.
    return this.write(async (tx) => {
      await this.editable(tx);
      return tx.judgingRubric.create({
        data: {
          name: dto.name.trim(),
          criteria: dto.criteria.map((c) => ({
            name: c.name.trim(),
            weight: c.weight,
          })),
        },
      });
    });
  }
  assign(dto: AssignmentDto) {
    return this.write(async (tx) => {
      await this.editable(tx);
      const [judge, team, rubric] = await Promise.all([
        tx.user.findFirst({
          where: {
            id: dto.judgeId,
            isActive: true,
            deletedAt: null,
            OR: [
              { role: 'judge' },
              { roles: { some: { role: { name: 'judge' } } } },
            ],
          },
        }),
        tx.team.findUnique({
          where: { id: dto.teamId },
          include: { submission: true, members: { select: { userId: true } } },
        }),
        tx.judgingRubric.findUnique({ where: { id: dto.rubricId } }),
      ]);
      if (
        !judge ||
        !rubric ||
        !team?.submission ||
        team.submission.status !== 'submitted'
      )
        throw new BadRequestException(
          'Choose an active judge, rubric, and submitted project.',
        );
      if (
        team.members.some((m) => m.userId === judge.id) ||
        team.createdById === judge.id
      )
        throw new BadRequestException('Judges cannot evaluate their own team.');
      if (
        await tx.judgingAssignment.findUnique({
          where: { judgeId_teamId: { judgeId: judge.id, teamId: team.id } },
        })
      )
        throw new ConflictException(
          'This judge is already assigned to this team.',
        );
      const s = team.submission;
      const other = await tx.judgingAssignment.findFirst({
        where: { teamId: team.id },
      });
      if (
        other &&
        (other.submissionVersion !== s.version || other.rubricId !== rubric.id)
      )
        throw new ConflictException(
          'All judges for a team must evaluate the same submission version and rubric.',
        );
      // Use the same rubric across the round to keep rankings comparable.
      if (
        await tx.judgingAssignment.findFirst({
          where: { rubricId: { not: rubric.id } },
        })
      )
        throw new ConflictException(
          'Use the existing round rubric for all assignments.',
        );
      return tx.judgingAssignment.create({
        data: {
          ...dto,
          submissionVersion: s.version,
          snapshot: {
            teamName: team.name,
            title: s.title,
            summary: s.summary,
            challenge: s.challenge,
            projectUrl: s.projectUrl,
            repositoryUrl: s.repositoryUrl,
            demoUrl: s.demoUrl,
          },
        },
      });
    });
  }
  list(judgeId: string) {
    return this.db.judgingAssignment.findMany({
      where: { judgeId },
      include: { rubric: true },
      orderBy: { createdAt: 'asc' },
    });
  }
  unassign(id: string) {
    return this.write(async (tx) => {
      await this.editable(tx);
      const assignment = await tx.judgingAssignment.findUnique({
        where: { id },
      });
      if (!assignment) throw new NotFoundException();
      if (assignment.version !== 1 || assignment.completed)
        throw new ConflictException(
          'Evaluations that have started cannot be removed.',
        );
      return tx.judgingAssignment.delete({ where: { id } });
    });
  }
  async save(id: string, judgeId: string, dto: EvaluationDto) {
    return this.write(async (tx) => {
      await this.editable(tx);
      const assignment = await tx.judgingAssignment.findFirst({
        where: { id, judgeId },
        include: { rubric: true },
      });
      if (!assignment) throw new NotFoundException();
      if (assignment.completed || assignment.version !== dto.version)
        throw new ConflictException(
          'Evaluation is finalized or has changed. Reload before continuing.',
        );
      const criteria = assignment.rubric.criteria as Criterion[];
      for (const [key, value] of Object.entries(dto.scores)) {
        if (
          !/^(0|[1-9]\d*)$/.test(key) ||
          Number(key) >= criteria.length ||
          !Number.isInteger(value) ||
          value < 1 ||
          value > 10
        )
          throw new BadRequestException(
            'Scores must be integers from 1 to 10 for rubric criteria.',
          );
      }
      if (
        dto.completed &&
        (Object.keys(dto.scores).length !== criteria.length ||
          !dto.feedback.trim())
      )
        throw new BadRequestException(
          'Score every criterion and provide feedback before finalizing.',
        );
      return tx.judgingAssignment.update({
        where: { id },
        data: {
          scores: dto.scores,
          feedback: dto.feedback.trim(),
          completed: dto.completed,
          version: { increment: 1 },
        },
        include: { rubric: true },
      });
    });
  }
  private rank(
    assignments: {
      teamId: string;
      snapshot: Prisma.JsonValue;
      completed: boolean;
      scores: Prisma.JsonValue;
      rubric: { criteria: Prisma.JsonValue };
    }[],
  ) {
    const grouped = new Map<
      string,
      {
        teamId: string;
        teamName: string;
        total: number;
        evaluations: number;
        assigned: number;
      }
    >();
    for (const a of assignments) {
      const row = grouped.get(a.teamId) || {
        teamId: a.teamId,
        teamName: String((a.snapshot as Record<string, unknown>).teamName),
        total: 0,
        evaluations: 0,
        assigned: 0,
      };
      row.assigned++;
      if (a.completed) {
        row.total += weightedScore(
          a.rubric.criteria as Criterion[],
          a.scores as Record<string, number>,
        );
        row.evaluations++;
      }
      grouped.set(a.teamId, row);
    }
    const rows = [...grouped.values()]
      .filter((r) => r.evaluations > 0)
      .map((r) => ({
        teamId: r.teamId,
        teamName: r.teamName,
        score: Math.round((r.total / r.evaluations) * 100) / 100,
        evaluations: r.evaluations,
        assigned: r.assigned,
      }))
      .sort(
        (a, b) => b.score - a.score || a.teamName.localeCompare(b.teamName),
      );
    let rank = 0;
    return rows.map((r, i) => {
      if (i === 0 || r.score !== rows[i - 1].score) rank = i + 1;
      return { ...r, rank };
    });
  }
  results() {
    return this.db.judgingPublication.findUnique({ where: { id: 'current' } });
  }
  publish() {
    return this.write(async (tx) => {
      const deadline = process.env.SUBMISSION_DEADLINE;
      if (
        !deadline ||
        !/(Z|[+-]\d{2}:\d{2})$/.test(deadline) ||
        !Number.isFinite(Date.parse(deadline)) ||
        Date.now() < Date.parse(deadline)
      )
        throw new ConflictException(
          'Results can be published only after the configured submission deadline.',
        );
      const assignments = await tx.judgingAssignment.findMany({
        include: { rubric: true },
      });
      if (!assignments.length || assignments.some((a) => !a.completed))
        throw new ConflictException(
          'Complete every assigned evaluation before publishing.',
        );
      const unassigned = await tx.team.count({
        where: {
          submission: { status: 'submitted' },
          judgingAssignments: { none: {} },
        },
      });
      if (unassigned)
        throw new ConflictException(
          'Every submitted team needs a completed evaluation before publishing.',
        );
      return tx.judgingPublication.upsert({
        where: { id: 'current' },
        create: { id: 'current', results: this.rank(assignments) },
        update: { results: this.rank(assignments), publishedAt: new Date() },
      });
    });
  }
  unpublish() {
    return this.write((tx) =>
      tx.judgingPublication.deleteMany({ where: { id: 'current' } }),
    );
  }
}
