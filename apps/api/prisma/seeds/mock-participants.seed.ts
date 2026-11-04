import { PrismaClient, TeamStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function seedMockParticipants(prisma: PrismaClient) {
  console.log('👥 Seeding additional mock participants...');

  const participantRole = await prisma.role.findUnique({ where: { name: 'participant' } });
  if (!participantRole) {
    console.warn('⚠️  Participant role not found, run essential seed first.');
    return;
  }

  const extraParticipants = [
    {
      email: 'sarah.frontend@hackathon.local',
      username: 'sarah_f',
      name: 'سارة منصور',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Ain Shams University',
        academicLevel: 'Junior (Year 3)',
        skills: ['React', 'Next.js', 'TailwindCSS', 'TypeScript'],
        bio: 'Frontend specialist building interactive dashboards and spatial map tools.',
        interests: ['Web Development', 'UI/UX Design', 'Earth Science'],
        experience: 'Developed real-time weather analytics interface for hackathon project.',
        preferredChallenge: 'Earth Observation & Climate Action',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Frontend Developer',
      },
    },
    {
      email: 'youssef.uiux@hackathon.local',
      username: 'youssef_ui',
      name: 'يوسف السيد',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Helwan University (Applied Arts)',
        academicLevel: 'Senior (Year 4)',
        skills: ['Figma', 'UI/UX', 'Design Systems', 'User Research'],
        bio: 'Product designer focused on data visualization and accessibility.',
        interests: ['User Experience', 'Space Science', 'Design Thinking'],
        experience: 'Designed mobile app for stargazing and astronomical events.',
        preferredChallenge: 'Space Exploration & Citizen Science',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'UI/UX Designer',
      },
    },
    {
      email: 'kareem.hardware@hackathon.local',
      username: 'kareem_hw',
      name: 'كريم طارق',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Cairo University (Faculty of Engineering)',
        academicLevel: 'Senior (Year 4)',
        skills: ['Embedded Systems', 'IoT', 'C++', 'Raspberry Pi'],
        bio: 'Hardware engineer building telemetry stations and remote sensor probes.',
        interests: ['Robotics', 'Space Technology', 'IoT'],
        experience: 'Built CanSat sub-orbital telemetry payload for competition.',
        preferredChallenge: 'Planetary Defense & Near-Earth Objects',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Hardware / Embedded Engineer',
      },
    },
    {
      email: 'nour.biz@hackathon.local',
      username: 'nour_biz',
      name: 'نور حسن',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'AUC (School of Business)',
        academicLevel: 'Junior (Year 3)',
        skills: ['Market Research', 'Pitch Decks', 'Product Strategy'],
        bio: 'Strategic thinker bridging technical space science with real-world impact.',
        interests: ['Business Strategy', 'Space Economy', 'Sustainability'],
        experience: 'Led winning pitch deck for environmental impact venture.',
        preferredChallenge: 'Earth Observation & Climate Action',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Product & Pitch Lead',
      },
    },
    {
      email: 'tarek.leader@hackathon.local',
      username: 'tarek_lead',
      name: 'طارق نبيل',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Alexandria University',
        academicLevel: 'Master Student',
        skills: ['Full Stack', 'Python', 'FastAPI', 'PostgreSQL'],
        bio: 'Astrophysics enthusiast and backend architect for large telemetry sets.',
        interests: ['Astrophysics', 'Cloud Architecture', 'Distributed Systems'],
        experience: 'Published paper on asteroid orbital mechanics computation.',
        preferredChallenge: 'Planetary Defense & Near-Earth Objects',
        teamStatus: TeamStatus.want_to_create_team,
        desiredRole: 'Team Captain & Full Stack',
      },
    },
    {
      email: 'layla.backend@hackathon.local',
      username: 'layla_be',
      name: 'ليلى عبد الله',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Cairo University',
        academicLevel: 'Senior (Year 4)',
        skills: ['Node.js', 'Go', 'Docker', 'REST & gRPC'],
        bio: 'Systems programmer passionate about low-latency distributed telemetry.',
        interests: ['Deep Space Communications', 'Networking Protocols'],
        experience: 'Built reliable UDP communication relay for IoT mesh sensors.',
        preferredChallenge: 'Deep Space Communications',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Backend & Protocol Lead',
      },
    },
    {
      email: 'omar.ml@hackathon.local',
      username: 'omar_ml',
      name: 'عمر فتحي',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Mansoura University',
        academicLevel: 'Senior (Year 4)',
        skills: ['Machine Learning', 'Computer Vision', 'PyTorch', 'GIS'],
        bio: 'Deep learning researcher applying convolutional models to satellite data.',
        interests: ['Computer Vision', 'Climate Change', 'Remote Sensing'],
        experience: 'Trained CNN classifier on satellite imagery for forest monitoring.',
        preferredChallenge: 'Earth Observation & Climate Action',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'ML & Data Lead',
      },
    },
    {
      email: 'dina.mobile@hackathon.local',
      username: 'dina_mob',
      name: 'دينا خالد',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'German University in Cairo (GUC)',
        academicLevel: 'Senior (Year 4)',
        skills: ['React Native', 'Flutter', 'Mobile Architecture'],
        bio: 'Mobile software engineer creating intuitive apps for citizen scientists.',
        interests: ['Mobile Development', 'Citizen Science', 'Astronomy'],
        experience: 'Shipped two cross-platform apps on Google Play Store.',
        preferredChallenge: 'Space Exploration & Citizen Science',
        teamStatus: TeamStatus.want_to_create_team,
        desiredRole: 'Mobile & App Lead',
      },
    },
  ];

  for (const p of extraParticipants) {
    const passwordHash = await bcrypt.hash(p.password, 10);
    const u = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        name: p.name,
        username: p.username,
        role: p.role,
        isActive: true,
        deletedAt: null,
      },
      create: {
        email: p.email,
        name: p.name,
        username: p.username,
        role: p.role,
        passwordHash,
        isActive: true,
      },
    });

    const existingAcc = await prisma.account.findFirst({
      where: { userId: u.id, providerId: 'credential' },
    });
    if (existingAcc) {
      await prisma.account.update({
        where: { id: existingAcc.id },
        data: { password: passwordHash },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: u.id,
          accountId: u.id,
          providerId: 'credential',
          password: passwordHash,
        },
      });
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: u.id,
          roleId: participantRole.id,
        },
      },
      update: {},
      create: {
        userId: u.id,
        roleId: participantRole.id,
      },
    });

    if (p.profile) {
      await prisma.profile.upsert({
        where: { userId: u.id },
        update: {
          institution: p.profile.institution,
          academicLevel: p.profile.academicLevel,
          skills: p.profile.skills,
          bio: p.profile.bio,
          interests: p.profile.interests,
          experience: p.profile.experience,
          preferredChallenge: p.profile.preferredChallenge,
          teamStatus: p.profile.teamStatus,
          desiredRole: p.profile.desiredRole,
          isPublic: true,
        },
        create: {
          userId: u.id,
          institution: p.profile.institution,
          academicLevel: p.profile.academicLevel,
          skills: p.profile.skills,
          bio: p.profile.bio,
          interests: p.profile.interests,
          experience: p.profile.experience,
          preferredChallenge: p.profile.preferredChallenge,
          teamStatus: p.profile.teamStatus,
          desiredRole: p.profile.desiredRole,
          isPublic: true,
        },
      });
    }
  }

  console.log(`✅ Seeded ${extraParticipants.length} additional mock participants.`);
}
