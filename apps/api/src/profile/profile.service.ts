import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { officialChallengeWhere } from '../challenges/official-catalogue.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SearchProfilesDto } from './dto/search-profiles.dto.js';
import { Prisma, TeamStatus, type Profile, type User } from '@prisma/client';

const publicProfileUserSelect = {
  id: true, name: true, username: true, avatar: true, role: true, emailVerified: true,
} satisfies Prisma.UserSelect;

type ProfileWithUser = Profile & { user?: Pick<User, 'id' | 'name' | 'username' | 'avatar' | 'role' | 'emailVerified'> & Partial<Pick<User, 'email' | 'phone'>> & {
  teamMemberships?: { team: { id: string; name: string; _count: { members: number } } }[];
} };

const profileUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  avatar: true,
  role: true,
  emailVerified: true,
  teamMemberships: {
    take: 1,
    select: {
      team: {
        select: { id: true, name: true, _count: { select: { members: true } } },
      },
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // Helper: Format Profile Response
  // -------------------------------------------------------------
  private formatProfile(profile: ProfileWithUser, full = false) {
    return {
      id: profile.id,
      userId: profile.userId,
      institution: profile.institution,
      academicLevel: profile.academicLevel,
      skills: profile.skills || [],
      bio: profile.bio,
      interests: profile.interests || [],
      ...(full
        ? {
            experience: profile.experience,
            githubUrl: profile.githubUrl,
            linkedinUrl: profile.linkedinUrl,
            portfolioUrl: profile.portfolioUrl,
            shareProjectsWithMentors: profile.shareProjectsWithMentors,
            hideFromSearch: profile.hideFromSearch,
          }
        : {}),
      preferredChallenge: profile.preferredChallenge,
      teamStatus: profile.teamStatus,
      desiredRole: profile.desiredRole,
      isPublic: profile.isPublic,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      ...(full
        ? {
            team: profile.user?.teamMemberships?.[0]?.team
              ? {
                  id: profile.user.teamMemberships[0].team.id,
                  name: profile.user.teamMemberships[0].team.name,
                  memberCount:
                    profile.user.teamMemberships[0].team._count.members,
                }
              : null,
          }
        : {}),
      user: profile.user
        ? {
            id: profile.user.id,
            name: profile.user.name,
            username: profile.user.username,
            ...(full
              ? { email: profile.user.email, phone: profile.user.phone }
              : {}),
            emailVerified: profile.user.emailVerified,
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
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: profileUserSelect } },
    });
    if (existing) return this.formatProfile(existing, true);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    // Concurrent first visits are safe: the unique userId is enforced by the DB.
    await this.prisma.profile.createMany({
      data: [{ userId }],
      skipDuplicates: true,
    });
    return this.formatProfile(
      await this.prisma.profile.findUniqueOrThrow({
        where: { userId },
        include: { user: { select: profileUserSelect } },
      }),
      true,
    );
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const { name, phone, avatar, expectedUpdatedAt, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('User not found');
      if (fields.preferredChallenge?.trim()) {
        const choice = await tx.challenge.findFirst({ where: { ...officialChallengeWhere, title: fields.preferredChallenge.trim() }, select: { id: true } });
        if (!choice) throw new BadRequestException('Choose a published NASA challenge from the catalogue.');
      }
      const data = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [
          key,
          typeof value === 'string' && key !== 'teamStatus'
            ? value.trim() || null
            : value,
        ]),
      ) as Prisma.ProfileUncheckedUpdateInput;
      if (expectedUpdatedAt) {
        const result = await tx.profile.updateMany({
          where: { userId, updatedAt: new Date(expectedUpdatedAt) },
          data: { ...data, updatedAt: new Date(Math.max(Date.now(), new Date(expectedUpdatedAt).getTime() + 1)) },
        });
        if (result.count !== 1)
          throw new ConflictException(
            'Profile changed since it was loaded. Reload before saving.',
          );
      } else {
        await tx.profile.upsert({
          where: { userId },
          update: data,
          create: { ...fields, userId },
        });
      }
      if (name !== undefined || phone !== undefined || avatar !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(name !== undefined ? { name: name.trim() } : {}),
            ...(phone !== undefined ? { phone: phone.trim() || null } : {}),
            ...(avatar !== undefined ? { avatar: avatar.trim() || null } : {}),
          },
        });
      }
      return this.formatProfile(
        await tx.profile.findUniqueOrThrow({
          where: { userId },
          include: { user: { select: profileUserSelect } },
        }),
        true,
      );
    });
  }

  // -------------------------------------------------------------
  // Get Profile By ID or User ID (Public / Authorized)
  // -------------------------------------------------------------
  async getProfileById(
    identifier: string,
    viewerUserId?: string,
    viewerRoles: string[] = [],
  ) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        OR: [{ id: identifier }, { userId: identifier }],
      },
      include: {
        user: { select: publicProfileUserSelect },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const isOwner = viewerUserId === profile.userId;
    const isPrivileged = viewerRoles.includes('organizer');

    if (
      (!profile.isPublic || profile.hideFromSearch) &&
      !isOwner &&
      !isPrivileged
    ) {
      throw new ForbiddenException('This participant profile is private');
    }

    return this.formatProfile(profile, isOwner || isPrivileged);
  }

  // -------------------------------------------------------------
  // Search & Filter Profiles (Team Matching & Collaboration)
  // -------------------------------------------------------------
  async searchProfiles(dto: SearchProfilesDto) {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(100, Math.max(1, dto.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProfileWhereInput = {
      isPublic: true,
      hideFromSearch: false,
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
          user: { select: publicProfileUserSelect },
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
      throw new NotFoundException(
        'Please create your profile first to get teammate recommendations',
      );
    }

    // Potential teammates: looking for or creating a team, public, not self
    const candidates = await this.prisma.profile.findMany({
      where: {
        userId: { not: userId },
        isPublic: true,
        hideFromSearch: false,
        teamStatus: {
          in: [TeamStatus.want_to_join_team, TeamStatus.want_to_create_team],
        },
        user: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        user: { select: publicProfileUserSelect },
      },
      take: 50,
    });

    const mySkillsLower = (myProfile.skills || []).map((s) => s.toLowerCase());
    const myInterestsLower = (myProfile.interests || []).map((i) =>
      i.toLowerCase(),
    );
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
        matchReasons.push(
          `Shares preferred challenge: ${candidate.preferredChallenge}`,
        );
      }

      // 2. Shared interests (+10 pts each)
      const candidateInterestsLower = (candidate.interests || []).map((i) =>
        i.toLowerCase(),
      );
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
        matchReasons.push(
          `Brings complementary skills: ${complementarySkills.slice(0, 3).join(', ')}`,
        );
      }

      // 4. Complementary role (+20 pts)
      if (
        candidate.desiredRole &&
        myProfile.desiredRole &&
        candidate.desiredRole.toLowerCase() !==
          myProfile.desiredRole.toLowerCase()
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
