import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const base = new URL(process.env.DATABASE_URL);
if (process.env.NODE_ENV === 'production' || !['localhost','127.0.0.1','[::1]'].includes(base.hostname))
  throw new Error('Database upgrade smoke tests require a local development database.');
const admin = new PrismaClient();
const cwd = fileURLToPath(new URL('..', import.meta.url));
function run(args, url) {
  const result = spawnSync(process.execPath, args, {cwd,env:{...process.env,DATABASE_URL:url},encoding:'utf8',timeout:120000});
  assert.equal(result.status, 0, result.stderr || result.stdout || 'Database command failed');
}
try {
  for (const mode of ['fresh','catalogue']) {
    const schema = `integration_${randomUUID().replaceAll('-','')}`;
    assert.match(schema, /^integration_[a-f0-9]{32}$/);
    const url = new URL(base); url.searchParams.set('schema',schema);
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const db = new PrismaClient({datasources:{db:{url:url.href}}});
    try {
      if (mode === 'catalogue') {
        run(['node_modules/prisma/build/index.js','db','push','--schema','test/fixtures/pre-integration.prisma','--skip-generate'],url.href);
        await db.user.create({data:{id:'integration-organizer',name:'Integration Organizer',email:'integration@example.invalid',role:'organizer'}});
        await db.$executeRaw`INSERT INTO challenges (id,slug,title_en,title_ar,description_en,description_ar,tagline_en,subjects,updated_at) VALUES ('integration-challenge','integration-challenge','Preserved challenge','Arabic title','Preserved description','Arabic description','Preserved summary',ARRAY['space'],NOW())`;
        await db.$executeRaw`INSERT INTO challenge_resources (id,challenge_id,title_en,title_ar,url,updated_at) VALUES ('integration-resource','integration-challenge','Preserved resource','Arabic resource','https://example.invalid/data',NOW())`;
      }
      run(['prisma/update-database.mjs'],url.href);
      assert.equal(await db.challenge.count({where:{isPublished:true,isArchived:false,isDemo:false}}),14);
      if (mode === 'catalogue') {
        const challenge = await db.challenge.findUniqueOrThrow({where:{id:'integration-challenge'},include:{resources:true}});
        assert.equal(challenge.title,'Preserved challenge');
        assert.equal(challenge.isPublished,false);
        assert.equal(challenge.isArchived,true);
        assert.equal(challenge.summary,'Preserved summary');
        assert.equal(challenge.createdById,'integration-organizer');
        assert.equal(challenge.resources[0].label,'Preserved resource');
        assert.equal(challenge.resources[0].titleAr,'Arabic resource');
        assert.equal(await db.user.count(),1);
      }
      run(['prisma/update-database.mjs'],url.href);
      run(['node_modules/prisma/build/index.js','migrate','status'],url.href);
      console.log(`PASS ${mode}: upgrade, data preservation, repeat run and migration status`);
    } finally {
      await db.$disconnect();
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
  }
} finally { await admin.$disconnect(); }
