import { expect, test, type Page } from "@playwright/test"
import { profileSession } from "./fixtures/profile"
import type { Team, TeamInbox } from "../../lib/teams"

const crew: Team = {
  id: "crew",
  name: "NileScope",
  description: "Turning Earth data into resilient communities.",
  challenge: "Earth observation",
  track: "Climate",
  maxMembers: 5,
  membersCount: 2,
  myRole: "leader",
  members: [
    {
      id: "m1",
      userId: "profile-user",
      role: "leader",
      assignedRole: null,
      user: { id: "profile-user", name: "Amira Ragab", avatar: null },
    },
    {
      id: "m2",
      userId: "member",
      role: "member",
      assignedRole: "GIS",
      user: { id: "member", name: "Omar Ali", avatar: null },
    },
  ],
  invitations: [],
  joinRequests: [
    {
      id: "join1",
      message: "I build accessible maps.",
      user: {
        name: "Mona",
        avatar:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%236366f1'/%3E%3C/svg%3E",
        phone: "+201022334455",
        profile: {
          bio: "I analyse satellite imagery.",
          skills: ["Python", "GIS"],
          interests: ["Climate"],
          experience: "Built a flood map.",
          institution: "Cairo University",
          academicLevel: "Graduate",
          desiredRole: "GIS analyst",
          preferredChallenge: "Earth observation",
          githubUrl: "https://github.com/example",
          linkedinUrl: null,
          portfolioUrl: null,
        },
      },
    },
  ],
}

async function fixture(
  page: Page,
  initial: Team | null = structuredClone(crew)
) {
  let mine = initial
  const inbox: TeamInbox = { invitations: [], joinRequests: [] }
  const writes: { path: string; body: Record<string, string | boolean> }[] = []
  let failure = 0
  let failureCode: string | undefined
  await page.route(/\/api\/teams(?:\/|\?|$)/, async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace("/api/teams", "")
    const method = route.request().method()
    if (failure)
      return route.fulfill({ status: failure, json: { code: failureCode } })
    if (method !== "GET") {
      const body = route.request().postDataJSON() || {}
      writes.push({ path, body })
      if (!path)
        mine = {
          ...structuredClone(crew),
          ...body,
          membersCount: 1,
          members: [crew.members[0]],
        }
      if (path === "/crew") mine = { ...mine!, ...body }
      if (path === "/crew/invitations")
        mine!.invitations = [
          { id: "inv1", invitedUser: { name: "Invited pilot" } },
        ]
      if (path === "/join-requests/join1/respond") {
        mine!.joinRequests = []
        if (body.accept) {
          mine!.membersCount++
          mine!.members.push({
            id: "m3",
            userId: "new",
            role: "member",
            assignedRole: null,
            user: { id: "new", name: "Mona", avatar: null },
          })
        }
      }
      if (path === "/invitations/inv1/respond") {
        inbox.invitations = []
        if (body.accept) mine = { ...structuredClone(crew), myRole: "member" }
      }
      if (path === "/crew/members/member") {
        mine!.members = mine!.members.filter((m) => m.userId !== "member")
        mine!.membersCount--
      }
      if (path === "/crew/leadership") {
        mine!.myRole = "member"
        mine!.members = mine!.members.map((m) => ({
          ...m,
          role: m.userId === body.userId ? "leader" : "member",
        }))
      }
      if (path === "/crew/members/profile-user") mine = null
      if (path === "/crew/join-requests")
        inbox.joinRequests = [
          { id: "pending", teamId: "crew", team: { name: "NileScope" } },
        ]
      return route.fulfill({ json: mine || { success: true } })
    }
    if (path === "/me") return route.fulfill({ json: mine || { team: null } })
    if (path === "/requests/me") return route.fulfill({ json: inbox })
    if (path === "/crew/leader")
      return route.fulfill({
        json: {
          id: "profile-user",
          name: "Amira Ragab",
          phone: "+201000000001",
        },
      })
    const items =
      !url.searchParams.get("search") ||
      "NileScope".includes(url.searchParams.get("search")!)
        ? [crew]
        : []
    return route.fulfill({
      json: { items, total: items.length, page: 1, totalPages: 1 },
    })
  })
  return {
    inbox,
    writes,
    fail: (status: number, code?: string) => {
      failure = status
      failureCode = code
    },
  }
}

test.beforeEach(async ({ context }) => profileSession(context))

