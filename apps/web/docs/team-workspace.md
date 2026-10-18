# Participant team workspace

Implemented on 17 October 2026 at `/en/dashboard/participant/team` and
`/en/dashboard/participant/find-team`, with equivalent Arabic routes.

Participants can create and edit a team, search teams, send a join request,
accept or decline an invitation, and leave a team. Leaders can invite registered
participants by email, approve or decline join requests, remove members, and
transfer leadership. A leader must transfer leadership before leaving a team
with other members. Leaving as the only member deletes the team after confirmation.

Both screens use the existing dashboard theme and support mobile layouts and RTL.
The landing page and shared visual components are unchanged. Invitations appear
inside the workspace; sending notification emails is not part of this milestone.
The team workspace checks for activity every 30 seconds while visible and idle,
and when the tab becomes visible again. Updates show an in-page activity notice.
Polling pauses while editing, sending invitations, or performing an action.

Participant profiles include a required contact number when saving. Creating a
team, requesting membership, accepting an invitation, and taking leadership
require a valid saved number. Existing accounts without one are directed to their
profile. Formatted and Arabic-digit numbers are normalized before validation.

The join form shows the current leader's contact through an authenticated endpoint.
The receiving leader sees the applicant's number, bio, skills, interests,
experience, education, preferred role/challenge, and profile links inside an
expandable request. Each collapsed card shows the applicant's profile photo
(with initials as a fallback), name, and up to three skills. Opening the card
reveals their introduction, full profile, and approve/decline controls. Cards
support keyboard interaction and English/Arabic layouts. The form explains this sharing even for profiles hidden from public
search. Only the current leader receives applications; teammates can see their
own roster's phone numbers. Public team and profile listings omit phone numbers.

## API and integrity

- Browser requests use `/api/teams` on the web origin, forwarded to the configured
  API. Authentication uses the validated session cookie.
- `GET /teams/requests/me` returns the caller's pending invitations and join requests.
- `POST /teams/:id/invitations` supports an email address or the existing user ID.
  Responses expose only invitation metadata, not the invited user's account record.
- `POST /teams/:id/leadership` transfers leadership to an existing member.
- `GET /teams/:id/leader` returns current leader contact only after authentication.
- Existing team endpoints provide creation, search, details, approvals, and removal.
- Admissions, removals, and leadership changes use serializable transactions with
  bounded retries. Capacity checks happen in the same transaction as admission.
  The five-member cap applies to both invitations and join requests; the existing
  unique membership constraint keeps each participant in one team.
- Names are trimmed before DTO validation and require 3–50 characters.

## Verification

- Team service unit tests and four live database scenarios, including three
  simultaneous approvals competing for the fifth seat.
- Browser coverage for creation/edit persistence, invitations, approvals,
  permission-dependent controls, leadership transfer, leaving, search, pending
  requests, failed loads/saves, and English/Arabic layouts at 1440, 390, and 320px.
- A live three-account browser workflow verified the HTTP API, session cookies,
  and database persistence. Its disposable users and team were removed afterward.

## Tasks and submissions — 18 October 2026

`/en/dashboard/participant/tasks` and its Arabic equivalent now use the task API.
Members can create tasks, assign teammates, edit descriptions, clear assignments
and due dates, and change status. Only the leader can delete tasks. Task details
are returned through the authenticated team view, not public team discovery.
Due dates are calendar dates stored at 23:59:59 UTC and displayed as that same
calendar date regardless of the viewer's timezone.

`/en/dashboard/participant/submit` and its Arabic equivalent provide saved drafts
and final submission. All teammates can view their project; only the current
leader can edit or submit it. Final submission requires a title, summary,
challenge, and project URL. Repository and demo links are optional. Links must
use HTTP or HTTPS. Editing a submitted project keeps it submitted.

The new authenticated `GET/PUT /teams/:id/submission` endpoints store the project
in `team_submissions`. Version checks and a serializable transaction prevent stale
tabs from overwriting a newer save, and synchronize the team's submission status.
The general team update endpoint cannot bypass submission validation.

### Deployment

- Apply `apps/api/prisma/migrations/20261018120000_team_submissions/migration.sql`
  and regenerate Prisma before starting the updated API. The table and migration
  record have already been applied to this workspace's local development database.
- Set `SUBMISSION_DEADLINE` in the API environment to the actual event deadline,
  using ISO 8601 with an explicit timezone, then restart the API. No event date is
  assumed. Without a valid deadline, drafts are allowed and final submission is
  disabled. At or after the deadline, the server rejects all project writes.
- Deadline and submission timestamps are displayed in Cairo time.
- The repository's older migration history does not fully describe the current
  schema. The local change was applied as the additive SQL above and marked
  applied; reconcile historical migrations before provisioning a fresh database.

### Verification for this milestone

- 21 backend unit tests covering tasks, submission validation, permissions,
  missing/expired deadlines, conflicting versions, and submitted project edits.
- Browser scenarios cover task creation/editing/deletion, saved drafts, final
  submission, failed saves retaining input, permissions, empty states, and both
  languages at desktop and narrow mobile widths.
- `node --env-file=.env test/team-work-smoke.mjs` (from `apps/api`, after build)
  verifies real database persistence and simultaneous submission saves, and
  removes its own disposable fixtures afterward.

Next: connect the organizer submissions list to these saved projects and build
the judging/review workflow. Email/push notifications remain outside this change;
request activity currently uses the in-page notice and automatic refresh.
