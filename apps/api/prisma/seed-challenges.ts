import type { PrismaClient } from '@prisma/client';
// NASA's published catalogue is the sole source; there are no local drafts.
export async function seedChallenges(prisma: PrismaClient, _organizerId?: string) {
  const { syncOfficialCatalogue } = await import('./official-catalogue.mjs');
  return syncOfficialCatalogue(prisma);
}
