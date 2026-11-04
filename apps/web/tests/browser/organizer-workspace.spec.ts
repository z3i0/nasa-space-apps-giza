import { expect, test, type Page } from "@playwright/test"
import { expectUniformCards } from "./card-grid-assertions"
import type { Mentor } from "../../lib/mentorship"
import type { RoleApplication } from "../../lib/account"
import type { Assignment, Management } from "../../lib/judging"

const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString()
const mentors: Mentor[] = [
  {
    id: "m1",
    name: "Amira Hassan",
    avatar: null,
    mentorProfile: {
      expertise: [
        "Python",
        "NASA datasets",
        "Data visualization",
        "Mapping",
        "Research",
      ],
      bio: "I help teams turn satellite observations into useful climate stories.",
      availability:
        "Afternoons work best. Bring a question and a sample dataset.",
    },
    profile: { bio: "Old bio", skills: ["python", "Prototyping"] },
    mentorSlots: [{ id: "slot", startTime: future(2), endTime: future(2.04) }],
  },
  {
    id: "m2",
    name: "Bassem Ali",
    avatar: null,
    mentorProfile: null,
    profile: {
      bio: "I help teams improve accessible interfaces.",
      skills: ["Accessibility", "UX"],
    },
    mentorSlots: [],
  },
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `m${i + 3}`,
    name: `Mentor ${i + 3}`,
    avatar: null,
    mentorProfile: null,
    profile: null,
    mentorSlots: [],
  })),
]
function assignment(id: string, completed: boolean): Assignment {
  return {
    id,
    completed,
    judgeId: "j1",
    teamId: id,
    rubricId: "rubric",
    submissionVersion: 1,
    version: 1,
    scores: {},
    feedback: "",
    rubric: { id: "rubric", name: "Event", criteria: [] },
    snapshot: {
      teamName: completed ? "Nile Orbit" : "New Horizons",
      title: "Project",
      summary: "",
      challenge: "",
      projectUrl: "",
      repositoryUrl: "",
      demoUrl: "",
    },
  }
}
const management: Management = {
  judges: [
    { id: "j1", name: "Dalia Nabil" },
    { id: "j2", name: "Omar Adel" },
  ],
  assignments: [assignment("a1", false), assignment("a2", true)],
  rubrics: [],
  teams: [],
  rankings: [],
  publication: null,
}

async function setup(page: Page) {
  const user = {
    id: "admin",
    name: "Organizer",
    email: "admin@example.test",
    role: "organizer",
    roles: ["organizer"],
  }
  const origin = new URL(test.info().project.use.baseURL as string).origin
  await page.context().addCookies(
    Object.entries({
      auth_token: "admin-ui-test",
      auth_user: JSON.stringify(user),
      auth_role: user.role,
      auth_roles: JSON.stringify(user.roles),
    }).map(([name, value]) => ({
      name,
      value: encodeURIComponent(value),
      url: origin,
    }))
  )
  await page.addInitScript(
    (value) => localStorage.setItem("hackathon_user", JSON.stringify(value)),
    user
  )
  const applications: RoleApplication[] = [
    ...Array.from({ length: 25 }, (_, i): RoleApplication => ({
      id: `pending-${i}`,
      role: i % 2 ? "judge" : "mentor",
      status: "pending",
      reason: "",
      createdAt: new Date(2026, 9, i + 1).toISOString(),
      user: {
        id: `applicant-${i}`,
        name: `Applicant ${i + 1}`,
        email: `applicant${i}@example.test`,
      },
    })),
    ...[mentors[0], ...management.judges].map((person): RoleApplication => ({
      id: `approved-${person.id}`,
      role: person.id.startsWith("m") ? "mentor" : "judge",
      status: "approved",
      reason: "",
      createdAt: future(-20),
      user: {
        id: person.id,
        name: person.name,
        email: `${person.id}@example.test`,
      },
    })),
  ]
  await page.route("**/api/account/**", (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/organizer-summary"))
      return route.fulfill({
        json: {
          participants: 42,
          mentors: 8,
          judges: 2,
          teams: 10,
          submitted: 6,
          pending: 25,
          assigned: 12,
          completed: 9,
          deadline: future(10),
        },
      })
    if (path.endsWith("/review")) {
      const item = applications.find((item) =>
        path.includes(`/${item.id}/review`)
      )!
      const payload = route.request().postDataJSON()
      expect(payload.expectedStatus).toBe(item.status)
      item.status = payload.decision
      return route.fulfill({ json: item })
    }
    if (path.endsWith("/role-applications"))
      return route.fulfill({ json: applications })
    return route.fulfill({ json: { notifications: [], unreadCount: 0 } })
  })
  await page.route("**/api/mentorship/mentors", (route) =>
    route.fulfill({ json: mentors })
  )
  await page.route("**/api/judging/manage", (route) =>
    route.fulfill({ json: management })
  )
  await page.route("**/api/profiles/**", (route) =>
    route.request().url().endsWith("/j1")
      ? route.fulfill({
          json: {
            bio: "Remote sensing researcher and product reviewer.",
            skills: ["Earth science", "Research"],
            user: { avatar: null },
          },
        })
      : route.fulfill({ status: 404, json: {} })
  )
}

