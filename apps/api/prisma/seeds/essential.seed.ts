import { PrismaClient, TeamStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { syncOfficialCatalogue } from '../official-catalogue.mjs';

export async function seedEssential(prisma: PrismaClient) {
  console.log('🌱 [1/3] Seeding NASA Challenges & System Roles...');

  // 1. Seed NASA Challenges
  try {
    await syncOfficialCatalogue(prisma);
    console.log('✅ Synchronized 14 official NASA Space Apps challenges.');
  } catch (err) {
    console.warn('⚠️  Could not sync official catalogue, skipping:', err);
  }

  // 2. Seed Roles
  const rolesData = [
    { name: 'organizer', description: 'Platform organizer with complete administrative access' },
    { name: 'competition', description: 'Competition Coordinator' },
    { name: 'judge', description: 'Evaluator and judge for hackathon team submissions' },
    { name: 'mentor', description: 'Subject matter expert mentoring teams' },
    { name: 'participant', description: 'Hackathon competitor' },
  ];

  const rolesMap = new Map<string, string>();
  for (const role of rolesData) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
    rolesMap.set(role.name, r.id);
  }
  console.log(`✅ Seeded ${rolesMap.size} roles.`);

  // 3. Seed Default Organizer Account
  console.log('🌱 [2/3] Seeding Default Organizer Account...');
  const organizerEmail = process.env.ORGANIZER_EMAIL || 'organizer@hackathon.local';
  const organizerPassword = process.env.ORGANIZER_PASSWORD || 'OrganizerSecure2026!';
  const organizerName = process.env.ORGANIZER_NAME || 'عمر خالد';

  const passwordHash = await bcrypt.hash(organizerPassword, 10);

  const organizerUser = await prisma.user.upsert({
    where: { email: organizerEmail },
    update: {
      name: organizerName,
      username: 'organizer',
      role: 'organizer',
      passwordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: organizerEmail,
      name: organizerName,
      username: 'organizer',
      role: 'organizer',
      passwordHash,
      isActive: true,
    },
  });

  const existingOrgAccount = await prisma.account.findFirst({
    where: { userId: organizerUser.id, providerId: 'credential' },
  });
  if (existingOrgAccount) {
    await prisma.account.update({
      where: { id: existingOrgAccount.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: organizerUser.id,
        accountId: organizerUser.id,
        providerId: 'credential',
        password: passwordHash,
      },
    });
  }

  const organizerRoleId = rolesMap.get('organizer');
  if (organizerRoleId) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: organizerUser.id,
          roleId: organizerRoleId,
        },
      },
      update: {},
      create: {
        userId: organizerUser.id,
        roleId: organizerRoleId,
      },
    });
  }
  console.log(`✅ Seeded organizer: ${organizerEmail}`);

  // 4. Seed Core Demo Role Accounts (5 distinct roles)
  console.log('🌱 [3/3] Seeding Core Demo Accounts (5 Roles)...');
  const demoUsers = [
    {
      email: 'competition@hackathon.local',
      username: 'competition',
      name: 'شريف عادل',
      role: 'competition',
      password: 'CompetitionSecure2026!',
    },
    {
      email: 'judge@hackathon.local',
      username: 'judge',
      name: 'د. هاني كمال',
      role: 'judge',
      password: 'JudgeSecure2026!',
    },
    {
      email: 'mentor@hackathon.local',
      username: 'mentor',
      name: 'م. طارق نبيل',
      role: 'mentor',
      password: 'MentorSecure2026!',
    },
    {
      email: 'participant@hackathon.local',
      username: 'participant',
      name: 'أحمد حسن',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Cairo University',
        academicLevel: 'Senior (Year 4)',
        skills: ['Python', 'Machine Learning', 'PyTorch', 'Data Science'],
        bio: 'Passionate about computer vision and satellite imagery analysis.',
        interests: ['Artificial Intelligence', 'Earth Observation', 'Space Science'],
        experience: 'Built a flood detection model using Sentinel-2 satellite imagery.',
        preferredChallenge: 'Earth Observation & Climate Action',
        teamStatus: TeamStatus.want_to_create_team,
        desiredRole: 'Data Scientist / AI Engineer',
        githubUrl: 'https://github.com/ahmed-hassan',
        linkedinUrl: 'https://linkedin.com/in/ahmed-hassan',
      },
    },
  ];

  for (const demo of demoUsers) {
    const demoPasswordHash = await bcrypt.hash(demo.password, 10);
    const u = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        name: demo.name,
        username: demo.username,
        role: demo.role,
        isActive: true,
        deletedAt: null,
      },
      create: {
        email: demo.email,
        name: demo.name,
        username: demo.username,
        role: demo.role,
        passwordHash: demoPasswordHash,
        isActive: true,
      },
    });

    const existingAcc = await prisma.account.findFirst({
      where: { userId: u.id, providerId: 'credential' },
    });
    if (existingAcc) {
      await prisma.account.update({
        where: { id: existingAcc.id },
        data: { password: demoPasswordHash },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: u.id,
          accountId: u.id,
          providerId: 'credential',
          password: demoPasswordHash,
        },
      });
    }

    const roleId = rolesMap.get(demo.role);
    if (roleId) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: u.id,
            roleId,
          },
        },
        update: {},
        create: {
          userId: u.id,
          roleId,
        },
      });
    }

    if (demo.profile) {
      await prisma.profile.upsert({
        where: { userId: u.id },
        update: {
          institution: demo.profile.institution,
          academicLevel: demo.profile.academicLevel,
          skills: demo.profile.skills,
          bio: demo.profile.bio,
          interests: demo.profile.interests,
          experience: demo.profile.experience,
          preferredChallenge: demo.profile.preferredChallenge,
          teamStatus: demo.profile.teamStatus,
          desiredRole: demo.profile.desiredRole,
          githubUrl: demo.profile.githubUrl,
          linkedinUrl: demo.profile.linkedinUrl,
          isPublic: true,
        },
        create: {
          userId: u.id,
          institution: demo.profile.institution,
          academicLevel: demo.profile.academicLevel,
          skills: demo.profile.skills,
          bio: demo.profile.bio,
          interests: demo.profile.interests,
          experience: demo.profile.experience,
          preferredChallenge: demo.profile.preferredChallenge,
          teamStatus: demo.profile.teamStatus,
          desiredRole: demo.profile.desiredRole,
          githubUrl: demo.profile.githubUrl,
          linkedinUrl: demo.profile.linkedinUrl,
          isPublic: true,
        },
      });
    }

    console.log(`✅ Seeded ${demo.role}: ${demo.email} (${demo.name})`);
  }

  return { rolesMap, organizerUser };
}
