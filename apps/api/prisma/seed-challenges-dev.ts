import { PrismaClient } from '@prisma/client';

// Explicit, local-only development fixtures. Never imported by the production seed.
const db = new PrismaClient();
const url = new URL(process.env.DATABASE_URL || 'postgresql://localhost');
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
)
  throw new Error(
    'Development challenge fixtures may only run against a local database.',
  );
try {
  const organizer = await db.user.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { role: 'organizer' },
        { roles: { some: { role: { name: 'organizer' } } } },
      ],
    },
    select: { id: true },
  });
  if (!organizer)
    throw new Error(
      'Create an organizer account before loading development fixtures.',
    );
  const examples = [
    {
      slug: 'dev-earth-observation',
      title: 'Earth observation explorer',
      titleAr: 'استكشف رصد الأرض',
      category: 'Earth science',
      difficulty: 'beginner' as const,
      tags: ['Maps', 'Open data'],
      summary:
        'Explore how a map can help a community understand changes in its environment.',
      summaryAr: 'استكشف كيف تساعد الخرائط المجتمع على فهم تغيرات البيئة.',
    },
    {
      slug: 'dev-space-weather',
      title: 'Space weather stories',
      titleAr: 'حكايات طقس الفضاء',
      category: 'Space science',
      difficulty: 'intermediate' as const,
      tags: ['Storytelling', 'Visualization'],
      summary:
        'Design an accessible story that explains a space weather event to a new audience.',
      summaryAr: 'صمّم قصة مبسطة تشرح ظاهرة من ظواهر طقس الفضاء لجمهور جديد.',
    },
    {
      slug: 'dev-climate-signals',
      title: 'Climate signals lab',
      titleAr: 'مختبر إشارات المناخ',
      category: 'Earth science',
      difficulty: 'advanced' as const,
      tags: ['Python', 'Analysis'],
      summary:
        'Investigate a time series and communicate the uncertainty behind an environmental trend.',
      summaryAr: 'حلّل سلسلة زمنية واشرح عدم اليقين وراء اتجاه بيئي.',
    },
  ];
  for (const example of examples)
    await db.challenge.upsert({
      where: { slug: example.slug },
      update: {},
      create: {
        ...example,
        description: `${example.summary}\n\nDevelopment exercise: identify a question, choose a dataset, build a small prototype, and explain its limitations. This is sample content for testing the platform; it is not an official event challenge.`,
        descriptionAr: `${example.summaryAr}\n\nتمرين للتطوير: حدد سؤالاً واختر بيانات وابنِ نموذجاً أولياً واشرح حدوده. هذا محتوى تجريبي لا يمثل تحدياً رسمياً للحدث.`,
        year: 2026,
        isPublished: true,
        isDemo: true,
        createdById: organizer.id,
      },
    });
  console.log(
    'Three clearly labeled development challenges are available. Existing edits were preserved.',
  );
} finally {
  await db.$disconnect();
}
