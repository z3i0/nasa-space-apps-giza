# Account isolation and role approvals — 18 October 2026

The participant overview previously used hardcoded sample statistics: a full team, Earth Science, two mentor sessions and a partially completed checklist. It now loads `/api/account/overview`, scoped by the server-validated session user ID. New accounts have empty skills/challenge/team data and an incomplete checklist. The overview links to the existing profile, challenge and team editors.

Sign-up accepts a requested participant, mentor or judge role. Everyone initially receives participant access; mentor/judge requests are stored separately in `role_applications`. No role is granted by selecting it in a form. Existing accounts can request mentor/judge access through the role selector at sign-in. The organizer role cannot be publicly requested.

Organizers review requests at `/dashboard/organizer/role-requests` (Role approvals in navigation). Approval atomically adds the requested role, records the reviewing organizer and time, and updates the primary role. Declines persist the review note and remove that role. Organizers can change an approved request to denied, or accept a previously denied request. The UI submits the expected status to reject stale concurrent decisions. Applicants cannot read the approval queue or review requests. Existing organizer-created mentor/judge accounts retain their assigned roles.

Mentor and judge applicants enter their requested dashboard immediately. Its shell shows pending or denied status while protected content stays unmounted. A server-verified access gate on every mentor/judge route polls every five seconds while visible, and refreshes on return to the tab. Acceptance opens the real dashboard automatically; denial removes it; reacceptance restores it. Organizer requests also refresh automatically. Role authorization always uses the current database roles, including with an existing session. Role selection determines the dashboard destination and never grants API permissions. Denied mentors also lose access to previously assigned mentor conversations, notes and slots; current team members retain their own team access.

The participant profile challenge is a dropdown loaded from published, non-archived event challenges. Arabic titles are shown when available; the canonical title is saved as the existing profile preference. Previous free-text selections are retained as disabled legacy options until replaced or cleared. Empty/loading/error states are explicit. The team's official challenge remains managed through the team/challenge workflow.

Sign-in no longer automatically navigates to a previous browser session or offers shared demo credentials. It signs out the prior session, signs in with the supplied credentials, verifies `/api/auth/me` matches the submitted email, and asks the server for the authorized selected role. Failed/ambiguous sign-in responses stay failures. Session hints are cleared before switching accounts. Same-account profile updates preserve their current token.

Authentication state subscribes to storage changes. A different account signing in or out in another tab reloads an open dashboard to sign-in. Dashboard component state is keyed by account ID, so cached profile/team state cannot survive an identity change. Profiles use the same-origin API proxy alongside teams and other workspaces.

Verification includes separate live database accounts, blank account data, application review/denial, repeated review conflicts, public organizer request rejection, real HTTP permission checks before and after approval, account-switch browser checks, stale identity rejection, cross-tab changes and localized registration.

Migration: `20261019000000_role_applications`, applied to local PostgreSQL. Test records are removed after verification.

## Organizer approval entry points

The overview now embeds the actionable mentor/judge approval queue directly below its welcome header. The sidebar link **Mentor & judge approvals** is directly below Overview. `/dashboard/organizer/mentors` contains mentor approval controls; `/dashboard/organizer/judges` contains judge approval controls above the judging setup. These role pages filter the same queue, show pending requests first, and keep declined applicants available for reacceptance.
