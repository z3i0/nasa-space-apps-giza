import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileService } from './profile.service.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { TeamStatus } from '@prisma/client';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      profile: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new ProfileService(mockPrisma as unknown as PrismaService);
  });

  describe('getMyProfile', () => {
    it('returns existing profile with user details', async () => {
      const mockUser = {
        id: 'u-1',
        name: 'Rafe Oneal',
        email: 'participant@hackathon.local',
        phone: '+20100000000',
        profile: {
          id: 'p-1',
          userId: 'u-1',
          institution: 'Cairo University',
          academicLevel: 'Senior',
          skills: ['Python', 'Machine Learning'],
          bio: 'AI enthusiast',
          interests: ['Earth Observation'],
          experience: 'Built flood detection model',
          preferredChallenge: 'Earth Observation',
          teamStatus: TeamStatus.want_to_create_team,
          desiredRole: 'AI Engineer',
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMyProfile('u-1');

      expect(result).toBeDefined();
      expect(result?.institution).toBe('Cairo University');
      expect(result?.user?.name).toBe('Rafe Oneal');
      expect(result?.skills).toContain('Python');
    });

    it('auto-creates an initial profile if user exists without one', async () => {
      const mockUser = {
        id: 'u-2',
        name: 'New Participant',
        email: 'new@hackathon.local',
        profile: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.profile.create.mockResolvedValue({
        id: 'p-new',
        userId: 'u-2',
        institution: null,
        academicLevel: null,
        skills: [],
        bio: null,
        interests: [],
        experience: null,
        preferredChallenge: null,
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: null,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      });

      const result = await service.getMyProfile('u-2');

      expect(result).toBeDefined();
      expect(result?.teamStatus).toBe(TeamStatus.want_to_join_team);
      expect(mockPrisma.profile.create).toHaveBeenCalledWith({
        data: {
          userId: 'u-2',
          teamStatus: TeamStatus.want_to_join_team,
          skills: [],
          interests: [],
          isPublic: true,
        },
        include: { user: true },
      });
    });

    it('throws NotFoundException if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyProfile', () => {
    it('updates profile information and user name/phone', async () => {
      const existingUser = {
        id: 'u-1',
        name: 'Old Name',
        phone: '111',
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.profile.upsert.mockResolvedValue({
        id: 'p-1',
        userId: 'u-1',
        institution: 'Ain Shams',
        academicLevel: 'Junior',
        skills: ['React', 'Next.js'],
        bio: 'Frontend dev',
        interests: ['Space'],
        experience: '2 years',
        preferredChallenge: 'Earth Observation',
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Frontend Developer',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'u-1',
          name: 'Sarah Mansour',
          phone: '+20111111111',
        },
      });

      const result = await service.updateMyProfile('u-1', {
        name: 'Sarah Mansour',
        phone: '+20111111111',
        institution: 'Ain Shams',
        academicLevel: 'Junior',
        skills: ['React', 'Next.js'],
        teamStatus: TeamStatus.want_to_join_team,
        desiredRole: 'Frontend Developer',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: {
          name: 'Sarah Mansour',
          phone: '+20111111111',
        },
      });

      expect(result.institution).toBe('Ain Shams');
      expect(result.skills).toContain('React');
      expect(result.teamStatus).toBe(TeamStatus.want_to_join_team);
    });
  });

  describe('getProfileById', () => {
    it('returns a public profile', async () => {
      const mockProfile = {
        id: 'p-1',
        userId: 'u-1',
        institution: 'Cairo University',
        isPublic: true,
        user: { id: 'u-1', name: 'Rafe Oneal' },
      };

      mockPrisma.profile.findFirst.mockResolvedValue(mockProfile);

      const result = await service.getProfileById('u-1');
      expect(result.institution).toBe('Cairo University');
      expect(result.user?.name).toBe('Rafe Oneal');
    });

    it('throws ForbiddenException if profile is private and viewer is another non-privileged user', async () => {
      const mockProfile = {
        id: 'p-private',
        userId: 'u-private',
        isPublic: false,
        user: { id: 'u-private', name: 'Private User' },
      };

      mockPrisma.profile.findFirst.mockResolvedValue(mockProfile);

      await expect(
        service.getProfileById('u-private', 'other-user', ['participant']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows organizers to view private profiles', async () => {
      const mockProfile = {
        id: 'p-private',
        userId: 'u-private',
        isPublic: false,
        user: { id: 'u-private', name: 'Private User' },
      };

      mockPrisma.profile.findFirst.mockResolvedValue(mockProfile);

      const result = await service.getProfileById('u-private', 'org-user', ['organizer']);
      expect(result).toBeDefined();
      expect(result.user?.name).toBe('Private User');
    });
  });

  describe('searchProfiles', () => {
    it('returns paginated matching profiles', async () => {
      const mockProfiles = [
        {
          id: 'p-1',
          userId: 'u-1',
          skills: ['Python', 'AI'],
          preferredChallenge: 'Earth Observation',
          teamStatus: TeamStatus.want_to_create_team,
          isPublic: true,
          user: { name: 'Rafe Oneal' },
        },
      ];

      mockPrisma.profile.findMany.mockResolvedValue(mockProfiles);
      mockPrisma.profile.count.mockResolvedValue(1);

      const result = await service.searchProfiles({
        skills: 'Python',
        preferredChallenge: 'Earth Observation',
        page: 1,
        limit: 10,
      });

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.items[0].skills).toContain('Python');
    });
  });

  describe('getRecommendations', () => {
    it('recommends teammates with complementary skills and shared challenge', async () => {
      const myProfile = {
        id: 'p-my',
        userId: 'u-my',
        skills: ['Python', 'Machine Learning'],
        interests: ['Earth Observation', 'Climate'],
        preferredChallenge: 'Earth Observation & Climate Action',
        desiredRole: 'AI Engineer',
      };

      const candidates = [
        {
          id: 'p-cand-1',
          userId: 'u-cand-1',
          skills: ['React', 'Next.js', 'UI/UX'],
          interests: ['Earth Observation', 'Design'],
          preferredChallenge: 'Earth Observation & Climate Action',
          desiredRole: 'Frontend Developer',
          teamStatus: TeamStatus.want_to_join_team,
          isPublic: true,
          user: { id: 'u-cand-1', name: 'Sarah Mansour' },
        },
      ];

      mockPrisma.profile.findUnique.mockResolvedValue(myProfile);
      mockPrisma.profile.findMany.mockResolvedValue(candidates);

      const recommendations = await service.getRecommendations('u-my');

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].matchScore).toBeGreaterThan(0);
      expect(recommendations[0].matchReasons).toContain(
        'Shares preferred challenge: Earth Observation & Climate Action',
      );
      expect(recommendations[0].profile.user?.name).toBe('Sarah Mansour');
    });
  });
});
