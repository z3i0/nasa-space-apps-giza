import { Prisma, type Challenge } from '@prisma/client';
import catalogue from './nasa-2026.json' with { type: 'json' };

export const officialChallengeWhere = {
  year: catalogue.year,
  nasaChallengeId: {
    in: catalogue.challenges.map((challenge) => challenge.nasaChallengeId),
  },
  AND: [{ OR: catalogue.challenges.map(challenge => ({
    nasaChallengeId: challenge.nasaChallengeId,
    title: challenge.title,
    sourceUrl: challenge.sourceUrl,
  })) }],
  isPublished: true,
  isArchived: false,
  isDemo: false,
} satisfies Prisma.ChallengeWhereInput;

export function isOfficialChallenge(
  challenge: Challenge | null,
): challenge is Challenge {
  return (
    !!challenge &&
    challenge.isPublished &&
    !challenge.isArchived &&
    !challenge.isDemo &&
    challenge.year === catalogue.year &&
    catalogue.challenges.some(
      (official) =>
        official.nasaChallengeId === challenge.nasaChallengeId &&
        official.title === challenge.title &&
        official.sourceUrl === challenge.sourceUrl,
    )
  );
}
