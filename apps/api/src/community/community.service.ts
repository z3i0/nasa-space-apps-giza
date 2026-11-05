import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { notificationTemplates } from '../events/notification-templates.js';
import type {
  CreateAnswerCommentDto,
  CreateAnswerDto,
  CreatePostCommentDto,
  CreatePostDto,
  CreateQuestionDto,
  QueryPostsDto,
  QueryQuestionsDto,
  UpdatePostDto,
  UpdateQuestionDto,
} from './dto.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function verifyImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === 'image/gif') {
    const sig = buffer.subarray(0, 6).toString('ascii');
    return sig === 'GIF87a' || sig === 'GIF89a';
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) { }

  async listQuestions(query: QueryQuestionsDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.category && query.category !== 'all') {
      where.category = query.category;
    }

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.q && query.q.trim().length > 0) {
      const search = query.q.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sort === 'most_answers') {
      orderBy = { answersCount: 'desc' };
    } else if (query.sort === 'most_views') {
      orderBy = { viewsCount: 'desc' };
    } else if (query.sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }

    const [items, total] = await Promise.all([
      this.prisma.communityQuestion.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.communityQuestion.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getQuestion(id: string) {
    const question = await this.prisma.communityQuestion.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        answers: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                role: true,
              },
            },
            comments: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                    role: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: [{ isAccepted: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    // Increment views asynchronously
    await this.prisma.communityQuestion.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    return question;
  }

  async createQuestion(authorId: string, dto: CreateQuestionDto) {
    return this.prisma.communityQuestion.create({
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        category: dto.category || 'general',
        status: 'unanswered',
        images: Array.isArray(dto.images) ? dto.images.slice(0, 4) : [],
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  }

  async deleteQuestion(id: string, userId: string, userRoles: string[]) {
    const question = await this.prisma.communityQuestion.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    const isPrivileged =
      userRoles.includes('organizer') || userRoles.includes('competition');
    if (question.authorId !== userId && !isPrivileged) {
      throw new ForbiddenException('Not authorized to delete this question');
    }

    return this.prisma.communityQuestion.delete({
      where: { id },
    });
  }

  async updateQuestion(
    id: string,
    userId: string,
    userRoles: string[],
    dto: UpdateQuestionDto,
  ) {
    const question = await this.prisma.communityQuestion.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    const isPrivileged =
      userRoles.includes('organizer') || userRoles.includes('competition');
    if (question.authorId !== userId && !isPrivileged) {
      throw new ForbiddenException('Not authorized to edit this question');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.content !== undefined) data.content = dto.content.trim();
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.images !== undefined)
      data.images = Array.isArray(dto.images) ? dto.images.slice(0, 4) : [];

    return this.prisma.communityQuestion.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  }

  async createAnswer(
    questionId: string,
    authorId: string,
    dto: CreateAnswerDto,
  ) {
    const question = await this.prisma.communityQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const answer = await this.prisma.communityAnswer.create({
      data: {
        questionId,
        authorId,
        content: dto.content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Update question answers count and status
    const newStatus =
      question.status === 'unanswered' ? 'answered' : question.status;
    await this.prisma.communityQuestion.update({
      where: { id: questionId },
      data: {
        answersCount: { increment: 1 },
        status: newStatus,
      },
    });

    // Send notification to the question author if someone else answered
    if (question.authorId !== authorId) {
      const responderName = answer.author?.name;
      const questionTitlePreview =
        question.title.length > 60
          ? `${question.title.slice(0, 60)}...`
          : question.title;

      await this.prisma.notification.create({
        data: {
          userId: question.authorId,
          type: 'community',
          ...notificationTemplates.community.newAnswer(
            responderName,
            questionTitlePreview,
          ),
          link: `/dashboard/participant/community/${questionId}`,
        },
      });
    }

    return answer;
  }

  async acceptAnswer(
    questionId: string,
    answerId: string,
    userId: string,
    userRoles: string[],
  ) {
    const question = await this.prisma.communityQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const isPrivileged =
      userRoles.includes('organizer') || userRoles.includes('competition');
    if (question.authorId !== userId && !isPrivileged) {
      throw new ForbiddenException(
        'Only the question author or an organizer can accept answers',
      );
    }

    const targetAnswer = await this.prisma.communityAnswer.findUnique({
      where: { id: answerId },
    });

    if (!targetAnswer || targetAnswer.questionId !== questionId) {
      throw new NotFoundException(`Answer with ID ${answerId} not found`);
    }

    // Toggle: if already accepted, unaccept and revert status
    const shouldAccept = !targetAnswer.isAccepted;

    // Reset any other accepted answers for this question
    await this.prisma.communityAnswer.updateMany({
      where: { questionId },
      data: { isAccepted: false },
    });

    if (shouldAccept) {
      await this.prisma.communityAnswer.update({
        where: { id: answerId },
        data: { isAccepted: true },
      });
      await this.prisma.communityQuestion.update({
        where: { id: questionId },
        data: { status: 'resolved' },
      });

      // Notify the answer author that their answer was accepted as the solution
      if (targetAnswer.authorId !== userId) {
        const questionTitlePreview =
          question.title.length > 60
            ? `${question.title.slice(0, 60)}...`
            : question.title;

        await this.prisma.notification.create({
          data: {
            userId: targetAnswer.authorId,
            type: 'community',
            ...notificationTemplates.community.acceptedSolution(
              questionTitlePreview,
            ),
            link: `/dashboard/participant/community/${questionId}`,
          },
        });
      }
    } else {
      await this.prisma.communityQuestion.update({
        where: { id: questionId },
        data: { status: 'answered' },
      });
    }

    return { success: true, isAccepted: shouldAccept };
  }

  async deleteAnswer(
    questionId: string,
    answerId: string,
    userId: string,
    userRoles: string[],
  ) {
    const answer = await this.prisma.communityAnswer.findUnique({
      where: { id: answerId },
    });

    if (!answer || answer.questionId !== questionId) {
      throw new NotFoundException(`Answer with ID ${answerId} not found`);
    }

    const isPrivileged =
      userRoles.includes('organizer') || userRoles.includes('competition');
    if (answer.authorId !== userId && !isPrivileged) {
      throw new ForbiddenException('Not authorized to delete this answer');
    }

    await this.prisma.communityAnswer.delete({
      where: { id: answerId },
    });

    // Recount remaining answers
    const remainingCount = await this.prisma.communityAnswer.count({
      where: { questionId },
    });

    const anyAccepted = await this.prisma.communityAnswer.findFirst({
      where: { questionId, isAccepted: true },
    });

    let newStatus = 'unanswered';
    if (anyAccepted) {
      newStatus = 'resolved';
    } else if (remainingCount > 0) {
      newStatus = 'answered';
    }

    await this.prisma.communityQuestion.update({
      where: { id: questionId },
      data: {
        answersCount: remainingCount,
        status: newStatus,
      },
    });

    return { success: true };
  }

  async createAnswerComment(
    questionId: string,
    answerId: string,
    authorId: string,
    dto: CreateAnswerCommentDto,
  ) {
    const answer = await this.prisma.communityAnswer.findUnique({
      where: { id: answerId },
      include: {
        author: { select: { id: true, name: true } },
        question: { select: { id: true, title: true } },
      },
    });

    if (!answer || answer.questionId !== questionId) {
      throw new NotFoundException(`Answer with ID ${answerId} not found`);
    }

    const comment = await this.prisma.communityAnswerComment.create({
      data: {
        answerId,
        authorId,
        content: dto.content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Notify answer author if someone else replies
    if (answer.authorId !== authorId) {
      const commenterName = comment.author?.name || 'مشارك في الهاكاثون';
      const qTitlePreview =
        answer.question.title.length > 50
          ? `${answer.question.title.slice(0, 50)}...`
          : answer.question.title;

      await this.prisma.notification.create({
        data: {
          userId: answer.authorId,
          type: 'community',
          ...notificationTemplates.community.replyToAnswer(
            commenterName,
            qTitlePreview,
          ),
          link: `/dashboard/participant/community/${questionId}`,
        },
      });
    }

    return comment;
  }

  async deleteAnswerComment(
    questionId: string,
    answerId: string,
    commentId: string,
    userId: string,
    userRoles: string[],
  ) {
    const comment = await this.prisma.communityAnswerComment.findUnique({
      where: { id: commentId },
      include: { answer: true },
    });

    if (
      !comment ||
      comment.answerId !== answerId ||
      comment.answer.questionId !== questionId
    ) {
      throw new NotFoundException(`Reply with ID ${commentId} not found`);
    }

    const isPrivileged =
      userRoles.includes('organizer') || userRoles.includes('competition');
    if (comment.authorId !== userId && !isPrivileged) {
      throw new ForbiddenException('Not authorized to delete this reply');
    }

    return this.prisma.communityAnswerComment.delete({
      where: { id: commentId },
    });
  }

  async getStats() {
    const [totalQuestions, answeredCount, unansweredCount, resolvedCount, totalAnswers] =
      await Promise.all([
        this.prisma.communityQuestion.count(),
        this.prisma.communityQuestion.count({ where: { status: 'answered' } }),
        this.prisma.communityQuestion.count({ where: { status: 'unanswered' } }),
        this.prisma.communityQuestion.count({ where: { status: 'resolved' } }),
        this.prisma.communityAnswer.count(),
      ]);

    const categories = ['technical', 'platform', 'challenge', 'general'];
    const categoryBreakdown = await Promise.all(
      categories.map(async (cat) => ({
        category: cat,
        count: await this.prisma.communityQuestion.count({
          where: { category: cat },
        }),
      })),
    );

    return {
      totalQuestions,
      answeredCount,
      unansweredCount,
      resolvedCount,
      totalAnswers,
      categoryBreakdown,
    };
  }

  // ---------------------------------------------------------------------------
  // Community Feed Posts, Reactions & Comments
  // ---------------------------------------------------------------------------

  async listPosts(query: QueryPostsDto, currentUserId?: string) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.tag && query.tag !== 'all') {
      where.tags = { has: query.tag };
    }

    if (query.q && query.q.trim().length > 0) {
      const search = query.q.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    let secondaryOrder: any = { createdAt: 'desc' };
    if (query.sort === 'most_likes') {
      secondaryOrder = { likesCount: 'desc' };
    } else if (query.sort === 'most_comments') {
      secondaryOrder = { commentsCount: 'desc' };
    } else if (query.sort === 'oldest') {
      secondaryOrder = { createdAt: 'asc' };
    }

    const [items, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
        },
        orderBy: [{ isPinned: 'desc' }, secondaryOrder],
        skip,
        take: limit,
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    // Check which posts the current user has liked
    let userLikedPostIds = new Set<string>();
    if (currentUserId && items.length > 0) {
      const likes = await this.prisma.communityPostLike.findMany({
        where: {
          userId: currentUserId,
          postId: { in: items.map((i) => i.id) },
        },
        select: { postId: true },
      });
      userLikedPostIds = new Set(likes.map((l) => l.postId));
    }

    const mappedItems = items.map((post) => ({
      ...post,
      isLiked: userLikedPostIds.has(post.id),
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPost(id: string, currentUserId?: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        comments: {
          where: { parentId: null },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                role: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                    role: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    let isLiked = false;
    if (currentUserId) {
      const userLike = await this.prisma.communityPostLike.findUnique({
        where: {
          postId_userId: {
            postId: id,
            userId: currentUserId,
          },
        },
      });
      isLiked = !!userLike;
    }

    return {
      ...post,
      isLiked,
    };
  }

  async createPost(
    authorId: string,
    userRoles: string[],
    dto: CreatePostDto,
  ) {
    const isPrivileged =
      userRoles.includes('organizer') || userRoles.includes('competition');
    const isPinned = isPrivileged && dto.isPinned === true;

    return this.prisma.communityPost.create({
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        tags: Array.isArray(dto.tags) ? dto.tags : [],
        images: Array.isArray(dto.images) ? dto.images.slice(0, 4) : [],
        isPinned,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  }

  async deletePost(id: string, userId: string, userRoles: string[]) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    const isPrivileged =
      userRoles.includes('organizer') || userRoles.includes('competition');
    if (post.authorId !== userId && !isPrivileged) {
      throw new ForbiddenException('Not authorized to delete this post');
    }

    return this.prisma.communityPost.delete({
      where: { id },
    });
  }

  async updatePost(
    id: string,
    userId: string,
    userRoles: string[],
    dto: UpdatePostDto,
  ) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    const isPrivileged =
      userRoles.includes('organizer') || userRoles.includes('competition');
    if (post.authorId !== userId && !isPrivileged) {
      throw new ForbiddenException('Not authorized to edit this post');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.content !== undefined) data.content = dto.content.trim();
    if (dto.tags !== undefined)
      data.tags = Array.isArray(dto.tags) ? dto.tags : [];
    if (dto.images !== undefined)
      data.images = Array.isArray(dto.images) ? dto.images.slice(0, 4) : [];
    if (dto.isPinned !== undefined && isPrivileged) data.isPinned = dto.isPinned;

    return this.prisma.communityPost.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  }

  async toggleLikePost(postId: string, userId: string, targetLiked?: boolean) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const existingLike = await this.prisma.communityPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    const isCurrentlyLiked = !!existingLike;
    const shouldBeLiked =
      targetLiked !== undefined ? targetLiked : !isCurrentlyLiked;

    if (shouldBeLiked === isCurrentlyLiked) {
      return { isLiked: shouldBeLiked, likesCount: post.likesCount };
    }

    if (!shouldBeLiked && existingLike) {
      // Remove like
      await this.prisma.communityPostLike.delete({
        where: { id: existingLike.id },
      });
      const updated = await this.prisma.communityPost.update({
        where: { id: postId },
        data: {
          likesCount: {
            decrement: 1,
          },
        },
        select: { likesCount: true },
      });
      return { isLiked: false, likesCount: Math.max(0, updated.likesCount) };
    } else if (shouldBeLiked && !existingLike) {
      // Add like
      await this.prisma.communityPostLike.create({
        data: {
          postId,
          userId,
        },
      });
      const updated = await this.prisma.communityPost.update({
        where: { id: postId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
        select: { likesCount: true },
      });
      return { isLiked: true, likesCount: updated.likesCount };
    }

    return { isLiked: shouldBeLiked, likesCount: post.likesCount };
  }

  async createPostComment(
    postId: string,
    authorId: string,
    dto: CreatePostCommentDto,
  ) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    let parentComment: any = null;
    if (dto.parentId) {
      parentComment = await this.prisma.communityPostComment.findUnique({
        where: { id: dto.parentId },
        include: {
          author: { select: { id: true, name: true } },
        },
      });

      if (!parentComment || parentComment.postId !== postId) {
        throw new NotFoundException(
          `Parent comment with ID ${dto.parentId} not found`,
        );
      }
    }

    const comment = await this.prisma.communityPostComment.create({
      data: {
        postId,
        authorId,
        content: dto.content.trim(),
        parentId: dto.parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Increment commentsCount
    await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        commentsCount: { increment: 1 },
      },
    });

    // Send notification
    const commenterName = comment.author?.name || 'مشارك في الهاكاثون';
    const postTitlePreview =
      post.title.length > 50 ? `${post.title.slice(0, 50)}...` : post.title;

    if (parentComment && parentComment.authorId !== authorId) {
      // Notify parent comment author about the reply
      await this.prisma.notification.create({
        data: {
          userId: parentComment.authorId,
          type: 'community',
          ...notificationTemplates.community.replyToComment(
            commenterName,
            postTitlePreview,
          ),
          link: `/dashboard/participant/community/posts/${postId}`,
        },
      });
    } else if (!parentComment && post.authorId !== authorId) {
      // Notify post author about the top-level comment
      await this.prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'community',
          ...notificationTemplates.community.newComment(
            commenterName,
            postTitlePreview,
          ),
          link: `/dashboard/participant/community/posts/${postId}`,
        },
      });
    }

    return comment;
  }

  async deletePostComment(
    postId: string,
    commentId: string,
    userId: string,
    userRoles: string[],
  ) {
    const comment = await this.prisma.communityPostComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.postId !== postId) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    const isPrivileged =
      userRoles.includes('organizer') || userRoles.includes('competition');
    if (comment.authorId !== userId && !isPrivileged) {
      throw new ForbiddenException('Not authorized to delete this comment');
    }

    await this.prisma.communityPostComment.delete({
      where: { id: commentId },
    });

    await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        commentsCount: { decrement: 1 },
      },
    });

    return { success: true };
  }

  async uploadImages(
    files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>,
  ): Promise<{ urls: string[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    if (files.length > 4) {
      throw new BadRequestException('Maximum 4 images allowed per upload');
    }

    const uploadDir = path.resolve(process.cwd(), 'uploads', 'community');
    await fs.mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `Image "${file.originalname}" exceeds the 5MB size limit`,
        );
      }

      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(
          `Invalid image type "${file.mimetype}". Allowed types: JPG, PNG, WEBP, GIF`,
        );
      }

      if (!verifyImageSignature(file.buffer, file.mimetype)) {
        throw new BadRequestException(
          `Corrupted or spoofed image detected: "${file.originalname}" does not match its file header`,
        );
      }

      const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
      const safeFilename = `${crypto.randomUUID()}${ext}`;
      const filePath = path.join(uploadDir, safeFilename);

      await fs.writeFile(filePath, file.buffer);
      urls.push(`/uploads/community/${safeFilename}`);
    }

    return { urls };
  }
}
