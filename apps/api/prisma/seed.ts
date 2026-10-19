import {
  PrismaClient,
  TeamStatus,
  TeamMemberRole,
  TeamSubmissionStatus,
  TaskStatus,
  RequestStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedChallenges } from './seed-challenges.ts';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for auth & authorization...');

  // -------------------------------------------------------------
  // 0. Seed Official NASA Space Apps 2026 Challenges
  // -------------------------------------------------------------
  await seedChallenges(prisma);

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
    // ---------------------------------------------------------------
    // NEW TEST PARTICIPANTS (10 additional accounts)
    // ---------------------------------------------------------------
    {
      email: 'layla.backend@hackathon.local',
      username: 'layla_be',
      name: 'Layla Abdallah',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Cairo University',
        academicLevel: 'Senior (Year 4)',
        skills: ['Node.js', 'PostgreSQL', 'REST APIs', 'GraphQL', 'Docker'],
        bio: 'Backend specialist building scalable APIs for space data pipelines.',
        interests: ['Space Science', 'Cloud Computing', 'Data Engineering'],
        experience: 'Built NASA Open API wrappers used by 500+ developers.',
        preferredChallenge: 'Deep Space Communications',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Backend Developer',
        githubUrl: 'https://github.com/layla-abdallah',
        linkedinUrl: 'https://linkedin.com/in/layla-abdallah',
      },
    },
    {
      email: 'omar.ml@hackathon.local',
      username: 'omar_ml',
      name: 'Omar Fathy',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Nile University',
        academicLevel: 'Master Student',
        skills: ['Python', 'TensorFlow', 'Computer Vision', 'Deep Learning', 'NLP'],
        bio: 'ML researcher specializing in remote sensing image classification.',
        interests: ['Artificial Intelligence', 'Earth Observation', 'Satellite Imagery'],
        experience: 'Published paper on multi-spectral image segmentation at CVPR workshop.',
        preferredChallenge: 'Earth Observation & Climate Action',
        teamStatus: TeamStatus.want_to_create_team,
        desiredRole: 'ML Engineer',
        githubUrl: 'https://github.com/omar-fathy',
        linkedinUrl: 'https://linkedin.com/in/omar-fathy-ml',
      },
    },
    {
      email: 'hana.data@hackathon.local',
      username: 'hana_data',
      name: 'Hana Soliman',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Zewail City of Science',
        academicLevel: 'Junior (Year 3)',
        skills: ['Python', 'Pandas', 'Data Visualization', 'Jupyter', 'SQL'],
        bio: 'Data analyst turning raw telemetry into actionable insights.',
        interests: ['Data Science', 'Space Exploration', 'Astrophysics'],
        experience: 'Internship at Egyptian Space Agency analyzing CubeSat telemetry data.',
        preferredChallenge: 'Planetary Defense & Near-Earth Objects',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Data Analyst',
        githubUrl: 'https://github.com/hana-soliman',
      },
    },
    {
      email: 'ali.devops@hackathon.local',
      username: 'ali_devops',
      name: 'Ali Mostafa',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Mansoura University',
        academicLevel: 'Senior (Year 4)',
        skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Linux'],
        bio: 'DevOps engineer who makes sure code ships to the stars on time.',
        interests: ['Cloud Infrastructure', 'Automation', 'Space Systems'],
        experience: 'Managed CI/CD pipelines for 3 open-source satellite ground-station projects.',
        preferredChallenge: 'Deep Space Communications',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'DevOps Engineer',
        githubUrl: 'https://github.com/ali-mostafa-devops',
      },
    },
    {
      email: 'dina.mobile@hackathon.local',
      username: 'dina_mob',
      name: 'Dina Khaled',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Ain Shams University',
        academicLevel: 'Sophomore (Year 2)',
        skills: ['React Native', 'Flutter', 'TypeScript', 'Firebase'],
        bio: 'Mobile developer building citizen science apps for stargazers.',
        interests: ['Mobile Development', 'Citizen Science', 'Astronomy'],
        experience: 'Published a meteor shower tracking app with 10k+ downloads.',
        preferredChallenge: 'Space Exploration & Citizen Science',
        teamStatus: TeamStatus.want_to_create_team,
        desiredRole: 'Mobile Developer',
        githubUrl: 'https://github.com/dina-khaled',
        portfolioUrl: 'https://dinakhaled.dev',
      },
    },
    {
      email: 'mostafa.security@hackathon.local',
      username: 'mostafa_sec',
      name: 'Mostafa Ibrahim',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Military Technical College',
        academicLevel: 'Senior (Year 4)',
        skills: ['Cybersecurity', 'Cryptography', 'Python', 'Network Security', 'Rust'],
        bio: 'Security researcher securing satellite communication channels.',
        interests: ['Cybersecurity', 'Space Communications', 'Cryptography'],
        experience: 'CTF finalist at DEF CON 2025, researched satellite link encryption.',
        preferredChallenge: 'Deep Space Communications',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Security Engineer',
        githubUrl: 'https://github.com/mostafa-ibrahim-sec',
      },
    },
    {
      email: 'mona.3d@hackathon.local',
      username: 'mona_3d',
      name: 'Mona Adel',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Faculty of Fine Arts, Helwan University',
        academicLevel: 'Junior (Year 3)',
        skills: ['Three.js', 'Blender', 'WebGL', 'Unity', 'GLSL Shaders'],
        bio: '3D artist and creative coder bringing space environments to life in the browser.',
        interests: ['3D Visualization', 'Space Exploration', 'Creative Coding'],
        experience: 'Created interactive 3D solar system explorer featured on HN front page.',
        preferredChallenge: 'Space Exploration & Citizen Science',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: '3D / Creative Developer',
        portfolioUrl: 'https://mona-adel.art',
        githubUrl: 'https://github.com/mona-adel-3d',
      },
    },
    {
      email: 'ahmed.robotics@hackathon.local',
      username: 'ahmed_robo',
      name: 'Ahmed Gamal',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'AAST (Arab Academy for Science & Technology)',
        academicLevel: 'Senior (Year 4)',
        skills: ['ROS', 'C++', 'Python', 'SLAM', 'Computer Vision'],
        bio: 'Robotics engineer building autonomous rovers for planetary surface exploration.',
        interests: ['Robotics', 'Planetary Exploration', 'Autonomous Systems'],
        experience: 'Led university Mars rover team to top 10 at European Rover Challenge.',
        preferredChallenge: 'Planetary Defense & Near-Earth Objects',
        teamStatus: TeamStatus.want_to_create_team,
        desiredRole: 'Robotics Engineer',
        githubUrl: 'https://github.com/ahmed-gamal-robo',
        linkedinUrl: 'https://linkedin.com/in/ahmed-gamal-robotics',
      },
    },
    {
      email: 'fatima.pm@hackathon.local',
      username: 'fatima_pm',
      name: 'Fatima Zahra',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'British University in Egypt (BUE)',
        academicLevel: 'Junior (Year 3)',
        skills: ['Project Management', 'Agile', 'Jira', 'Documentation', 'Technical Writing'],
        bio: 'Organized project manager keeping hackathon teams on track and on scope.',
        interests: ['Project Management', 'Space Science', 'Technical Communication'],
        experience: 'Scrum master for 4 university capstone projects, certified PSM I.',
        preferredChallenge: 'Earth Observation & Climate Action',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Project Manager',
        linkedinUrl: 'https://linkedin.com/in/fatima-zahra-pm',
      },
    },
    {
      email: 'hassan.cloud@hackathon.local',
      username: 'hassan_cloud',
      name: 'Hassan Yousry',
      role: 'participant',
      password: 'ParticipantSecure2026!',
      profile: {
        institution: 'Suez Canal University',
        academicLevel: 'Master Student',
        skills: ['AWS', 'GCP', 'Terraform', 'Python', 'Serverless'],
        bio: 'Cloud architect designing resilient infrastructure for real-time space data.',
        interests: ['Cloud Architecture', 'Space Systems', 'Big Data'],
        experience: 'AWS Solutions Architect certified, built real-time earthquake alert pipeline.',
        preferredChallenge: 'Deep Space Communications',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Cloud Architect',
        githubUrl: 'https://github.com/hassan-yousry',
        linkedinUrl: 'https://linkedin.com/in/hassan-yousry-cloud',
      },
    },
    // Second Judge & Second Mentor
    {
      email: 'judge2@hackathon.local',
      username: 'judge2',
      name: 'Dr. Amira Shawkat',
      role: 'judge',
      password: 'JudgeSecure2026!',
    },
    {
      email: 'mentor2@hackathon.local',
      username: 'mentor2',
      name: 'Dr. Khaled Mahmoud',
      role: 'mentor',
      password: 'MentorSecure2026!',
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

  // -------------------------------------------------------------
  // 4. Seed Competition Teams & Tasks
  // -------------------------------------------------------------
  console.log('🚀 Seeding Teams, Members, Tasks, and Invitations...');

  const tarekUser = await prisma.user.findUnique({ where: { email: 'tarek.leader@hackathon.local' } });
  const kareemUser = await prisma.user.findUnique({ where: { email: 'kareem.hardware@hackathon.local' } });
  const rafeUser = await prisma.user.findUnique({ where: { email: 'participant@hackathon.local' } });
  const sarahUser = await prisma.user.findUnique({ where: { email: 'sarah.frontend@hackathon.local' } });
  const youssefUser = await prisma.user.findUnique({ where: { email: 'youssef.uiux@hackathon.local' } });

  if (tarekUser && kareemUser) {
    const teamNebula = await prisma.team.upsert({
      where: { name: 'Nebula Explorers' },
      update: {
        description: 'Tracking near-Earth asteroids and computing orbital impact risk.',
        challenge: 'Planetary Defense & Near-Earth Objects',
        track: 'astrophysics',
        submissionStatus: TeamSubmissionStatus.draft,
      },
      create: {
        name: 'Nebula Explorers',
        description: 'Tracking near-Earth asteroids and computing orbital impact risk.',
        challenge: 'Planetary Defense & Near-Earth Objects',
        track: 'astrophysics',
        createdById: tarekUser.id,
        submissionStatus: TeamSubmissionStatus.draft,
      },
    });

    // Seed Team Members
    await prisma.teamMember.upsert({
      where: { userId: tarekUser.id },
      update: { teamId: teamNebula.id, role: TeamMemberRole.leader, assignedRole: 'Team Captain & Full Stack' },
      create: { teamId: teamNebula.id, userId: tarekUser.id, role: TeamMemberRole.leader, assignedRole: 'Team Captain & Full Stack' },
    });

    await prisma.teamMember.upsert({
      where: { userId: kareemUser.id },
      update: { teamId: teamNebula.id, role: TeamMemberRole.member, assignedRole: 'Hardware & Sensor Engineer' },
      create: { teamId: teamNebula.id, userId: kareemUser.id, role: TeamMemberRole.member, assignedRole: 'Hardware & Sensor Engineer' },
    });

    // Update Kareem's profile to already_have_team
    await prisma.profile.updateMany({
      where: { userId: kareemUser.id },
      data: { teamStatus: TeamStatus.already_have_team },
    });

    // Seed Tasks
    const existingTask = await prisma.teamTask.findFirst({
      where: { teamId: teamNebula.id, title: 'NASA CNEOS API Pipeline' },
    });
    if (!existingTask) {
      await prisma.teamTask.createMany({
        data: [
          {
            teamId: teamNebula.id,
            title: 'NASA CNEOS API Pipeline',
            description: 'Fetch and parse daily close-approach orbital records.',
            status: TaskStatus.completed,
            assignedToId: tarekUser.id,
          },
          {
            teamId: teamNebula.id,
            title: 'Orbital Trajectory Simulation',
            description: 'Run 3D trajectory simulations for potential Earth impactors.',
            status: TaskStatus.in_progress,
            assignedToId: kareemUser.id,
          },
          {
            teamId: teamNebula.id,
            title: 'Final Pitch Presentation Deck',
            description: 'Design presentation slides and record demonstration video.',
            status: TaskStatus.not_started,
          },
        ],
      });
    }

    console.log(`✅ Seeded team: Nebula Explorers (2 members, 3 tasks)`);
  }

  if (rafeUser && sarahUser && youssefUser) {
    const teamEarth = await prisma.team.upsert({
      where: { name: 'Earth Sentinel' },
      update: {
        description: 'AI-powered flood detection and early alert system using Sentinel-2 imagery.',
        challenge: 'Earth Observation & Climate Action',
        track: 'earthScience',
        submissionStatus: TeamSubmissionStatus.not_started,
      },
      create: {
        name: 'Earth Sentinel',
        description: 'AI-powered flood detection and early alert system using Sentinel-2 imagery.',
        challenge: 'Earth Observation & Climate Action',
        track: 'earthScience',
        createdById: rafeUser.id,
        submissionStatus: TeamSubmissionStatus.not_started,
      },
    });

    // Rafe is leader
    await prisma.teamMember.upsert({
      where: { userId: rafeUser.id },
      update: { teamId: teamEarth.id, role: TeamMemberRole.leader, assignedRole: 'AI & Data Lead' },
      create: { teamId: teamEarth.id, userId: rafeUser.id, role: TeamMemberRole.leader, assignedRole: 'AI & Data Lead' },
    });

    await prisma.profile.updateMany({
      where: { userId: rafeUser.id },
      data: { teamStatus: TeamStatus.already_have_team },
    });

    // Seed Invitation to Sarah Mansour
    await prisma.teamInvitation.upsert({
      where: { teamId_invitedUserId: { teamId: teamEarth.id, invitedUserId: sarahUser.id } },
      update: { status: RequestStatus.pending },
      create: { teamId: teamEarth.id, invitedUserId: sarahUser.id, invitedByUserId: rafeUser.id, status: RequestStatus.pending },
    });

    // Seed Join Request from Youssef El-Sayed
    await prisma.teamJoinRequest.upsert({
      where: { teamId_userId: { teamId: teamEarth.id, userId: youssefUser.id } },
      update: { message: 'Hey! Loved your idea, I have the UI/UX mockups ready for Sentinel data.', status: RequestStatus.pending },
      create: {
        teamId: teamEarth.id,
        userId: youssefUser.id,
        message: 'Hey! Loved your idea, I have the UI/UX mockups ready for Sentinel data.',
        status: RequestStatus.pending,
      },
    });

    // Seed Tasks
    const existingTask2 = await prisma.teamTask.findFirst({
      where: { teamId: teamEarth.id, title: 'Train Flood Segmentation Model' },
    });
    if (!existingTask2) {
      await prisma.teamTask.createMany({
        data: [
          {
            teamId: teamEarth.id,
            title: 'Train Flood Segmentation Model',
            description: 'U-Net architecture with PyTorch trained on EuroSAT & Sentinel-2.',
            status: TaskStatus.in_progress,
            assignedToId: rafeUser.id,
          },
          {
            teamId: teamEarth.id,
            title: 'Design Dashboard UI and Map Viewer',
            description: 'Mapbox GL integration showing live flooded areas and confidence masks.',
            status: TaskStatus.not_started,
          },
        ],
      });
    }

    console.log(`✅ Seeded team: Earth Sentinel (1 leader, 1 pending invitation, 1 join request, 2 tasks)`);
  }

  // ---------------------------------------------------------------
  // TEAM 3 – Deep Signal Corps  (Deep Space Communications track)
  // ---------------------------------------------------------------
  const laylaUser  = await prisma.user.findUnique({ where: { email: 'layla.backend@hackathon.local' } });
  const aliUser    = await prisma.user.findUnique({ where: { email: 'ali.devops@hackathon.local' } });
  const mostafaUser = await prisma.user.findUnique({ where: { email: 'mostafa.security@hackathon.local' } });
  const hassanUser = await prisma.user.findUnique({ where: { email: 'hassan.cloud@hackathon.local' } });

  if (laylaUser && aliUser && mostafaUser && hassanUser) {
    const teamSignal = await prisma.team.upsert({
      where: { name: 'Deep Signal Corps' },
      update: {
        description: 'Building a fault-tolerant relay protocol for deep-space probe telemetry.',
        challenge: 'Deep Space Communications',
        track: 'communications',
        submissionStatus: TeamSubmissionStatus.draft,
      },
      create: {
        name: 'Deep Signal Corps',
        description: 'Building a fault-tolerant relay protocol for deep-space probe telemetry.',
        challenge: 'Deep Space Communications',
        track: 'communications',
        createdById: laylaUser.id,
        maxMembers: 5,
        submissionStatus: TeamSubmissionStatus.draft,
      },
    });

    // Layla = leader, Ali = member, Mostafa = member
    await prisma.teamMember.upsert({
      where: { userId: laylaUser.id },
      update: { teamId: teamSignal.id, role: TeamMemberRole.leader, assignedRole: 'Backend & Protocol Lead' },
      create: { teamId: teamSignal.id, userId: laylaUser.id, role: TeamMemberRole.leader, assignedRole: 'Backend & Protocol Lead' },
    });
    await prisma.teamMember.upsert({
      where: { userId: aliUser.id },
      update: { teamId: teamSignal.id, role: TeamMemberRole.member, assignedRole: 'DevOps & Infrastructure' },
      create: { teamId: teamSignal.id, userId: aliUser.id, role: TeamMemberRole.member, assignedRole: 'DevOps & Infrastructure' },
    });
    await prisma.teamMember.upsert({
      where: { userId: mostafaUser.id },
      update: { teamId: teamSignal.id, role: TeamMemberRole.member, assignedRole: 'Security & Encryption' },
      create: { teamId: teamSignal.id, userId: mostafaUser.id, role: TeamMemberRole.member, assignedRole: 'Security & Encryption' },
    });

    // Update profiles to already_have_team
    await prisma.profile.updateMany({ where: { userId: { in: [laylaUser.id, aliUser.id, mostafaUser.id] } }, data: { teamStatus: TeamStatus.already_have_team } });

    // Hassan wants to join
    await prisma.teamJoinRequest.upsert({
      where: { teamId_userId: { teamId: teamSignal.id, userId: hassanUser.id } },
      update: { message: 'I can set up the full AWS ground-station relay infra. Let me in!', status: RequestStatus.pending },
      create: { teamId: teamSignal.id, userId: hassanUser.id, message: 'I can set up the full AWS ground-station relay infra. Let me in!', status: RequestStatus.pending },
    });

    // Invitation to Nour for pitching
    const nourUser = await prisma.user.findUnique({ where: { email: 'nour.biz@hackathon.local' } });
    if (nourUser) {
      await prisma.teamInvitation.upsert({
        where: { teamId_invitedUserId: { teamId: teamSignal.id, invitedUserId: nourUser.id } },
        update: { status: RequestStatus.pending },
        create: { teamId: teamSignal.id, invitedUserId: nourUser.id, invitedByUserId: laylaUser.id, status: RequestStatus.pending },
      });
    }

    // Tasks
    const existingTask3 = await prisma.teamTask.findFirst({ where: { teamId: teamSignal.id, title: 'Design Relay Protocol Spec' } });
    if (!existingTask3) {
      await prisma.teamTask.createMany({
        data: [
          { teamId: teamSignal.id, title: 'Design Relay Protocol Spec', description: 'Write IETF-style specification for the fault-tolerant relay protocol.', status: TaskStatus.completed, assignedToId: laylaUser.id },
          { teamId: teamSignal.id, title: 'Set Up Kubernetes Cluster', description: 'Deploy k8s cluster simulating multi-hop relay nodes.', status: TaskStatus.in_progress, assignedToId: aliUser.id },
          { teamId: teamSignal.id, title: 'Implement AES-256-GCM Channel Encryption', description: 'End-to-end encryption layer for simulated deep-space links.', status: TaskStatus.in_progress, assignedToId: mostafaUser.id },
          { teamId: teamSignal.id, title: 'Write Project Documentation', description: 'README, architecture diagrams, and API docs.', status: TaskStatus.not_started },
        ],
      });
    }

    console.log(`✅ Seeded team: Deep Signal Corps (3 members, 1 join request, 1 invitation, 4 tasks)`);
  }

  // ---------------------------------------------------------------
  // TEAM 4 – Cosmos Cartographers  (Earth Observation track, submitted)
  // ---------------------------------------------------------------
  const omarUser   = await prisma.user.findUnique({ where: { email: 'omar.ml@hackathon.local' } });
  const fatimaUser = await prisma.user.findUnique({ where: { email: 'fatima.pm@hackathon.local' } });

  if (omarUser && fatimaUser && sarahUser) {
    const teamCosmos = await prisma.team.upsert({
      where: { name: 'Cosmos Cartographers' },
      update: {
        description: 'Mapping global deforestation in near-real-time with ML on Landsat imagery.',
        challenge: 'Earth Observation & Climate Action',
        track: 'earthScience',
        submissionStatus: TeamSubmissionStatus.submitted,
      },
      create: {
        name: 'Cosmos Cartographers',
        description: 'Mapping global deforestation in near-real-time with ML on Landsat imagery.',
        challenge: 'Earth Observation & Climate Action',
        track: 'earthScience',
        createdById: omarUser.id,
        maxMembers: 4,
        submissionStatus: TeamSubmissionStatus.submitted,
      },
    });

    // Omar = leader, Fatima = member
    await prisma.teamMember.upsert({
      where: { userId: omarUser.id },
      update: { teamId: teamCosmos.id, role: TeamMemberRole.leader, assignedRole: 'ML & Data Lead' },
      create: { teamId: teamCosmos.id, userId: omarUser.id, role: TeamMemberRole.leader, assignedRole: 'ML & Data Lead' },
    });
    await prisma.teamMember.upsert({
      where: { userId: fatimaUser.id },
      update: { teamId: teamCosmos.id, role: TeamMemberRole.member, assignedRole: 'Project Manager & Docs' },
      create: { teamId: teamCosmos.id, userId: fatimaUser.id, role: TeamMemberRole.member, assignedRole: 'Project Manager & Docs' },
    });

    await prisma.profile.updateMany({ where: { userId: { in: [omarUser.id, fatimaUser.id] } }, data: { teamStatus: TeamStatus.already_have_team } });

    // Tasks (fully submitted project – all completed)
    const existingTask4 = await prisma.teamTask.findFirst({ where: { teamId: teamCosmos.id, title: 'Train Deforestation Classifier' } });
    if (!existingTask4) {
      await prisma.teamTask.createMany({
        data: [
          { teamId: teamCosmos.id, title: 'Train Deforestation Classifier', description: 'ResNet-50 fine-tuned on Global Forest Change dataset.', status: TaskStatus.completed, assignedToId: omarUser.id },
          { teamId: teamCosmos.id, title: 'Build Interactive Map Dashboard', description: 'Leaflet dashboard showing forest loss heat-maps by year.', status: TaskStatus.completed, assignedToId: fatimaUser.id },
          { teamId: teamCosmos.id, title: 'Record Demo Video & Pitch', description: '3-minute video walkthrough for judges.', status: TaskStatus.completed, assignedToId: fatimaUser.id },
        ],
      });
    }

    console.log(`✅ Seeded team: Cosmos Cartographers (2 members, 3 tasks, SUBMITTED)`);
  }

  // ---------------------------------------------------------------
  // TEAM 5 – StarGaze Collective  (Space Exploration / Citizen Science)
  // ---------------------------------------------------------------
  const dinaUser   = await prisma.user.findUnique({ where: { email: 'dina.mobile@hackathon.local' } });
  const monaUser   = await prisma.user.findUnique({ where: { email: 'mona.3d@hackathon.local' } });
  const ahmedUser  = await prisma.user.findUnique({ where: { email: 'ahmed.robotics@hackathon.local' } });
  const hanaUser   = await prisma.user.findUnique({ where: { email: 'hana.data@hackathon.local' } });

  if (dinaUser && monaUser && ahmedUser) {
    const teamStarGaze = await prisma.team.upsert({
      where: { name: 'StarGaze Collective' },
      update: {
        description: 'Crowdsourced light-pollution mapping app with 3D sky visualization.',
        challenge: 'Space Exploration & Citizen Science',
        track: 'citizenScience',
        submissionStatus: TeamSubmissionStatus.not_started,
      },
      create: {
        name: 'StarGaze Collective',
        description: 'Crowdsourced light-pollution mapping app with 3D sky visualization.',
        challenge: 'Space Exploration & Citizen Science',
        track: 'citizenScience',
        createdById: dinaUser.id,
        maxMembers: 5,
        submissionStatus: TeamSubmissionStatus.not_started,
      },
    });

    // Dina = leader, Mona = member
    await prisma.teamMember.upsert({
      where: { userId: dinaUser.id },
      update: { teamId: teamStarGaze.id, role: TeamMemberRole.leader, assignedRole: 'Mobile & App Lead' },
      create: { teamId: teamStarGaze.id, userId: dinaUser.id, role: TeamMemberRole.leader, assignedRole: 'Mobile & App Lead' },
    });
    await prisma.teamMember.upsert({
      where: { userId: monaUser.id },
      update: { teamId: teamStarGaze.id, role: TeamMemberRole.member, assignedRole: '3D Visualization' },
      create: { teamId: teamStarGaze.id, userId: monaUser.id, role: TeamMemberRole.member, assignedRole: '3D Visualization' },
    });

    await prisma.profile.updateMany({ where: { userId: { in: [dinaUser.id, monaUser.id] } }, data: { teamStatus: TeamStatus.already_have_team } });

    // Ahmed sent a join request
    await prisma.teamJoinRequest.upsert({
      where: { teamId_userId: { teamId: teamStarGaze.id, userId: ahmedUser.id } },
      update: { message: 'I can integrate hardware sensors for real SQM sky-quality readings!', status: RequestStatus.pending },
      create: { teamId: teamStarGaze.id, userId: ahmedUser.id, message: 'I can integrate hardware sensors for real SQM sky-quality readings!', status: RequestStatus.pending },
    });

    // Invitation to Hana for data analysis
    if (hanaUser) {
      await prisma.teamInvitation.upsert({
        where: { teamId_invitedUserId: { teamId: teamStarGaze.id, invitedUserId: hanaUser.id } },
        update: { status: RequestStatus.pending },
        create: { teamId: teamStarGaze.id, invitedUserId: hanaUser.id, invitedByUserId: dinaUser.id, status: RequestStatus.pending },
      });
    }

    // Tasks
    const existingTask5 = await prisma.teamTask.findFirst({ where: { teamId: teamStarGaze.id, title: 'Build React Native App Shell' } });
    if (!existingTask5) {
      await prisma.teamTask.createMany({
        data: [
          { teamId: teamStarGaze.id, title: 'Build React Native App Shell', description: 'Navigation, auth, and camera integration for sky photos.', status: TaskStatus.in_progress, assignedToId: dinaUser.id },
          { teamId: teamStarGaze.id, title: 'Create 3D Night Sky Renderer', description: 'Three.js scene with star catalog and constellation overlays.', status: TaskStatus.in_progress, assignedToId: monaUser.id },
          { teamId: teamStarGaze.id, title: 'Design Light Pollution Heatmap', description: 'Aggregate crowd-sourced readings into interactive map tiles.', status: TaskStatus.not_started },
          { teamId: teamStarGaze.id, title: 'Prepare Submission Package', description: 'Screenshots, README, and 30-second demo GIF.', status: TaskStatus.not_started },
        ],
      });
    }

    console.log(`✅ Seeded team: StarGaze Collective (2 members, 1 join request, 1 invitation, 4 tasks)`);
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
