import catalogue from '../src/challenges/nasa-2026.json' with { type: 'json' };
import arabicCatalogue from '../src/challenges/nasa-2026.ar.json' with { type: 'json' };

// Only the checked-in snapshot of NASA's published event catalogue populates it.
// No application role can write challenge content or control publication.
export async function syncOfficialCatalogue(db) {
  if (catalogue.challenges.length !== 14 || new Set(catalogue.challenges.map(c => c.nasaChallengeId)).size !== 14)
    throw new Error('The verified NASA 2026 catalogue must contain exactly 14 unique challenges.');
  const slugs = new Set(catalogue.challenges.map(challenge => challenge.slug));
  if (Object.keys(arabicCatalogue).length !== slugs.size || Object.keys(arabicCatalogue).some(slug => !slugs.has(slug)))
    throw new Error('Every official NASA challenge must have exactly one Arabic translation.');
  return db.$transaction(async tx => {
    const byTitle = new Map();
    const ids = [];
    for (const [displayOrder, challenge] of catalogue.challenges.entries()) {
      const { slug, summary, subjects, difficulty, ...official } = challenge;
      const arabic = arabicCatalogue[slug];
      const data = {
        ...official, summary, description: summary, subjects, difficulty,
        category: subjects[0] || 'Space Exploration', year: catalogue.year,
        titleAr: arabic.titleAr, summaryAr: arabic.summaryAr, descriptionAr: arabic.summaryAr,
        requirementsEn: null, requirementsAr: null, deliverablesEn: null, deliverablesAr: null,
        recommendedSkills: [], tags: subjects, displayOrder,
        isPublished: true, isArchived: false, isDemo: false,
      };
      const record = await tx.challenge.upsert({ where: { slug }, create: { ...data, slug }, update: data });
      ids.push(record.id); byTitle.set(record.title, record.id);
      // Replace unverified seeded resources with the authoritative NASA destination.
      await tx.challengeResource.deleteMany({ where: { challengeId: record.id } });
      await tx.challengeResource.create({ data: {
        challengeId: record.id, label: 'NASA challenge brief and published resources',
        url: challenge.sourceUrl, type: 'document', isOfficial: true, isCurated: false,
      } });
    }
    await tx.challenge.updateMany({ where: { id: { notIn: ids } }, data: { isPublished: false, isArchived: true } });
    // Current choices must use the official catalogue. Historical submission and
    // judging snapshots are retained; no team, project or conversation is deleted.
    const teams = await tx.team.findMany({ where: { challenge: { not: null } }, select: { id: true, challenge: true } });
    for (const team of teams) await tx.team.update({ where: { id: team.id }, data: {
      challengeId: byTitle.get(team.challenge) || null,
      challenge: byTitle.has(team.challenge) ? team.challenge : null,
    } });
    const profiles = await tx.profile.findMany({ where: { preferredChallenge: { not: null } }, select: { id: true, preferredChallenge: true } });
    for (const profile of profiles) await tx.profile.update({ where: { id: profile.id }, data: {
      preferredChallengeId: byTitle.get(profile.preferredChallenge) || null,
      preferredChallenge: byTitle.has(profile.preferredChallenge) ? profile.preferredChallenge : null,
    } });
    return { count: ids.length };
  }, { timeout: 30000 });
}
