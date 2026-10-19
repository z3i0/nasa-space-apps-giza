# Pulling the integrated dashboard

Run from the repository root after pulling the branch:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm db:update
corepack pnpm build
```

Keep your existing `apps/api/.env` and `apps/web/.env.local`. They are not committed.
Stop the API before installing on Windows so Prisma can replace its engine file.
Restart the API and frontend after the update.

`db:update` supports a new database, the dashboard branch database, and the
incoming master catalogue schema. It retains account records, teams,
conversations, submissions and historical judging snapshots. Existing
databases created with `prisma db push` are aligned and their migration history
is baselined. The command refuses generated plans that drop stored tables,
columns or types. It does not reset the database. It synchronizes the 14
published NASA Space Apps 2026 challenges from the checked-in official catalogue.

The authenticated challenge explorer is read-only for every role, including
organizers. Local creation, editing, publication, archiving, demo seeding and
legacy-choice reconciliation are removed. Current custom choices are cleared
so teams can select an official NASA challenge. Old custom records remain
excluded from discovery without deleting project or judging history.

The team workspace remains at `/dashboard/participant/team`. Its **Team overview**
link opens the incoming card interface, including username invitations and
confirmation dialogs. Team discovery also links to the incoming card browser.
The shared profile screen includes custom skills and the challenge dropdown.

Configure the submission deadline in `apps/api/.env` on each machine:

```dotenv
SUBMISSION_DEADLINE=2026-11-14T23:59:59+02:00
```

Local database contents and the local deadline setting are not transferred by Git.
