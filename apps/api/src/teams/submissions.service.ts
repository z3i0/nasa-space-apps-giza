import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { officialChallengeWhere } from '../challenges/official-catalogue.js';
import { SaveSubmissionDto } from './dto/submission.dto.js';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private deadline() {
    const value = process.env.SUBMISSION_DEADLINE;
    // Require an explicit timezone to avoid deployment-dependent deadlines.
    if (
      !value ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))
    )
      return null;
    return new Date(value);
  }

  private async membership(
    db: Pick<Prisma.TransactionClient, 'teamMember'>,
    teamId: string,
    userId: string,
  ) {
    const member = await db.teamMember.findUnique({ where: { userId } });
    if (member?.teamId !== teamId)
      throw new ForbiddenException('Team membership required');
    return member;
  }

  async get(teamId: string, userId: string) {
    const member = await this.membership(this.prisma, teamId, userId);
    const submission = await this.prisma.teamSubmission.findUnique({
      where: { teamId },
    });
    const deadline = this.deadline();
    return {
      submission,
      deadline,
      canEdit:
        member.role === 'leader' &&
        (!deadline || Date.now() < deadline.getTime()),
    };
  }

  async save(teamId: string, userId: string, dto: SaveSubmissionDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const member = await this.membership(tx, teamId, userId);
          if (member.role !== 'leader')
            throw new ForbiddenException(
              'Only the leader can save submissions',
            );
          const deadline = this.deadline();
          if (deadline && Date.now() >= deadline.getTime()) {
            throw new ForbiddenException({
              code: 'SUBMISSION_CLOSED',
              message: 'The submission deadline has passed',
            });
          }
          if (dto.status === 'submitted') {
            if (!deadline)
              throw new BadRequestException({
                code: 'SUBMISSION_NOT_OPEN',
                message: 'Submission deadline is not configured',
              });
            if (
              !dto.title.trim() ||
              !dto.summary.trim() ||
              !dto.challenge.trim() ||
              !dto.projectUrl
            ) {
              throw new BadRequestException({
                code: 'SUBMISSION_INCOMPLETE',
                message:
                  'Title, summary, challenge and project URL are required',
              });
            }
          }
          const current = await tx.teamSubmission.findUnique({
            where: { teamId },
          });
          if (dto.challenge.trim()) {
            const challenge = await tx.challenge.findFirst({ where: { ...officialChallengeWhere, title: dto.challenge.trim() }, select: { id: true, title: true } });
            if (!challenge) throw new BadRequestException('Choose a published NASA challenge from the catalogue.');
            const team = await tx.team.findUnique({ where: { id: teamId }, select: { challengeId: true } });
            if (team?.challengeId && team.challengeId !== challenge.id)
              throw new BadRequestException('The project must use the NASA challenge selected by your team.');
            await tx.team.update({ where: { id: teamId }, data: { challengeId: challenge.id, challenge: challenge.title } });
          }
          if ((current?.version ?? 0) !== dto.version)
            throw new ConflictException({
              code: 'SUBMISSION_CONFLICT',
              message: 'Submission changed; reload before saving',
            });
          const { version, ...fields } = dto;
          // Saving edits to a submitted project keeps it submitted.
          const status =
            current?.status === 'submitted' ? 'submitted' : fields.status;
          if (
            status === 'submitted' &&
            (!fields.title.trim() ||
              !fields.summary.trim() ||
              !fields.challenge.trim() ||
              !fields.projectUrl)
          ) {
            throw new BadRequestException({
              code: 'SUBMISSION_INCOMPLETE',
              message: 'Submitted projects must remain complete',
            });
          }
          const data = {
            ...fields,
            status,
            version: version + 1,
            submittedAt:
              current?.submittedAt ??
              (status === 'submitted' ? new Date() : null),
          };
          const submission = await tx.teamSubmission.upsert({
            where: { teamId },
            create: { teamId, ...data },
            update: data,
          });
          await tx.team.update({
            where: { id: teamId },
            data: { submissionStatus: status },
          });
          return { submission, deadline, canEdit: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      ) {
        throw new ConflictException({
          code: 'SUBMISSION_CONFLICT',
          message: 'Submission changed; reload before saving',
        });
      }
      throw error;
    }
  }
}
