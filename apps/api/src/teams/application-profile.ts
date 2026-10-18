import type { Profile } from '@prisma/client';

// Explicitly shared with the receiving leader when a participant applies.
// This is separate from public discovery visibility; never expose account data.
export function applicationProfile(profile: Profile | null | undefined) {
  if (!profile) return null;
  return {
    bio: profile.bio,
    skills: profile.skills,
    interests: profile.interests,
    experience: profile.experience,
    desiredRole: profile.desiredRole,
    institution: profile.institution,
    academicLevel: profile.academicLevel,
    preferredChallenge: profile.preferredChallenge,
    githubUrl: profile.githubUrl,
    linkedinUrl: profile.linkedinUrl,
    portfolioUrl: profile.portfolioUrl,
  };
}
