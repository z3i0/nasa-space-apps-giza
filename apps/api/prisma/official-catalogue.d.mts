import type { PrismaClient } from '@prisma/client';
export function syncOfficialCatalogue(db: PrismaClient): Promise<{ count: number }>;
