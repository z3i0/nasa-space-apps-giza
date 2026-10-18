import { describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { publicProfile } from './public-profile.js';
import { ProfileService } from './profile.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Profile } from '@prisma/client';

describe('Profile validation and privacy', () => {
  it.each([
    { phone: '' }, { phone: '123' }, { phone: 'not a phone' }, { phone: null }, { phone: '+1234567890123456' },
    { name: '   ' }, { name: null }, { bio: 'x'.repeat(1001) },
    { skills: Array.from({length:51},(_,i)=>`skill ${i}`) }, { skills: ['  '] },
    { skills: ['Python','Python'] }, { skills: [1] }, { isPublic: 'true' },
    { hideFromSearch: null }, { githubUrl: 'javascript:alert(1)' },
    { teamStatus: 'admin' }, { expectedUpdatedAt: 'not a timestamp' },
  ])('rejects invalid payload %j', async payload => {
    expect((await validate(plainToInstance(UpdateProfileDto,payload))).length).toBeGreaterThan(0);
  });
  it('normalizes formatted and Arabic contact numbers', async () => {
    const dto = plainToInstance(UpdateProfileDto, { phone: '+٢٠ (١٠) ١٢٣٤-٥٦٧٨' });
    expect(await validate(dto)).toEqual([]);
    expect(dto.phone).toBe('+201012345678');
  });
  it('accepts clearing optional fields and trims input', async () => {
    const dto=plainToInstance(UpdateProfileDto,{name:' Amira ',bio:'',githubUrl:'',skills:[' Python '],hideFromSearch:true});
    expect(await validate(dto)).toEqual([]);
    expect(dto.name).toBe('Amira');expect(dto.skills).toEqual(['Python']);
  });
  it('never includes projects or contact URLs in public summaries',()=>{
    const profile={id:'p',isPublic:true,hideFromSearch:false,skills:['GIS'],experience:'private project',githubUrl:'https://example.test'} as Profile;
    expect(publicProfile(profile)).not.toHaveProperty('experience');
    expect(publicProfile(profile)).not.toHaveProperty('githubUrl');
    expect(publicProfile({...profile,hideFromSearch:true})).toBeNull();
    expect(publicProfile({...profile,isPublic:false})).toBeNull();
  });
  it('does not update account fields when an outdated profile edit conflicts',async()=>{
    const tx={user:{findUnique:vi.fn().mockResolvedValue({id:'u'}),update:vi.fn()},profile:{updateMany:vi.fn().mockResolvedValue({count:0})}};
    const prisma={$transaction:(fn:(client:typeof tx)=>unknown)=>fn(tx)};
    const service=new ProfileService(prisma as unknown as PrismaService);
    await expect(service.updateMyProfile('u',{name:'Changed',expectedUpdatedAt:'2026-10-17T10:00:00Z'})).rejects.toThrow('Profile changed');
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('filters hidden profiles from search and strips contact details',async()=>{
    const prisma={profile:{findMany:vi.fn().mockResolvedValue([{id:'p',userId:'u',skills:[],interests:[],user:{id:'u',name:'Public name',email:'private@example.test',phone:'secret'}}]),count:vi.fn().mockResolvedValue(1)}};
    const service=new ProfileService(prisma as unknown as PrismaService);
    const result=await service.searchProfiles({});
    expect(prisma.profile.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({isPublic:true,hideFromSearch:false})}));
    expect(result.items[0].user).not.toHaveProperty('email');
    expect(result.items[0].user).not.toHaveProperty('phone');
  });
});
