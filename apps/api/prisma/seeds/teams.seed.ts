import {
  PrismaClient,
  TeamStatus,
  TeamMemberRole,
  TeamSubmissionStatus,
  TaskStatus,
  RequestStatus,
} from '@prisma/client';

export async function seedTeams(prisma: PrismaClient) {
  console.log('🚀 Seeding Competition Teams, Members, and Tasks...');

  const tarekUser = await prisma.user.findUnique({ where: { email: 'tarek.leader@hackathon.local' } });
  const kareemUser = await prisma.user.findUnique({ where: { email: 'kareem.hardware@hackathon.local' } });
  const participantUser = await prisma.user.findUnique({ where: { email: 'participant@hackathon.local' } });
  const sarahUser = await prisma.user.findUnique({ where: { email: 'sarah.frontend@hackathon.local' } });
  const youssefUser = await prisma.user.findUnique({ where: { email: 'youssef.uiux@hackathon.local' } });

  // 1. Team Nebula Explorers
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

    await prisma.profile.updateMany({
      where: { userId: kareemUser.id },
      data: { teamStatus: TeamStatus.already_have_team },
    });

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
        ],
      });
    }

    console.log(`✅ Seeded team: Nebula Explorers`);
  }

  // 2. Team Earth Sentinel
  if (participantUser && sarahUser && youssefUser) {
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
        createdById: participantUser.id,
        submissionStatus: TeamSubmissionStatus.not_started,
      },
    });

    await prisma.teamMember.upsert({
      where: { userId: participantUser.id },
      update: { teamId: teamEarth.id, role: TeamMemberRole.leader, assignedRole: 'AI & Data Lead' },
      create: { teamId: teamEarth.id, userId: participantUser.id, role: TeamMemberRole.leader, assignedRole: 'AI & Data Lead' },
    });

    await prisma.profile.updateMany({
      where: { userId: participantUser.id },
      data: { teamStatus: TeamStatus.already_have_team },
    });

    await prisma.teamInvitation.upsert({
      where: {
        teamId_invitedUserId: {
          teamId: teamEarth.id,
          invitedUserId: sarahUser.id,
        },
      },
      update: { status: RequestStatus.pending },
      create: {
        teamId: teamEarth.id,
        invitedUserId: sarahUser.id,
        invitedByUserId: participantUser.id,
        status: RequestStatus.pending,
      },
    });

    await prisma.teamJoinRequest.upsert({
      where: {
        teamId_userId: {
          teamId: teamEarth.id,
          userId: youssefUser.id,
        },
      },
      update: {
        message: 'Hi team! I can design the full UI/UX and flood alert dashboard in Figma.',
        status: RequestStatus.pending,
      },
      create: {
        teamId: teamEarth.id,
        userId: youssefUser.id,
        message: 'Hi team! I can design the full UI/UX and flood alert dashboard in Figma.',
        status: RequestStatus.pending,
      },
    });

    const existingTask = await prisma.teamTask.findFirst({
      where: { teamId: teamEarth.id, title: 'Train Flood Segmentation Model' },
    });
    if (!existingTask) {
      await prisma.teamTask.createMany({
        data: [
          {
            teamId: teamEarth.id,
            title: 'Train Flood Segmentation Model',
            description: 'U-Net architecture with PyTorch trained on EuroSAT & Sentinel-2.',
            status: TaskStatus.in_progress,
            assignedToId: participantUser.id,
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

    console.log(`✅ Seeded team: Earth Sentinel`);
  }
}
