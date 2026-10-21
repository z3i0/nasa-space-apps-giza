import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MentorshipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MentorProfileDto } from './dto.js';

const publicMentor = {
  id: true,
  name: true,
  avatar: true,
  mentorProfile: true,
  profile: { select: { bio: true, skills: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class MentorshipService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMentor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
        deletedAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    if (
      !user?.isActive ||
      user.deletedAt ||
      (user.role !== 'mentor' &&
        !user.roles.some(({ role }) => role.name === 'mentor'))
    )
      throw new ForbiddenException('Active mentor role required');
  }

  async mentors() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { role: 'mentor' },
          { roles: { some: { role: { name: 'mentor' } } } },
        ],
      },
      select: {
        ...publicMentor,
        mentorSlots: {
          where: { teamId: null, startTime: { gt: new Date() } },
          orderBy: { startTime: 'asc' },
          take: 10,
          select: { id: true, startTime: true, endTime: true },
        },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  async profile(userId: string, dto: MentorProfileDto) {
    await this.requireMentor(userId);
    return this.prisma.mentorProfile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  async createRequest(userId: string, mentorId: string, message: string) {
    if (message.trim().length < 10)
      throw new BadRequestException('Request message is too short');
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId },
      select: { teamId: true },
    });
    if (!membership)
      throw new BadRequestException('Join or create a team first');
    await this.requireMentor(mentorId);
    if (mentorId === userId)
      throw new BadRequestException('Cannot request yourself');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${membership.teamId + ':' + mentorId}))`;
      const duplicate = await tx.mentorshipRequest.findFirst({
        where: {
          teamId: membership.teamId,
          mentorId,
          status: { in: ['pending', 'accepted'] },
        },
      });
      if (duplicate)
        throw new ConflictException('An active request already exists');
      return tx.mentorshipRequest.create({
        data: {
          teamId: membership.teamId,
          mentorId,
          topic: message.trim(),
          messages: { create: { senderId: userId, content: message.trim() } },
        },
        include: {
          team: { select: { id: true, name: true } },
          mentor: { select: publicMentor },
        },
      });
    });
  }

  async requests(userId: string) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { userId },
      select: { teamId: true },
    });
    return this.prisma.mentorshipRequest.findMany({
      where: {
        OR: [
          {
            mentorId: userId,
            mentor: {
              isActive: true,
              deletedAt: null,
              OR: [
                { role: 'mentor' },
                { roles: { some: { role: { name: 'mentor' } } } },
              ],
            },
          },
          ...(membership ? [{ teamId: membership.teamId }] : []),
        ],
      },
      include: {
        team: { select: { id: true, name: true } },
        mentor: {
          select: {
            ...publicMentor,
            mentorSlots: {
              where: { teamId: null, startTime: { gt: new Date() } },
              orderBy: { startTime: 'asc' },
              take: 10,
              select: { id: true, startTime: true, endTime: true },
            },
          },
        },
        slot: { select: { id: true, startTime: true, endTime: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  private async authorizedRequest(id: string, userId: string) {
    const request = await this.prisma.mentorshipRequest.findUnique({
      where: { id },
      include: {
        team: {
          select: { members: { where: { userId }, select: { id: true } } },
        },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.mentorId === userId && request.team.members.length === 0)
      await this.requireMentor(userId);
    if (request.mentorId !== userId && request.team.members.length === 0)
      throw new ForbiddenException();
    return request;
  }

  async decide(id: string, userId: string, status: MentorshipStatus) {
    const request = await this.authorizedRequest(id, userId);
    const mentorDecision =
      request.mentorId === userId &&
      request.status === 'pending' &&
      ['accepted', 'declined'].includes(status);
    const teamCancel =
      request.team.members.length > 0 &&
      ['pending', 'accepted'].includes(request.status) &&
      status === 'canceled';
    const mentorComplete =
      request.mentorId === userId &&
      request.status === 'accepted' &&
      status === 'completed';
    if (!mentorDecision && !teamCancel && !mentorComplete)
      throw new ForbiddenException('Invalid request transition');
    if ((mentorDecision || mentorComplete) && !teamCancel)
      await this.requireMentor(userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const changed = await tx.mentorshipRequest.updateMany({
        where: { id, status: request.status },
        data: { status },
      });
      if (!changed.count)
        throw new ConflictException('Request changed; refresh and try again');
      if (status === 'canceled')
        await tx.mentorSlot.updateMany({
          where: { requestId: id },
          data: { teamId: null, requestId: null },
        });

      if (['accepted', 'declined'].includes(status) && request.mentorId === userId) {
        const mentor = await tx.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        const mentorName = mentor?.name || 'Mentor';
        const teamMembers = await tx.teamMember.findMany({
          where: { teamId: request.teamId },
          select: { userId: true },
        });
        const isAccepted = status === 'accepted';
        for (const member of teamMembers) {
          await tx.notification.create({
            data: {
              userId: member.userId,
              title: isAccepted
                ? 'Mentorship Request Accepted'
                : 'Mentorship Request Declined',
              titleAr: isAccepted
                ? 'تم قبول طلب الإرشاد'
                : 'اعتذار عن طلب الإرشاد',
              message: isAccepted
                ? `${mentorName} accepted your team's mentorship request.`
                : `${mentorName} declined your mentorship request.`,
              messageAr: isAccepted
                ? `وافق المرشد ${mentorName} على طلب الإرشاد الخاص بفريقكم.`
                : `اعتذر المرشد ${mentorName} عن تلبية طلب الإرشاد.`,
              type: 'mentorship',
              link: isAccepted
                ? '/dashboard/participant/sessions'
                : '/dashboard/participant/mentorship',
            },
          });
        }
      }

      return tx.mentorshipRequest.findUnique({ where: { id } });
    });
  }

  async messages(id: string, userId: string, before?: string) {
    await this.authorizedRequest(id, userId);
    if (before) {
      const cursor = await this.prisma.mentorshipMessage.findUnique({
        where: { id: before },
        select: { requestId: true },
      });
      if (cursor?.requestId !== id)
        throw new BadRequestException('Invalid cursor');
    }
    return this.prisma.mentorshipMessage.findMany({
      where: { requestId: id },
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      select: {
        id: true,
        senderId: true,
        content: true,
        createdAt: true,
        sender: { select: { name: true, avatar: true } },
      },
    });
  }

  async saveNotes(id: string, userId: string, content: string) {
    await this.requireMentor(userId);
    const request = await this.authorizedRequest(id, userId);
    if (
      request.mentorId !== userId ||
      !['accepted', 'completed'].includes(request.status)
    )
      throw new ForbiddenException(
        'Only the mentor can write notes for an accepted request',
      );
    const saved = await this.prisma.mentorshipRequest.updateMany({
      where: {
        id,
        mentorId: userId,
        status: { in: ['accepted', 'completed'] },
      },
      data: { sessionNotes: content.trim() },
    });
    if (!saved.count)
      throw new ConflictException('Request changed; refresh and try again');
    return this.prisma.mentorshipRequest.findUnique({ where: { id } });
  }

  async send(id: string, userId: string, content: string) {
    if (!content.trim()) throw new BadRequestException('Message is empty');
    const request = await this.authorizedRequest(id, userId);
    if (!['pending', 'accepted'].includes(request.status))
      throw new ConflictException('Conversation is closed');
    return this.prisma.$transaction(async (tx) => {
      const open = await tx.mentorshipRequest.updateMany({
        where: { id, status: { in: ['pending', 'accepted'] } },
        data: { updatedAt: new Date() },
      });
      if (!open.count) throw new ConflictException('Conversation is closed');
      const sent = await tx.mentorshipMessage.create({
        data: { requestId: id, senderId: userId, content: content.trim() },
        select: {
          id: true,
          senderId: true,
          content: true,
          createdAt: true,
          sender: { select: { name: true, avatar: true } },
        },
      });
      return sent;
    });
  }

  async createSlot(userId: string, startTime: string, endTime: string) {
    await this.requireMentor(userId);
    const start = new Date(startTime),
      end = new Date(endTime);
    if (
      start <= new Date() ||
      end <= start ||
      end.getTime() - start.getTime() > 4 * 3600000
    )
      throw new BadRequestException('Invalid slot time');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      const overlap = await tx.mentorSlot.findFirst({
        where: {
          mentorId: userId,
          startTime: { lt: end },
          endTime: { gt: start },
        },
      });
      if (overlap) throw new ConflictException('Overlapping slot');
      return tx.mentorSlot.create({
        data: { mentorId: userId, startTime: start, endTime: end },
      });
    });
  }

  async deleteSlot(userId: string, id: string) {
    await this.requireMentor(userId);
    const slot = await this.prisma.mentorSlot.findUnique({ where: { id } });
    if (!slot || slot.mentorId !== userId) throw new NotFoundException();
    if (slot.teamId) throw new ConflictException('Cancel the session first');
    return this.prisma.mentorSlot.delete({ where: { id } });
  }

  async bookSlot(userId: string, slotId: string, requestId: string) {
    const request = await this.authorizedRequest(requestId, userId);
    await this.requireMentor(request.mentorId);
    if (!request.team.members.length || request.status !== 'accepted')
      throw new ForbiddenException('Accepted team request required');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requestId}))`;
      const current = await tx.mentorshipRequest.findUnique({
        where: { id: requestId },
        select: { status: true },
      });
      if (current?.status !== 'accepted')
        throw new ConflictException('Request is no longer accepted');
      const existing = await tx.mentorSlot.findUnique({ where: { requestId } });
      if (existing)
        throw new ConflictException('Request already has a booking');
      const booked = await tx.mentorSlot.updateMany({
        where: {
          id: slotId,
          mentorId: request.mentorId,
          teamId: null,
          startTime: { gt: new Date() },
        },
        data: { teamId: request.teamId, requestId },
      });
      if (!booked.count) throw new ConflictException('Slot is unavailable');
      return tx.mentorSlot.findUnique({ where: { id: slotId } });
    });
  }
}
