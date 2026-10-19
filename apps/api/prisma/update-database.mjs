// Upgrade databases previously managed by either branch's `prisma db push`.
// Refuse plans that would remove stored data; baseline the repository history
// after alignment (older history predates the profile/team schema).
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { syncOfficialCatalogue } from './official-catalogue.mjs';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
function prisma(args, input) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd, env: process.env, input, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(result.stderr || result.error?.message || 'Prisma command failed');
  return result.stdout;
}
const db = new PrismaClient();
const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema') || 'public';
try {
  const exists = async (table) => (await db.$queryRaw`SELECT to_regclass(${`"${schema.replaceAll('"','""')}"."${table}"`})::text AS name`)[0].name !== null;
  const initialized = await exists('users');
  {
    const columns = async (table) => new Set((await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = ${table}`).map(r => r.column_name));
    if (await exists('challenges')) {
      const cols = await columns('challenges');
      if (cols.has('title_en') && !cols.has('title')) {
        // The incoming catalogue uses these names for the same stored content.
        const organizer = await db.user.findFirst({ where: { role: 'organizer', deletedAt: null }, select: { id: true } });
        const count = await db.$queryRaw`SELECT count(*)::int AS count FROM challenges`;
        if (!organizer && count[0].count) throw new Error('An organizer account is required to retain ownership of existing challenges.');
        await db.$transaction(async tx => {
          for (const [from, to] of [['title_en','title'],['tagline_en','summary'],['tagline_ar','summary_ar'],['description_en','description'],['nasa_original_url','source_url'],['is_active','is_published']]) {
            if (cols.has(from) && !cols.has(to)) await tx.$executeRawUnsafe(`ALTER TABLE "challenges" RENAME COLUMN "${from}" TO "${to}"`);
          }
          await tx.$executeRawUnsafe('ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "summary" TEXT, ADD COLUMN IF NOT EXISTS "category" TEXT, ADD COLUMN IF NOT EXISTS "created_by_id" TEXT');
          await tx.$executeRawUnsafe("UPDATE challenges SET summary = COALESCE(summary, left(description, 500), title), category = COALESCE(category, subjects[1], 'Space science')");
          if (organizer) await tx.$executeRaw`UPDATE challenges SET created_by_id = ${organizer.id} WHERE created_by_id IS NULL`;
          if (await exists('challenge_resources')) {
            const resourceCols = await columns('challenge_resources');
            for (const [from, to] of [['title_en','label'],['order','position']]) {
              if (resourceCols.has(from) && !resourceCols.has(to)) await tx.$executeRawUnsafe(`ALTER TABLE "challenge_resources" RENAME COLUMN "${from}" TO "${to}"`);
            }
          }
        });
        console.log('Preserved and normalized the incoming challenge catalogue.');
      }
    }
    const plan = prisma(['migrate','diff',...(initialized ? ['--from-schema-datasource','prisma/schema.prisma'] : ['--from-empty']),'--to-schema-datamodel','prisma/schema.prisma','--script']);
    if (/\bDROP\s+(?:TABLE|COLUMN|TYPE|SCHEMA)\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i.test(plan))
      throw new Error('Database update stopped: the generated plan would remove data. Review the schema differences before continuing.');
    const checks = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'challenges'::regclass AND conname = 'challenges_year_check') THEN
    ALTER TABLE challenges ADD CONSTRAINT challenges_year_check CHECK (year BETWEEN 2000 AND 2100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'mentor_slots'::regclass AND conname = 'mentor_slots_time_order_check') THEN
    ALTER TABLE mentor_slots ADD CONSTRAINT mentor_slots_time_order_check CHECK (end_time > start_time);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'role_applications'::regclass AND conname = 'role_applications_role_check') THEN
    ALTER TABLE role_applications ADD CONSTRAINT role_applications_role_check CHECK (role IN ('mentor','judge'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'role_applications'::regclass AND conname = 'role_applications_status_check') THEN
    ALTER TABLE role_applications ADD CONSTRAINT role_applications_status_check CHECK (status IN ('pending','approved','rejected'));
  END IF;
END $$;`;
    prisma(['db','execute','--stdin','--schema','prisma/schema.prisma'], `BEGIN;\n${plan}\n${checks}\nCOMMIT;`);
    // These databases were managed by db push. Once aligned, baseline the history
    // so future migrate deploy calls do not try to recreate existing tables.
    const applied = await exists('_prisma_migrations')
      ? await db.$queryRawUnsafe('SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations') : [];
    if (applied.some(row => !row.finished_at && !row.rolled_back_at)) throw new Error('Resolve the previously failed database migration before baselining.');
    const names = new Set(applied.filter(row => row.finished_at).map(row => row.migration_name));
    for (const folder of readdirSync(new URL('./migrations/', import.meta.url), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()) {
      if (!names.has(folder)) prisma(['migrate','resolve','--applied',folder]);
    }
  }
  const catalogue = await syncOfficialCatalogue(db);
  console.log(`Database updated; ${catalogue.count} published NASA challenges synchronized. Accounts, teams, submissions and conversations retained.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
