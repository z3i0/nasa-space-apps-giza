# Challenge Explorer — 18 October 2026

This milestone implements the next unfinished core feature in the priority order of `nasa_implementation_plan.md`: Challenge Explorer. The newer `nasaPLAN.md` also places challenge records, discovery, favorites, and team selection in Phase 3. Submission version history, judging, event operations, and the remaining communication features are separate milestones.

## Available flows

- Participants browse published challenges, search English/Arabic titles and summaries, filter by category/difficulty/year, save personal favorites, and open challenge details and resource links.
- Team leaders select a published challenge for their team. Members can see the shared selection; they cannot change it. Selection is locked after a configured submission deadline. A saved submission remains separate and must be reviewed explicitly.
- Mentor and judge challenge routes reuse the catalogue and detail views.
- Organizers create drafts, supply optional Arabic content and HTTP/HTTPS resource links, publish, edit, archive, restore, and review legacy team choices. Version checks reject stale edits before replacing resource links.
- Archive preserves historical team selections and published detail links. Drafts and archived records are excluded from normal discovery. Favorites are scoped to the authenticated user and repeated saves are idempotent.

## Data and migration

`20261018200000_challenge_explorer` adds challenge records, ordered resource links, personal favorites, and the nullable `teams.challenge_id` relation. It preserves the original team challenge text and links only unique exact title matches. Unresolved text is listed for organizer review. Editing a team's free-text choice clears a stale catalogue relation.

The additive migration was applied to the existing local PostgreSQL database and recorded with Prisma. The earlier repository migrations still require the baseline reconciliation described in `team-workspace.md`; do not replay those initial migrations against an already populated database.

`pnpm --filter api seed:challenges:dev` loads three clearly labeled, bilingual development examples. It refuses production mode and non-local database hosts, preserves existing edits, and is separate from the production seed. These examples are not official NASA event challenges. Organizers must enter and publish approved event content before launch.

## API

All endpoints require a validated session. Catalogue/detail/favorite/selection routes live under `/api/challenges`. Organizer writes and legacy-choice review live under `/api/challenges/manage` and are guarded on the server. The auth guard now reads activation and roles from the current database record so stale session information cannot restore organizer access.

Browser requests use the same-origin Next.js rewrite. Lists are paginated, default to 20 records, and cap requests at 100. Resource URLs are validated before writes. Descriptions render as plain text.

## Design and verification

The screens reuse the NASA V1 dashboard shell and its scoped colors, type, controls, spacing, and original assets. No new raster artwork or substitute illustrations were introduced. Direct Figma comparison remains unavailable because the connector denied access to the supplied file; the established local design reference is retained.

Production web/API builds, web type checks, and changed-component lint passed. Twelve guard/database checks cover draft privacy, private/idempotent favorites, resource validation, stale edits, team selection, archive preservation, and immediate role revocation. Three browser journeys cover participant discovery/favorites/selection, Arabic mobile layout, and organizer create/publish/edit/archive actions. Live HTTP checks independently verified organizer-only routes, hidden drafts, favorites, selection, and revoked-role denial. Disposable test data was removed after verification.

Screenshots are stored under the ignored `.playwright/results` directory. The landing page components, assets, global styles, and root layout were not edited for this milestone.
