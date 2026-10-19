import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ChallengesService } from '../src/challenges/challenges.service.js';
import { TeamsService } from '../src/teams/teams.service.js';
import { ProfileService } from '../src/profile/profile.service.js';
import { SearchChallengesDto } from '../src/challenges/dto.js';
import catalogue from '../src/challenges/nasa-2026.json' with { type: 'json' };

describe('Official NASA catalogue (live PostgreSQL)', () => {
  const db = new PrismaService(), service = new ChallengesService(db), suffix = randomUUID();
  const users: string[] = [], teams: string[] = [], fixtures: string[] = [];
  afterAll(async () => {
    await db.team.deleteMany({where:{id:{in:teams}}});
    await db.challenge.deleteMany({where:{id:{in:fixtures}}});
    await db.user.deleteMany({where:{id:{in:users}}});
    await db.$disconnect();
  });
  it('exposes exactly the published NASA set and hides locally inserted custom records', async () => {
    const custom = await db.challenge.create({data:{slug:`custom-${suffix}`,title:'Unapproved custom challenge',summary:'custom',description:'custom',category:'custom',difficulty:'beginner',year:2026,isPublished:true}});
    fixtures.push(custom.id);
    const result = await service.list('reader',new SearchChallengesDto());
    expect(result.total).toBe(14);
    expect(result.items.map(item=>item.title).sort()).toEqual(catalogue.challenges.map(item=>item.title).sort());
    await expect(service.detail(custom.id,'reader')).rejects.toThrow('Challenge not found');
    await expect(service.favorite(custom.id,'reader',true)).rejects.toThrow('Challenge unavailable');
  });
  it('keeps favorites private and permits only the team leader to choose an official challenge', async () => {
    const [leader,member] = await Promise.all(['leader','member'].map(name=>db.user.create({data:{name,email:`${name}.${suffix}@official.test`,phone:'+201000000001'}})));
    users.push(leader.id,member.id);
    const official = await db.challenge.findUniqueOrThrow({where:{slug:catalogue.challenges[0].slug}});
    await service.favorite(official.id,leader.id,true);
    expect((await service.detail(official.id,leader.id)).saved).toBe(true);
    expect((await service.detail(official.id,member.id)).saved).toBe(false);
    const team = await db.team.create({data:{name:`NASA team ${suffix}`,createdById:leader.id,members:{create:[{userId:leader.id,role:'leader'},{userId:member.id,role:'member'}]}}});
    teams.push(team.id);
    await expect(service.select(official.id,member.id)).rejects.toThrow('Only the team leader');
    expect((await service.select(official.id,leader.id)).team.challenge).toBe(official.title);
    const outsider = await db.user.create({data:{name:'Outsider',email:`outsider.${suffix}@official.test`,phone:'+201000000001'}});users.push(outsider.id);
    await expect(new TeamsService(db).createTeam(outsider.id,{name:`Invalid ${suffix}`,challenge:'My invented challenge'})).rejects.toThrow('published NASA challenge');
    await expect(new ProfileService(db).updateMyProfile(outsider.id,{preferredChallenge:'My invented challenge'})).rejects.toThrow('published NASA challenge');
  });
  it('has no service methods for organizer authoring or reconciliation', () => {
    for(const method of ['create','update','archive','legacy']) expect(service).not.toHaveProperty(method);
  });
});
