# Mentorship implementation

The mentor dashboard and participant mentorship route share the existing NASA V1 dashboard shell and dark tokens. The referenced Figma file (`pBUveQll506ydWr33phJAh`, node `0:1`) returned an access error from both connected accounts on 18 October 2026. The local dashboard design reference and its original assets informed the styling; direct screenshot comparison remains pending.

## Routes

- `/[locale]/dashboard/participant/mentorship`: browse mentors, request guidance, see status, book an accepted mentor's open slot, and chat.
- `/[locale]/dashboard/mentor`: actual pending/active/upcoming counts, profile, office hours, request decisions, and chat.
- The existing mentor requests, profile, teams, sessions, and history links resolve to the same live mentorship workspace. Participant sessions also opens that workspace.

All actions use the same-origin `/api/mentorship` rewrite, with the authenticated session cookie. Authorization is enforced in NestJS, not by the browser role hint.

## API and data

`MentorProfile`, `MentorshipRequest`, `MentorshipMessage`, and `MentorSlot` are persisted by the migration `20261018120000_mentorship`. A team member can request a mentor. The mentor can accept or decline, the team can cancel, and the mentor can complete an accepted request. Each request has one conversation; only that mentor or a current member of that team can read or post. Messages are available in descending pages of 50; the UI refreshes an open conversation every five seconds while visible. A mentor can add nonoverlapping future slots. An accepted team can atomically book one open slot for its request. The mentor can write shared session notes on accepted or completed requests; the team can read them.

The chat component is isolated by request, cancels requests when closed, and prevents late responses from mixing conversations. Its message area has a bounded height, supports keyboard scrolling, preserves the viewport when older messages load, and follows new messages when already at the bottom. Saving notes displays a confirmation only after the API succeeds.

## Account creation and verification

The localized `/register` page is linked from sign-in. The registration API creates the participant, credential account, profile, role, and initial session in one nested database write. Better Auth then sets the signed browser session cookie. Duplicate emails and mismatched passwords have localized errors. Public auth input cannot assign roles or activation fields.

Verified on 18 October 2026: production web build, API build, web type checks and changed-file lint passed. The 22 auth/mentorship unit checks and six browser journeys passed. A disposable PostgreSQL integration test verified real sign-in cookies, persistent notes, teammate access, denial of unrelated participants/mentors, revoked access after leaving a team, and message-history pagination. A real browser signup against the running app also reached the dashboard and accessed the protected mentorship API. Test accounts were removed afterward.

Run the Prisma migration before starting the updated API. The app requires a configured PostgreSQL database and Better Auth session. There are no sample mentor counts or sample request records in the new UI.
