# Judging milestone — 18 October 2026

## Delivered

- Judge overview, assigned projects, evaluation, progress, criteria and published leaderboard, in English and Arabic with responsive layouts.
- Organizer `/dashboard/organizer/judges` and `/dashboard/organizer/scores`: permanent rubric versions, assignments, progress, feedback, ranking preview, publication and CSV export.
- Integer scores from 1–10. Criterion weights total 100. Weighted scores are out of 100, and team results average finalized evaluations. Drafts never enter rankings; equal displayed totals share the same competition rank.
- Draft saves persist with optimistic version checks. Final scores and feedback are read only. No organizer impersonation or arbitrary score changes.
- Judge access is restricted to their own assignments. Organizer access uses current database roles. Other participants and mentors cannot inspect evaluation data. Only aggregate team rankings are released after publication.
- Assignments store a permanent submission snapshot and source version. All judges for a team must use that version; the current round uses one rubric across all teams. Self evaluation is blocked for team creators and current members.
- An unstarted assignment can be removed to correct assignment mistakes. Started evaluations are retained. Rubrics are never edited in place.
- Publishing requires an evaluation for every submitted team and completion of all assigned evaluations. Publication stores a results snapshot and freezes judging writes. Organizers can unpublish to add assignments. Started and finalized evaluations remain protected.
- CSV exports contain aggregate results and evaluation counts, with CSV escaping and spreadsheet formula protection.

## Local setup

Additive migration: `20261018220000_judging`. It has been applied to the existing local PostgreSQL database and marked applied in Prisma migration history. No sample judges, fake scores, or default official NASA rubric were created.

As an organizer, create the actual event rubric (criterion weights must sum to 100), then assign submitted teams to active judge accounts. Judges will see those assignments immediately on opening their dashboard. Empty dashboards show zero real assignments.

This is a single event judging round. Historical multi-event rounds, evaluation reopening, file/PDF uploads, full participant submission revision history, and event schedule/timeline operations remain separate work. Assignment snapshots preserve the version reviewed for this milestone.

## Verification

- Live PostgreSQL tests: persistence, snapshots, stale writes, score validation, judge isolation, draft exclusion, equal ranks, final locks and assignment removal safeguards.
- Publication tests: safe aggregate snapshots, incomplete and unassigned team gates, and published round write protection.
- Real HTTP checks: unauthenticated access, participant role denial, organizer rubric/assignment creation, own judge assignments, final feedback persistence and score tampering denial. Temporary test records removed.
- Browser tests: draft save/reload/finalization/progress, organizer rubric creation/publication validation, Arabic RTL mobile layout.

The local NASA dashboard shell is the design reference. Figma connector access was unavailable in this session.
