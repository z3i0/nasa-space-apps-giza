import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { ProfileService } from '../src/profile/profile.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TeamStatus } from '@prisma/client';
import type { INestApplicationContext } from '@nestjs/common';

describe('Profile & Registration Integration Flow (Live DB)', () => {
  let app: INestApplicationContext;
  let authService: AuthService;
  let profileService: ProfileService;
  let prisma: PrismaService;

  const testEmail = `test.pilot.${Date.now()}@hackathon.local`;
  let registeredUserId: string;
  let registeredProfileId: string;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    authService = app.get(AuthService);
    profileService = app.get(ProfileService);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (registeredUserId) {
      await prisma.user.deleteMany({
        where: { id: registeredUserId },
      });
    }
    await app.close();
  });

  it('1. Registers participant with full profile data', async () => {
    const regResult = await authService.register({
      name: 'Layla Commander',
      email: testEmail,
      password: 'SecurePassword2026!',
      phone: '+201099998888',
      institution: 'Cairo University',
      academicLevel: 'Junior (Year 3)',
      skills: ['Python', 'Deep Learning', 'PyTorch'],
      bio: 'Astrophysics enthusiast working on exoplanet detection.',
      interests: ['Deep Space Exploration', 'Exoplanets', 'Data Science'],
      experience: 'Winner of NASA Space Apps 2024 local event.',
      preferredChallenge: 'Earth Observation & Climate Action',
      teamStatus: TeamStatus.want_to_join_team,
      desiredRole: 'Data Scientist',
      githubUrl: 'https://github.com/layla-space',
    });

    expect(regResult.user.id).toBeDefined();
    registeredUserId = regResult.user.id;
    expect(regResult.user.email).toBe(testEmail);
    expect(regResult.tokens.accessToken).toBeDefined();
    expect(regResult.user.profile).toBeDefined();
    expect(regResult.user.profile?.institution).toBe('Cairo University');
  });

  it('2. Retrieves user profile with getMyProfile', async () => {
    const profile = await profileService.getMyProfile(registeredUserId);
    expect(profile).toBeDefined();
    expect(profile.skills).toEqual(['Python', 'Deep Learning', 'PyTorch']);
    expect(profile.teamStatus).toBe(TeamStatus.want_to_join_team);
    expect(profile.user?.phone).toBe('+201099998888');
    registeredProfileId = profile.id;
  });

  it('3. Updates profile and user account fields with updateMyProfile', async () => {
    const updated = await profileService.updateMyProfile(registeredUserId, {
      name: 'Layla Commander (Updated)',
      skills: ['Python', 'Deep Learning', 'PyTorch', 'TensorFlow', 'OpenCV'],
      bio: 'Updated bio: Leading AI investigations for Space Apps 2026.',
      teamStatus: TeamStatus.want_to_create_team,
      desiredRole: 'AI & Data Lead',
    });

    expect(updated.user?.name).toBe('Layla Commander (Updated)');
    expect(updated.skills).toHaveLength(5);
    expect(updated.teamStatus).toBe(TeamStatus.want_to_create_team);
    expect(updated.desiredRole).toBe('AI & Data Lead');
  });

  it('4. Searches and filters profiles by skills and preferred challenge', async () => {
    const searchRes = await profileService.searchProfiles({
      skills: 'Python',
      preferredChallenge: 'Earth Observation',
    });

    expect(searchRes.total).toBeGreaterThanOrEqual(1);
    expect(searchRes.items.some((item) => item.userId === registeredUserId)).toBe(true);
  });

  it('5. Generates teammate recommendations based on complementary skills & challenge', async () => {
    const recs = await profileService.getRecommendations(registeredUserId);
    expect(recs).toBeDefined();
    expect(Array.isArray(recs)).toBe(true);
    // Should recommend other seeded users (e.g. Sarah Mansour with Frontend, Youssef with UI/UX)
    if (recs.length > 0) {
      expect(recs[0].matchScore).toBeGreaterThan(0);
      expect(recs[0].matchReasons.length).toBeGreaterThan(0);
    }
  });

  it('6. Fetches public profile by profile ID', async () => {
    const publicProfile = await profileService.getProfileById(registeredProfileId);
    expect(publicProfile).toBeDefined();
    expect(publicProfile.user?.name).toBe('Layla Commander (Updated)');
  });
});