test("new requests appear automatically with an activity notice", async ({
  page,
}) => {
  await page.clock.install()
  const team = structuredClone(crew)
  team.joinRequests = []
  await fixture(page, team)
  await page.goto("/en/dashboard/participant/team")
  await expect(
    page.getByText("No pending requests.", { exact: false })
  ).toBeVisible()
  team.joinRequests = structuredClone(crew.joinRequests)
  await page.clock.fastForward(30_000)
  await expect(page.locator("summary")).toContainText("Mona")
  await expect(
    page.getByText("Your team activity has been updated.", { exact: false })
  ).toBeVisible()
})

for (const locale of ["en", "ar"])
  for (const width of [1440, 390, 320]) {
    test(`${locale} team workspace fits ${width}px`, async ({ page }, info) => {
      await fixture(page)
      await page.setViewportSize({ width, height: 1000 })
      await page.goto(`/${locale}/dashboard/participant/team`)
      await expect(
        page.getByRole("heading", { name: "NileScope" })
      ).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      ).toBe(true)
      await expect(page.locator("[data-dashboard-shell]")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr"
      )
      await page.screenshot({
        path: info.outputPath(`team-${locale}-${width}.png`),
        fullPage: true,
      })
      await page.locator("summary").click()
      await expect(
        page.getByText("Built a flood map.", { exact: true })
      ).toBeVisible()
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      ).toBe(true)
      await page.screenshot({
        path: info.outputPath(`request-open-${locale}-${width}.png`),
        fullPage: true,
      })
      await page.goto(`/${locale}/dashboard/participant/find-team`)
      await expect(
        page.getByRole("heading", { name: "NileScope" })
      ).toBeVisible()
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      ).toBe(true)
    })
  }

test("creates a team, edits it, and restores changes after reload", async ({
  page,
}) => {
  const api = await fixture(page, null)
  await page.goto("/en/dashboard/participant/team")
  await page.getByLabel("Team name", { exact: true }).fill("   ")
  await page.getByRole("button", { name: "Create team", exact: true }).click()
  await expect(
    page.locator("[data-team-workspace]").getByRole("alert")
  ).toContainText("three characters")
  expect(api.writes).toHaveLength(0)
  await page.getByLabel("Team name", { exact: true }).fill("Orbit Makers")
  await page.getByRole("button", { name: "Create team", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Orbit Makers" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Edit team details" }).click()
  await page.getByLabel("About your team (optional)").fill("A shared mission")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(
    page.getByText("A shared mission", { exact: true })
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByText("A shared mission", { exact: true })
  ).toBeVisible()
  expect(api.writes).toHaveLength(2)
})

test("leader invites by email and approves join requests into the roster", async ({
  page,
}) => {
  const api = await fixture(page)
  await page.goto("/en/dashboard/participant/team")
  await expect(page.locator("summary")).toContainText("Mona")
  await expect(
    page.locator("summary").getByText("Python", { exact: true })
  ).toBeVisible()
  await expect(page.locator("summary img")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Approve", exact: true })
  ).not.toBeVisible()
  await expect(
    page.getByText("I analyse satellite imagery.", { exact: true })
  ).not.toBeVisible()
  await page.locator("summary").focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("link", { name: "+201022334455", exact: true })
  ).toHaveAttribute("href", "tel:+201022334455")
  await expect(
    page.getByText("I analyse satellite imagery.", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("Built a flood map.", { exact: true })
  ).toBeVisible()
  await expect(page.locator("details[open]")).toHaveCount(1)
  await expect(
    page.getByText("Cairo University", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "GitHub", exact: true })
  ).toHaveAttribute("href", "https://github.com/example")
  await page.getByLabel("Participant email").fill("pilot@example.test")
  await page.getByRole("button", { name: "Send invitation" }).click()
  await expect(page.getByText("Invited pilot")).toBeVisible()
  expect(api.writes[0].body).toEqual({ email: "pilot@example.test" })
  await page.getByRole("button", { name: "Approve", exact: true }).click()
  await expect(page.getByText("3 / 5 members")).toBeVisible()
  await expect(
    page.getByText("No pending requests.", { exact: false })
  ).toBeVisible()
})

test("full team disables invitations and approval, while allowing declines", async ({
  page,
}) => {
  await fixture(page, { ...structuredClone(crew), membersCount: 5 })
  await page.goto("/en/dashboard/participant/team")
  await page.locator("summary").click()
  await expect(
    page.getByRole("button", { name: "Send invitation" })
  ).toBeDisabled()
  await expect(
    page.getByRole("button", { name: "Approve", exact: true })
  ).toBeDisabled()
  await expect(
    page.getByRole("button", { name: "Decline", exact: true })
  ).toBeEnabled()
})

