import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { CommunityService } from '../src/community/community.service.js';

describe('Community & Q&A Service (live PostgreSQL)', () => {
  const db = new PrismaService();
  const auth = new AuthService(db);
  const community = new CommunityService(db);
  const suffix = randomUUID().slice(0, 8);

  const users: string[] = [];
  const questions: string[] = [];

  afterAll(async () => {
    if (questions.length > 0) {
      await db.communityAnswer.deleteMany({ where: { questionId: { in: questions } } });
      await db.communityQuestion.deleteMany({ where: { id: { in: questions } } });
    }
    if (users.length > 0) {
      await db.notification.deleteMany({ where: { userId: { in: users } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
    }
    await db.$disconnect();
  });

  async function register(name: string, role = 'participant') {
    const res = await auth.register({
      name,
      email: `${name.toLowerCase()}.${suffix}@communitytest.io`,
      password: 'Password123!',
      requestedRole: role,
    });
    users.push(res.user.id);
    return res.user;
  }

  it('creates, queries, answers, accepts, and deletes community questions and answers', async () => {
    const author = await register('CommAuthor', 'participant');
    const responder = await register('CommResponder', 'mentor');

    // 1. Create Question
    const question = await community.createQuestion(author.id, {
      title: `How to process GeoTIFF in Python? ${suffix}`,
      content: 'We need help parsing satellite bands with rasterio library.',
      category: 'technical',
    });

    expect(question).toBeDefined();
    expect(question.title).toContain('How to process GeoTIFF');
    expect(question.status).toBe('unanswered');
    expect(question.answersCount).toBe(0);
    questions.push(question.id);

    // 2. Query Questions
    const listRes = await community.listQuestions({
      category: 'technical',
      q: 'GeoTIFF',
    });
    expect(listRes.items.some((q) => q.id === question.id)).toBe(true);

    // 3. Get Question by ID and verify view count increment
    const fetched1 = await community.getQuestion(question.id);
    expect(fetched1.id).toBe(question.id);
    const fetched2 = await community.getQuestion(question.id);
    expect(fetched2.viewsCount).toBeGreaterThanOrEqual(1);

    // 4. Create Answer
    const answer = await community.createAnswer(question.id, responder.id, {
      content: 'Use rasterio.open() and read band 1, 2, 3 as numpy arrays.',
    });
    expect(answer).toBeDefined();
    expect(answer.content).toContain('rasterio.open()');

    // Verify question status transitioned to answered
    const questionAfterAnswer = await community.getQuestion(question.id);
    expect(questionAfterAnswer.status).toBe('answered');
    expect(questionAfterAnswer.answersCount).toBe(1);

    // Verify question author received a notification
    const authorNotif = await db.notification.findFirst({
      where: { userId: author.id, type: 'community' },
    });
    expect(authorNotif).toBeDefined();
    expect(authorNotif?.link).toContain(question.id);

    // 5. Author accepts answer
    const acceptRes = await community.acceptAnswer(
      question.id,
      answer.id,
      author.id,
      ['participant'],
    );
    expect(acceptRes.isAccepted).toBe(true);

    const questionAfterAccept = await community.getQuestion(question.id);
    expect(questionAfterAccept.status).toBe('resolved');
    expect(questionAfterAccept.answers[0].isAccepted).toBe(true);

    // Verify responder received an accepted notification
    const responderNotif = await db.notification.findFirst({
      where: { userId: responder.id, type: 'community' },
    });
    expect(responderNotif).toBeDefined();
    expect(responderNotif?.link).toContain(question.id);

    // 6. Stats calculation
    const stats = await community.getStats();
    expect(stats.totalQuestions).toBeGreaterThanOrEqual(1);
    expect(stats.resolvedCount).toBeGreaterThanOrEqual(1);

    // 7. Delete answer
    await community.deleteAnswer(question.id, answer.id, responder.id, [
      'mentor',
    ]);
    const questionAfterDeleteAnswer = await community.getQuestion(question.id);
    expect(questionAfterDeleteAnswer.answersCount).toBe(0);
    expect(questionAfterDeleteAnswer.status).toBe('unanswered');

    // 8. Delete question
    await community.deleteQuestion(question.id, author.id, ['participant']);
    await expect(community.getQuestion(question.id)).rejects.toThrow();
  });
});
