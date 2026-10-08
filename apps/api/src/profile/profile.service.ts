import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SearchProfilesDto } from './dto/search-profiles.dto.js';
import { TeamStatus } from '@prisma/client';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // Helper: Format Profile Response
  // -------------------------------------------------------------
  private formatProfile(profile: any) {
    if (!profile) return null;
    return {
      id: profile.id,
      userId: profile.userId,
      institution: profile.institution,
      academicLevel: profile.academicLevel,
      skills: profile.skills || [],
      bio: profile.bio,
      interests: profile.interests || [],
      experience: profile.experience,
      preferredChallenge: profile.preferredChallenge,
      teamStatus: profile.teamStatus,
      desiredRole: profile.desiredRole,
      githubUrl: profile.githubUrl,
      linkedinUrl: profile.linkedinUrl,
      portfolioUrl: profile.portfolioUrl,
      isPublic: profile.isPublic,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      user: profile.user
        ? {
            id: profile.user.id,
            name: profile.user.name,
            username: profile.user.username,
            email: profile.user.email,
            phone: profile.user.phone,
            avatar: profile.user.avatar,
            role: profile.user.role,
          }
        : undefined,
    };
  }

  // -------------------------------------------------------------
  // Get Current User Profile (creates initial one if none exists)
  // -------------------------------------------------------------
  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profile) {
      // Auto-initialize profile record
      const newProfile = await this.prisma.profile.create({
        data: {
          userId: user.id,
          teamStatus: TeamStatus.want_to_join_team,
          skills: [],
          interests: [],
          isPublic: true,
        },
        include: {
          user: true,
        },
      });
      return this.formatProfile(newProfile);
    }

    return this.formatProfile({
      ...user.profile,
      user,
    });
  }

  // -------------------------------------------------------------
  // Update Current User Profile
  // -------------------------------------------------------------
  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update User-level fields if provided
    if (dto.name !== undefined || dto.phone !== undefined || dto.avatar !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
          ...(dto.avatar !== undefined ? { avatar: dto.avatar.trim() } : {}),
        },
      });
    }

    // Extract profile fields
    const { name: _name, phone: _phone, avatar: _avatar, ...profileData } = dto;

    const updatedProfile = await this.prisma.profile.upsert({
      where: { userId },
      update: {
        ...(profileData.institution !== undefined ? { institution: profileData.institution?.trim() || null } : {}),
        ...(profileData.academicLevel !== undefined ? { academicLevel: profileData.academicLevel?.trim() || null } : {}),
        ...(profileData.skills !== undefined ? { skills: profileData.skills } : {}),
        ...(profileData.bio !== undefined ? { bio: profileData.bio?.trim() || null } : {}),
        ...(profileData.interests !== undefined ? { interests: profileData.interests } : {}),
        ...(profileData.experience !== undefined ? { experience: profileData.experience?.trim() || null } : {}),
        ...(profileData.preferredChallenge !== undefined ? { preferredChallenge: profileData.preferredChallenge?.trim() || null } : {}),
        ...(profileData.teamStatus !== undefined ? { teamStatus: profileData.teamStatus } : {}),
        ...(profileData.desiredRole !== undefined ? { desiredRole: profileData.desiredRole?.trim() || null } : {}),
        ...(profileData.githubUrl !== undefined ? { githubUrl: profileData.githubUrl?.trim() || null } : {}),
        ...(profileData.linkedinUrl !== undefined ? { linkedinUrl: profileData.linkedinUrl?.trim() || null } : {}),
        ...(profileData.portfolioUrl !== undefined ? { portfolioUrl: profileData.portfolioUrl?.trim() || null } : {}),
        ...(profileData.isPublic !== undefined ? { isPublic: profileData.isPublic } : {}),
      },
      create: {
        userId,
        institution: profileData.institution?.trim() || null,
        academicLevel: profileData.academicLevel?.trim() || null,
        skills: profileData.skills || [],
        bio: profileData.bio?.trim() || null,
        interests: profileData.interests || [],
        experience: profileData.experience?.trim() || null,
        preferredChallenge: profileData.preferredChallenge?.trim() || null,
        teamStatus: profileData.teamStatus || TeamStatus.want_to_join_team,
        desiredRole: profileData.desiredRole?.trim() || null,
        githubUrl: profileData.githubUrl?.trim() || null,
        linkedinUrl: profileData.linkedinUrl?.trim() || null,
        portfolioUrl: profileData.portfolioUrl?.trim() || null,
        isPublic: profileData.isPublic ?? true,
      },
      include: {
        user: true,
      },
    });

    return this.formatProfile(updatedProfile);
  }

  // -------------------------------------------------------------
  // Get Profile By ID or User ID (Public / Authorized)
  // -------------------------------------------------------------
  async getProfileById(identifier: string, viewerUserId?: string, viewerRoles: string[] = []) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        OR: [
          { id: identifier },
          { userId: identifier },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const isOwner = viewerUserId === profile.userId;
    const isPrivileged = viewerRoles.some((r) => ['organizer', 'mentor', 'judge'].includes(r));

    if (!profile.isPublic && !isOwner && !isPrivileged) {
      throw new ForbiddenException('This participant profile is private');
    }

    return this.formatProfile(profile);
  }

  // -------------------------------------------------------------
  // Search & Filter Profiles (Team Matching & Collaboration)
  // -------------------------------------------------------------
  async searchProfiles(dto: SearchProfilesDto) {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(100, Math.max(1, dto.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isPublic: true,
      user: {
        isActive: true,
        deletedAt: null,
      },
    };

    if (dto.teamStatus) {
      where.teamStatus = dto.teamStatus;
    }

    if (dto.preferredChallenge) {
      where.preferredChallenge = {
        contains: dto.preferredChallenge.trim(),
        mode: 'insensitive',
      };
    }

    if (dto.desiredRole) {
      where.desiredRole = {
        contains: dto.desiredRole.trim(),
        mode: 'insensitive',
      };
    }

    if (dto.institution) {
      where.institution = {
        contains: dto.institution.trim(),
        mode: 'insensitive',
      };
    }

    if (dto.skills) {
      const skillList = dto.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (skillList.length > 0) {
        where.skills = {
          hasSome: skillList,
        };
      }
    }

    if (dto.search) {
      const searchTerms = dto.search.trim();
      where.OR = [
        { user: { name: { contains: searchTerms, mode: 'insensitive' } } },
        { bio: { contains: searchTerms, mode: 'insensitive' } },
        { institution: { contains: searchTerms, mode: 'insensitive' } },
        { experience: { contains: searchTerms, mode: 'insensitive' } },
        { desiredRole: { contains: searchTerms, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.profile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: true,
        },
      }),
      this.prisma.profile.count({ where }),
    ]);

    return {
      items: items.map((p) => this.formatProfile(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // -------------------------------------------------------------
  // Teammate Recommendation Algorithm (Section 3.2 Matching)
  // -------------------------------------------------------------
  async getRecommendations(userId: string) {
    const myProfile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!myProfile) {
      throw new NotFoundException('Please create your profile first to get teammate recommendations');
    }

    // Potential teammates: looking for or creating a team, public, not self
    const candidates = await this.prisma.profile.findMany({
      where: {
        userId: { not: userId },
        isPublic: true,
        teamStatus: {
          in: [TeamStatus.want_to_join_team, TeamStatus.want_to_create_team],
        },
        user: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        user: true,
      },
      take: 50,
    });

    const mySkillsLower = (myProfile.skills || []).map((s) => s.toLowerCase());
    const myInterestsLower = (myProfile.interests || []).map((i) => i.toLowerCase());
    const myChallenge = myProfile.preferredChallenge?.toLowerCase() || '';

    const scoredCandidates = candidates.map((candidate) => {
      let score = 0;
      const matchReasons: string[] = [];

      // 1. Challenge preference matching (+40 pts)
      if (
        myChallenge &&
        candidate.preferredChallenge &&
        (candidate.preferredChallenge.toLowerCase() === myChallenge ||
          candidate.preferredChallenge.toLowerCase().includes(myChallenge) ||
          myChallenge.includes(candidate.preferredChallenge.toLowerCase()))
      ) {
        score += 40;
        matchReasons.push(`Shares preferred challenge: ${candidate.preferredChallenge}`);
      }

      // 2. Shared interests (+10 pts each)
      const candidateInterestsLower = (candidate.interests || []).map((i) => i.toLowerCase());
      const sharedInterests = candidateInterestsLower.filter((interest) =>
        myInterestsLower.includes(interest),
      );
      if (sharedInterests.length > 0) {
        score += sharedInterests.length * 10;
        matchReasons.push(`Shared interests: ${sharedInterests.join(', ')}`);
      }

      // 3. Complementary skills (+15 pts for each new complementary skill)
      const complementarySkills = candidate.skills.filter(
        (s) => !mySkillsLower.includes(s.toLowerCase()),
      );
      if (complementarySkills.length > 0) {
        score += Math.min(30, complementarySkills.length * 10);
        matchReasons.push(`Brings complementary skills: ${complementarySkills.slice(0, 3).join(', ')}`);
      }

      // 4. Complementary role (+20 pts)
      if (
        candidate.desiredRole &&
        myProfile.desiredRole &&
        candidate.desiredRole.toLowerCase() !== myProfile.desiredRole.toLowerCase()
      ) {
        score += 20;
        matchReasons.push(`Complementary role: ${candidate.desiredRole}`);
      }

      return {
        profile: this.formatProfile(candidate),
        matchScore: score,
        matchReasons,
      };
    });

    // Sort descending by score
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

    return scoredCandidates.slice(0, 15);
  }
}
