import { PrismaClient } from '@prisma/client';
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
    console.log(`✅ Seeded demo ${demo.role}: ${demo.email}`);
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