test("overview stays compact and review links preserve the approval workflow", async ({
  page,
}) => {
  await setup(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/en/dashboard/organizer")
  const attention = page.getByRole("region", { name: "Needs attention" })
  await expect(attention.getByRole("listitem")).toHaveCount(3)
  await expect(attention).toContainText("25")
  await expect(page.locator("main textarea")).toHaveCount(0)
  await expect(
    page.getByRole("progressbar", { name: "Submitted projects" })
  ).toHaveAttribute("aria-valuenow", "60")
  await expect(
    page.getByRole("progressbar", { name: "Completed evaluations" })
  ).toHaveAttribute("aria-valuenow", "75")
  const bottom = await page
    .locator("main")
    .getByRole("navigation", { name: "Organizer actions" })
    .boundingBox()
  expect(bottom!.y + bottom!.height).toBeLessThan(850)
  await attention
    .getByRole("link", { name: /Applicant 1 Mentor Review/ })
    .click()
  await expect(page).toHaveURL(/\/organizer\/role-requests\?role=mentor$/)
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Applicant 1", exact: true }),
  })
  await card
    .getByRole("button", { name: "Approve access", exact: true })
    .click()
  await expect(
    page.getByRole("status").filter({ hasText: "Applicant 1: Approved." })
  ).toBeVisible()
  await page
    .getByRole("combobox", { name: "Request status", exact: true })
    .selectOption("approved")
  await expect(card).toContainText("Approved")
  await page.goto("/en/dashboard/organizer/mentors")
  await expect(
    page.getByRole("article", { name: "Amira Hassan" })
  ).toBeVisible()
  await page.getByRole("link", { name: "View approvals", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Mentor & judge approvals", exact: true })
  ).toBeVisible()
  await page.goto("/en/dashboard/organizer")
  await attention
    .getByRole("link", { name: /Applicant 2 Judge Review/ })
    .click()
  await expect(page).toHaveURL(/\/organizer\/role-requests\?role=judge$/)
  await expect(
    page.getByRole("button", { name: /Judge requests/ })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(
    page.getByRole("article", { name: "Applicant 2", exact: true })
  ).toBeVisible()
})

test("mentor cards search real profile data, combine filters, and paginate", async ({
  page,
}) => {
  await setup(page)
  await page.goto("/en/dashboard/organizer/mentors")
  const main = page.locator("main")
  await expect(main.getByRole("article")).toHaveCount(6)
  const amira = page.getByRole("article", { name: "Amira Hassan" })
  await expect(amira).toContainText(mentors[0].mentorProfile!.bio)
  await expect(amira).toContainText("Next office hour")
  await expect(amira.getByText("Python", { exact: true })).toHaveCount(1)
  await expect(page.getByRole("article", { name: "Bassem Ali" })).toContainText(
    "accessible interfaces"
  )
  await main.getByRole("button", { name: "Next", exact: true }).click()
  await expect(main.getByRole("article")).toHaveCount(2)
  await page.getByLabel("Search", { exact: true }).fill("satellite")
  await expect(amira).toBeVisible()
  await expect(main.getByRole("article")).toHaveCount(1)
  await page.getByLabel("Search", { exact: true }).fill("")
  await page.getByLabel("Mentoring topic").selectOption("ux")
  await expect(page.getByRole("article", { name: "Bassem Ali" })).toBeVisible()
  await page.getByLabel("With upcoming office hours").check()
  await expect(
    page.getByRole("heading", { name: "No matches found" })
  ).toBeVisible()
  await main
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click()
  await page.getByLabel("Search", { exact: true }).fill("m1@example.test")
  await expect(amira).toBeVisible()
  await expect(main.getByRole("article")).toHaveCount(1)
  await amira.getByRole("button", { name: "View profile" }).click()
  const dialog = page.getByRole("dialog", { name: "Amira Hassan" })
  await expect(dialog.getByText("Prototyping", { exact: true })).toBeVisible()
  await expect(dialog.getByText("Research", { exact: true })).toBeVisible()
  await expect(dialog.getByText("Cairo time", { exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(
    amira.getByRole("button", { name: "View profile" })
  ).toBeFocused()
})

test("judge cards show optional profile details and real assignment workload", async ({
  page,
}) => {
  await setup(page)
  await page.goto("/en/dashboard/organizer/judges")
  const card = page.getByRole("article", { name: "Dalia Nabil" })
  await expect(card).toContainText("Remote sensing researcher")
  await expect(card).toContainText("Earth science")
  await expect(card).toContainText("j1@example.test")
  await expect(card.locator("dd")).toHaveText(["2", "1", "1"])
  await expect(page.getByRole("article", { name: "Omar Adel" })).toContainText(
    "Reviews assigned team projects."
  )
  await page.getByLabel("Review workload").selectOption("unassigned")
  await expect(page.locator("main").getByRole("article")).toHaveCount(1)
  await expect(page.getByRole("article", { name: "Omar Adel" })).toBeVisible()
  await page.getByLabel("Review workload").selectOption("pending")
  await card.getByRole("button", { name: "View profile" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toContainText("New Horizons")
  await expect(dialog).toContainText("Nile Orbit")
  await dialog.getByRole("link", { name: "Manage judging" }).click()
  await expect(page).toHaveURL(/\/organizer\/scores$/)
  await expect(
    page.getByRole("heading", { name: "Judging control room" })
  ).toBeVisible()
})

test("missing contacts or profiles do not hide people, and failures are distinct from empty data", async ({
  page,
}) => {
  await setup(page)
  await page.route("**/api/account/role-applications", (route) =>
    route.fulfill({ status: 503, json: {} })
  )
  await page.route("**/api/profiles/**", (route) =>
    route.fulfill({ status: 503, json: {} })
  )
  await page.goto("/en/dashboard/organizer/judges")
  await expect(page.locator("main").getByRole("article")).toHaveCount(2)
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Some contact details"
  )
  await expect(
    page.getByRole("article", { name: "Dalia Nabil" })
  ).toContainText("Additional profile details couldn’t be loaded.")
  await page.route("**/api/mentorship/mentors", (route) =>
    route.fulfill({ status: 503, json: {} })
  )
  await page.goto("/en/dashboard/organizer/mentors")
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Could not load event data."
  )
  await expect(page.getByText("No profiles yet", { exact: true })).toHaveCount(
    0
  )
  await page.route("**/api/mentorship/mentors", (route) =>
    route.fulfill({ json: [] })
  )
  await page
    .locator("main")
    .getByRole("button", { name: "Retry", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: "No profiles yet" })
  ).toBeVisible()
})

for (const [locale, width] of [
  ["en", 1440],
  ["en", 390],
  ["ar", 320],
] as const) {
  test(`${locale} admin pages and profile dialogs fit ${width}px`, async ({
    page,
  }, testInfo) => {
    await setup(page)
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    for (const section of ["", "/mentors", "/judges"]) {
      await page.goto(`/${locale}/dashboard/organizer${section}`)
      if (section)
        await expect(
          page.locator("main").getByRole("article").first()
        ).toBeVisible()
      else
        await expect(
          page
            .locator('section[aria-labelledby="admin-attention"]')
            .getByRole("listitem")
        ).toHaveCount(3)
      if (section)
        await expectUniformCards(page.locator("main").getByRole("article"))
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      ).toBe(true)
      if (locale === "ar")
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
      await page.screenshot({
        path: testInfo.outputPath(
          `admin${section.replace("/", "-") || "-overview"}-${locale}-${width}.png`
        ),
        fullPage: true,
      })
      if (section) {
        await page
          .locator("main")
          .getByRole("article")
          .first()
          .getByRole("button")
          .last()
          .click()
        const dialog = page.getByRole("dialog")
        await expect(dialog).toBeVisible()
        const box = await dialog.boundingBox()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)
        expect(box!.height).toBeLessThanOrEqual(900)
        expect(
          await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)
        ).toBe(true)
        await page.screenshot({
          path: testInfo.outputPath(
            `profile${section.replace("/", "-")}-${locale}-${width}.png`
          ),
        })
        await page.keyboard.press("Escape")
      }
    }
    expect(errors).toEqual([])
  })
}
