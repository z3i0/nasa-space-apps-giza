# Official NASA challenge catalogue

- The only available challenges are the 14 published NASA Space Apps 2026 challenges.
- The verified source snapshot is `apps/api/src/challenges/nasa-2026.json`, fetched from NASA's public event catalogue on 19 October 2026.
- Source: https://www.spaceappschallenge.org/2026/challenges/
- Every role browses the same read-only catalogue. Organizers cannot create, edit, publish, archive or reconcile challenges.
- Removed the authoring API routes, editor, development challenge seeder and free-text reconciliation screen.
- Participants can search, filter, save favorites, read NASA summaries, follow official links and select a challenge for their team.
- Arabic challenge titles and summaries are maintained in `apps/api/src/challenges/nasa-2026.ar.json`; the English NASA snapshot remains unchanged. Catalogue synchronization writes the Arabic summary to both the summary and detail-description fields.
- Team, profile, registration and project APIs reject custom challenge names. Project choices must agree with the team's selected NASA challenge.
- Run `corepack pnpm db:update` after pulling. It installs the official catalogue, excludes other records and clears invalid current team/profile choices. Team/project records and historical judging snapshots are retained.
- No invented requirements or deliverables, and no unofficial resource links are published. Arabic titles and summaries are project translations of NASA's published catalogue; full briefs and resources are reached through NASA's official challenge page.
- NASA controls publication. When NASA changes the event catalogue, refresh the verified source snapshot in code and run the database update; there is no local authoring workflow.
