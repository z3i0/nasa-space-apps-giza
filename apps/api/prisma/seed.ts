import { PrismaClient, TeamStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for auth & authorization...');

  // -------------------------------------------------------------
  // 1. Seed Roles
  // -------------------------------------------------------------
  const rolesData = [
    { name: 'organizer', description: 'Platform organizer with complete administrative access' },
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

  // -------------------------------------------------------------
  // 2. Seed Default Organizer Account from Environment Variables
  // -------------------------------------------------------------
  const organizerEmail = process.env.ORGANIZER_EMAIL || 'organizer@hackathon.local';
  const organizerPassword = process.env.ORGANIZER_PASSWORD || 'OrganizerSecure2026!';
  const organizerName = process.env.ORGANIZER_NAME || 'Platform Organizer';

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

  // Seed Better Auth Account record for credential login
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

  console.log(`✅ Seeded default organizer account: ${organizerEmail}`);

  // -------------------------------------------------------------
  // 3. Seed Demo Accounts for Each Role (Easy Testing)
  // -------------------------------------------------------------
  const demoUsers = [
    {
      email: 'judge@hackathon.local',
      username: 'judge',
      name: 'Corey Decelle',
      role: 'judge',
      password: 'JudgeSecure2026!',
    },
    {
      email: 'mentor@hackathon.local',
      username: 'mentor',
      name: 'Josh Knox',
      role: 'mentor',
      password: 'MentorSecure2026!',
    },
    {
      email: 'participant@hackathon.local',
      username: 'participant',
      name: 'Rafe Oneal',
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
        desiredRole: 'AI Engineer',
        githubUrl: 'https://github.com/rafe-oneal',
        linkedinUrl: 'https://linkedin.com/in/rafe-oneal',
      },
    },
    // Additional Test Participants for Team Search & Matching
    {
      email: 'sarah.frontend@hackathon.local',
      username: 'sarah_f',
      name: 'Sarah Mansour',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Ain Shams University',
        academicLevel: 'Junior (Year 3)',
        skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
        bio: 'Frontend engineer creating responsive, accessible dashboards for space data.',
        interests: ['Earth Observation', 'Web Development', 'UI Design'],
        experience: '2 years frontend experience with Next.js and Mapbox GL.',
        preferredChallenge: 'Earth Observation & Climate Action',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Frontend Developer',
        githubUrl: 'https://github.com/sarah-mansour',
        linkedinUrl: 'https://linkedin.com/in/sarah-mansour',
      },
    },
    {
      email: 'youssef.uiux@hackathon.local',
      username: 'youssef_ui',
      name: 'Youssef El-Sayed',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'German University in Cairo (GUC)',
        academicLevel: 'Sophomore (Year 2)',
        skills: ['Figma', 'UI/UX', 'User Research', 'Prototyping'],
        bio: 'Product and visual designer obsessed with space-grade UI experiences.',
        interests: ['Space Exploration', 'Data Visualization', 'Product Design'],
        experience: 'Lead designer for university robotics team platform.',
        preferredChallenge: 'Earth Observation & Climate Action',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'UI/UX Designer',
        portfolioUrl: 'https://behance.net/youssef-space',
      },
    },
    {
      email: 'kareem.hardware@hackathon.local',
      username: 'kareem_hw',
      name: 'Kareem Tarek',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Alexandria University',
        academicLevel: 'Senior (Year 4)',
        skills: ['Embedded Systems', 'C++', 'Arduino', 'IoT', 'Sensors'],
        bio: 'Hardware and robotics engineer focusing on environmental IoT sensors.',
        interests: ['Hardware', 'CubeSats', 'Sensors'],
        experience: 'Designed telemetry system for student CanSat competition.',
        preferredChallenge: 'Deep Space Communications',
        teamStatus: TeamStatus.working_individually,
        desiredRole: 'Hardware Engineer',
      },
    },
    {
      email: 'nour.biz@hackathon.local',
      username: 'nour_biz',
      name: 'Nour Hassan',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'American University in Cairo (AUC)',
        academicLevel: 'Master Student',
        skills: ['Business Development', 'Pitching', 'Market Research', 'Product Management'],
        bio: 'Entrepreneurial thinker helping technical teams validate problem-solution fit.',
        interests: ['Climate Tech', 'Space Commercialization', 'Startups'],
        experience: 'Winner of Injaz Egypt 2025, raised pre-seed for climate startup.',
        preferredChallenge: 'Earth Observation & Climate Action',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Business & Pitch Lead',
      },
    },
    {
      email: 'tarek.leader@hackathon.local',
      username: 'tarek_lead',
      name: 'Tarek Nabil',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Helwan University',
        academicLevel: 'Junior (Year 3)',
        skills: ['Full Stack', 'Node.js', 'Docker', 'Python'],
        bio: 'Full stack hacker and team captain already assembled for the mission.',
        interests: ['Planetary Defense', 'Web Development'],
        experience: 'NASA Space Apps 2024 Global Nominee.',
        preferredChallenge: 'Planetary Defense & Near-Earth Objects',
        teamStatus: TeamStatus.already_have_team,
        desiredRole: 'Team Leader',
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

    // Seed Better Auth Account record for credential login
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

    // Seed Profile if available
    if ((demo as any).profile) {
      const pData = (demo as any).profile;
      await prisma.profile.upsert({
        where: { userId: u.id },
        update: {
          institution: pData.institution,
          academicLevel: pData.academicLevel,
          skills: pData.skills,
          bio: pData.bio,
          interests: pData.interests,
          experience: pData.experience,
          preferredChallenge: pData.preferredChallenge,
          teamStatus: pData.teamStatus,
          desiredRole: pData.desiredRole,
          githubUrl: pData.githubUrl,
          linkedinUrl: pData.linkedinUrl,
          portfolioUrl: pData.portfolioUrl,
          isPublic: true,
        },
        create: {
          userId: u.id,
          institution: pData.institution,
          academicLevel: pData.academicLevel,
          skills: pData.skills,
          bio: pData.bio,
          interests: pData.interests,
          experience: pData.experience,
          preferredChallenge: pData.preferredChallenge,
          teamStatus: pData.teamStatus,
          desiredRole: pData.desiredRole,
          githubUrl: pData.githubUrl,
          linkedinUrl: pData.linkedinUrl,
          portfolioUrl: pData.portfolioUrl,
          isPublic: true,
        },
      });
    }

    console.log(`✅ Seeded ${demo.role}: ${demo.email}`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
