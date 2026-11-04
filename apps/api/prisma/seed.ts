import { PrismaClient } from '@prisma/client';
import { seedEssential } from './seeds/essential.seed.ts';
import { seedMockParticipants } from './seeds/mock-participants.seed.ts';
import { seedTeams } from './seeds/teams.seed.ts';
import { seedCommunity } from './seeds/community.seed.ts';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all') || process.env.SEED_ALL === 'true';
  const isTeams = isAll || args.includes('--teams') || process.env.SEED_TEAMS === 'true';
  const isCommunity = isAll || args.includes('--community') || process.env.SEED_COMMUNITY === 'true';
  const isParticipants = isAll || isTeams || args.includes('--participants') || process.env.SEED_PARTICIPANTS === 'true';

  console.log('\n======================================================');
  console.log('🌱 NASA Space Apps Giza Database Seeder');
  console.log('======================================================');

  // 1. Always run Essential Seeds
  await seedEssential(prisma);

  // 2. Optional: Mock Participants
  if (isParticipants) {
    console.log('\n------------------------------------------------------');
    await seedMockParticipants(prisma);
  }

  // 3. Optional: Teams & Tasks
  if (isTeams) {
    console.log('\n------------------------------------------------------');
    await seedTeams(prisma);
  }

  // 4. Optional: Community Q&A & Feed
  if (isCommunity) {
    console.log('\n------------------------------------------------------');
    await seedCommunity(prisma);
  }

  console.log('\n======================================================');
  console.log('✨ Seeding finished successfully!');
  if (!isAll && !isTeams && !isCommunity && !isParticipants) {
    console.log('💡 Note: Only essential data was seeded (Roles, Challenges, Core Accounts).');
    console.log('   To seed additional modules, run:');
    console.log('   - pnpm prisma:seed --all          (Seed everything)');
    console.log('   - pnpm prisma:seed --community    (Essential + Community Q&A & Posts)');
    console.log('   - pnpm prisma:seed --teams        (Essential + Teams, Members & Tasks)');
    console.log('   - pnpm prisma:seed --participants (Essential + Extra Mock Participants)');
  }
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
