import { PrismaClient } from '@prisma/client';

export async function seedCommunity(prisma: PrismaClient) {
  console.log('💬 Seeding Community Q&A and Feed Posts...');

  const participantUser = await prisma.user.findUnique({ where: { email: 'participant@hackathon.local' } });
  const mentorUser = await prisma.user.findUnique({ where: { email: 'mentor@hackathon.local' } });
  const coordinatorUser = await prisma.user.findUnique({ where: { email: 'competition@hackathon.local' } });
  const organizerUser = await prisma.user.findUnique({ where: { email: 'organizer@hackathon.local' } });

  if (!participantUser || !organizerUser) {
    console.warn('⚠️  Core users not found, run essential seed first.');
    return;
  }

  // 1. Seed Questions & Answers
  const qCount = await prisma.communityQuestion.count();
  if (qCount === 0) {
    const q1 = await prisma.communityQuestion.create({
      data: {
        title: 'كيفية استدعاء بيانات NASA Earth MODIS عبر API وحل مشكلة الإحداثيات؟',
        content: 'نواجه مشكلة في معالجة إحداثيات الصور الجغرافية المرجعية (GeoTIFF) المستخرجة من MODIS API، هل هناك مكتبة موصى بها للتحويل إلى إحداثيات WGS84؟',
        category: 'technical',
        status: 'resolved',
        authorId: participantUser.id,
        viewsCount: 64,
        answersCount: 2,
      },
    });

    if (mentorUser) {
      const a1 = await prisma.communityAnswer.create({
        data: {
          questionId: q1.id,
          authorId: mentorUser.id,
          content: 'ننصح باستخدام مكتبة rasterio مع pyproj في بايثون. يمكنك استدعاء CRS الخاص بالصورة وتحويله باستخدام `rasterio.warp.transform_bounds` بكل سهولة.',
          isAccepted: true,
        },
      });

      // Reply to answer
      await prisma.communityAnswerComment.create({
        data: {
          answerId: a1.id,
          authorId: participantUser.id,
          content: 'شكراً جزيلاً يا باشمهندس، الكود اشتغل تمام وتمت معالجة البيانات بنجاح!',
        },
      });
    }

    await prisma.communityAnswer.create({
      data: {
        questionId: q1.id,
        authorId: organizerUser.id,
        content: 'تأكد أيضاً من تفعيل مفتاح NASA Earthdata Login Token لتجنب انقطاع الحصة (Rate Limiting).',
        isAccepted: false,
      },
    });

    const q2 = await prisma.communityQuestion.create({
      data: {
        title: 'What are the technical specs for the 30-second submission video demo?',
        content: 'Does NASA Space Apps require YouTube/Vimeo uploads or direct file uploads? Also, what resolution is recommended for the judging panel?',
        category: 'platform',
        status: 'resolved',
        authorId: participantUser.id,
        viewsCount: 88,
        answersCount: 1,
      },
    });

    if (coordinatorUser) {
      await prisma.communityAnswer.create({
        data: {
          questionId: q2.id,
          authorId: coordinatorUser.id,
          content: 'NASA Space Apps requires publicly accessible YouTube or Vimeo link. 1080p Full HD resolution is recommended.',
          isAccepted: true,
        },
      });
    }

    console.log('✅ Seeded 2 community questions with answers and replies.');
  }

  // 2. Seed Community Feed Posts
  const pCount = await prisma.communityPost.count();
  if (pCount === 0 && coordinatorUser) {
    const post1 = await prisma.communityPost.create({
      data: {
        title: '🚀 مرحباً بكم في مجتمع NASA Space Apps Giza 2026!',
        content: 'يسعدنا إطلاق ساحة المجتمع الرسمية لمشاركي ومرشدي الهاكاثون. استخدموا هذه المساحة لمشاركة تقدم فرقكم، طرح الأسئلة، وتبادل المعرفة والتجارب.',
        tags: ['announcement', 'welcome', 'spaceapps2026'],
        isPinned: true,
        authorId: coordinatorUser.id,
        likesCount: 5,
        commentsCount: 1,
      },
    });

    // Comment and reply on post
    const comment1 = await prisma.communityPostComment.create({
      data: {
        postId: post1.id,
        authorId: participantUser.id,
        content: 'متحمسون جداً للبدء في تحديات هذا العام! شكراً لفريق التنظيم.',
      },
    });

    if (mentorUser) {
      await prisma.communityPostComment.create({
        data: {
          postId: post1.id,
          authorId: mentorUser.id,
          parentId: comment1.id,
          content: 'بالتوفيق لجميع الفرق المشاركة! المرشدون متواجدون لمساعدتكم في أي استفسار تقني.',
        },
      });
    }

    console.log('✅ Seeded community feed posts, comments, and replies.');
  }
}
