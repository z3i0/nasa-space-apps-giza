import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileController } from './profile.controller.js';
import type { ProfileService } from './profile.service.js';
import { TeamStatus } from '@prisma/client';

describe('ProfileController', () => {
  let controller: ProfileController;
  let mockProfileService: any;

  beforeEach(() => {
    mockProfileService = {
      getMyProfile: vi.fn(),
      updateMyProfile: vi.fn(),
      getRecommendations: vi.fn(),
      searchProfiles: vi.fn(),
      getProfileById: vi.fn(),
    };

    controller = new ProfileController(mockProfileService as unknown as ProfileService);
  });

  it('getMyProfile returns the authenticated user profile', async () => {
    const mockProfile = {
      id: 'p-1',
      userId: 'u-1',
      institution: 'Cairo University',
    };
    mockProfileService.getMyProfile.mockResolvedValue(mockProfile);

    const result = await controller.getMyProfile({
      id: 'u-1',
      name: 'Rafe',
      email: 'rafe@space.local',
      roles: ['participant'],
    });

    expect(result).toEqual(mockProfile);
    expect(mockProfileService.getMyProfile).toHaveBeenCalledWith('u-1');
  });

  it('updateMyProfile updates profile and returns result', async () => {
    const updateDto = {
      institution: 'AUC',
      skills: ['Python'],
      teamStatus: TeamStatus.want_to_join_team,
    };
    mockProfileService.updateMyProfile.mockResolvedValue({ id: 'p-1', ...updateDto });

    const result = await controller.updateMyProfile(
      { id: 'u-1', name: 'Rafe', email: 'rafe@space.local', roles: ['participant'] },
      updateDto,
    );

    expect(result.institution).toBe('AUC');
    expect(mockProfileService.updateMyProfile).toHaveBeenCalledWith('u-1', updateDto);
  });

  it('getRecommendations returns teammate suggestions', async () => {
    const mockRecs = [
      {
        profile: { id: 'p-2', user: { name: 'Sarah' } },
        matchScore: 60,
        matchReasons: ['Shared challenge'],
      },
    ];
    mockProfileService.getRecommendations.mockResolvedValue(mockRecs);

    const result = await controller.getRecommendations({
      id: 'u-1',
      name: 'Rafe',
      email: 'rafe@space.local',
      roles: ['participant'],
    });

    expect(result).toHaveLength(1);
    expect(result[0].matchScore).toBe(60);
    expect(mockProfileService.getRecommendations).toHaveBeenCalledWith('u-1');
  });

  it('searchProfiles delegates to profileService.searchProfiles', async () => {
    const query = { skills: 'React', page: 1, limit: 10 };
    mockProfileService.searchProfiles.mockResolvedValue({ items: [], total: 0 });

    const result = await controller.searchProfiles(query);
    expect(result).toEqual({ items: [], total: 0 });
    expect(mockProfileService.searchProfiles).toHaveBeenCalledWith(query);
  });

  it('getProfileById retrieves public profile', async () => {
    mockProfileService.getProfileById.mockResolvedValue({ id: 'p-1', isPublic: true });

    const req: any = { user: { id: 'viewer-1', roles: ['participant'] } };
    const result = await controller.getProfileById('p-1', req);

    expect(result.id).toBe('p-1');
    expect(mockProfileService.getProfileById).toHaveBeenCalledWith('p-1', 'viewer-1', ['participant']);
  });
});