test("member cannot see leader controls and can leave", async ({ page }) => {
  await fixture(page, { ...structuredClone(crew), myRole: "member" })
  await page.goto("/en/dashboard/participant/team")
  await expect(
    page.getByRole("button", { name: "Leave team", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Edit team details" })
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Remove", exact: true })
  ).toHaveCount(0)
  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Leave team", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Create team", exact: true })
  ).toBeVisible()
})

test("removal can be cancelled, and leadership transfer removes leader controls", async ({
  page,
}) => {
  const api = await fixture(page)
  await page.goto("/en/dashboard/participant/team")
  page.once("dialog", (dialog) => dialog.dismiss())
  await page.getByRole("button", { name: "Remove", exact: true }).click()
  expect(api.writes).toHaveLength(0)
  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Make leader", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Leave team", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Make leader", exact: true })
  ).toHaveCount(0)
})

test("incoming invitation can be accepted", async ({ page }) => {
  const api = await fixture(page, null)
  api.inbox.invitations = [
    { id: "inv1", teamId: "crew", team: { name: "NileScope" } },
  ]
  await page.goto("/en/dashboard/participant/team")
  await page.getByRole("button", { name: "Accept invitation" }).click()
  await expect(page.getByRole("heading", { name: "NileScope" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Create team", exact: true })
  ).toHaveCount(0)
})

test("search and join request survive reload without duplicate submissions", async ({
  page,
}) => {
  const api = await fixture(page, null)
  await page.goto("/en/dashboard/participant/find-team")
  await page.getByLabel("Search teams", { exact: true }).fill("Unknown")
  await page.getByRole("button", { name: "Search", exact: true }).click()
  await expect(page.getByText("Your crew is still out there")).toBeVisible()
  await page.getByLabel("Search teams", { exact: true }).fill("Nile")
  await page.getByRole("button", { name: "Search", exact: true }).click()
  await page
    .getByRole("button", { name: "Request to join", exact: true })
    .click()
  await expect(
    page.getByRole("link", { name: "+201000000001", exact: true })
  ).toHaveAttribute("href", "tel:+201000000001")
  await expect(
    page.getByText("Sending this request shares", { exact: false })
  ).toBeVisible()
  await page
    .getByLabel("Introduce yourself (optional)")
    .fill("I work with satellite data")
  await page.getByRole("button", { name: "Send join request" }).click()
  await expect(
    page.getByRole("button", { name: "Awaiting approval" })
  ).toBeDisabled()
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Awaiting approval" })
  ).toBeDisabled()
  expect(api.writes).toHaveLength(1)
})

test("missing contact directs participants to their profile without losing the team draft", async ({
  page,
}) => {
  const api = await fixture(page, null)
  await page.goto("/en/dashboard/participant/team")
  await page.getByLabel("Team name", { exact: true }).fill("My new crew")
  api.fail(400, "CONTACT_REQUIRED")
  await page.getByRole("button", { name: "Create team", exact: true }).click()
  const alert = page.locator("[data-team-workspace]").getByRole("alert")
  await expect(alert).toContainText("Add a valid contact number")
  await expect(
    alert.getByRole("link", { name: "Update my profile" })
  ).toHaveAttribute("href", "/en/dashboard/participant/profile")
  await expect(page.getByLabel("Team name", { exact: true })).toHaveValue(
    "My new crew"
  )
})

test("load failures show retry and never show a false empty team", async ({
  page,
}) => {
  const api = await fixture(page)
  api.fail(500)
  await page.goto("/en/dashboard/participant/team")
  await expect(page.getByRole("alert")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Create team", exact: true })
  ).toHaveCount(0)
  api.fail(0)
  await page.getByRole("button", { name: "Refresh", exact: true }).click()
  await expect(page.getByRole("heading", { name: "NileScope" })).toBeVisible()
})

test("failed saves preserve edits and expose expired sessions", async ({
  page,
}) => {
  const api = await fixture(page)
  await page.goto("/en/dashboard/participant/team")
  await page.getByRole("button", { name: "Edit team details" }).click()
  await page.getByLabel("Team name", { exact: true }).fill("Keep my draft")
  api.fail(401)
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible()
  await expect(page.getByLabel("Team name", { exact: true })).toHaveValue(
    "Keep my draft"
  )
})
