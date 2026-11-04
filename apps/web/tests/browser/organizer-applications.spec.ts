import { expect, test, type Page } from "@playwright/test"
import type { RoleApplication } from "../../lib/account"
import { expectUniformCards } from "./card-grid-assertions"

const bio =
  "I help teams explore NASA datasets and explain uncertainty. Bring your Python questions and early prototypes. We can turn your observations into a focused, useful climate story together."
async function setup(page: Page, mixed = false) {
  const user = {
    id: "organizer",
    name: "Organizer",
    email: "organizer@example.test",
    role: "organizer",
    roles: ["organizer"],
  }
  const origin = new URL(test.info().project.use.baseURL as string).origin
  await page.context().addCookies(
    Object.entries({
      auth_token: "fixture",
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
    ...Array.from({ length: 7 }, (_, i): RoleApplication => ({
      id: `m${i}`,
      role: "mentor",
      status: "pending",
      reason: "",
      createdAt: new Date(2026, 9, i + 1).toISOString(),
      user: {
        id: `m${i}`,
        name: `Mentor ${i + 1}`,
        email: `mentor${i}.long.email.address@example.test`,
      },
    })),
    ...Array.from({ length: 2 }, (_, i): RoleApplication => ({
      id: `j${i}`,
      role: "judge",
      status: "pending",
      reason: "",
      createdAt: new Date(2026, 9, i + 1).toISOString(),
      user: {
        id: `j${i}`,
        name: `Judge ${i + 1}`,
        email: `judge${i}@example.test`,
      },
    })),
  ]
  const writes: { decision: string; reason: string; expectedStatus: string }[] =
    []
  if (mixed) {
    applications[1].user!.name =
      "Mentor with a considerably longer name for this directory"
    applications[1].user!.email =
      "mentor.with.a.very.long.contact.address@research.example.test"
    applications[2].reason = "A longer review note ".repeat(30)
    applications.at(-1)!.user!.name = "Judge with a considerably longer name"
    applications.at(-1)!.reason = "Existing note ".repeat(30)
  }
  const profiles: string[] = []
  await page.route("**/api/account/**", (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/review")) {
      const item = applications.find((item) =>
        path.includes(`/${item.id}/review`)
      )!
      const payload = route.request().postDataJSON()
      expect(payload.expectedStatus).toBe(item.status)
      writes.push(payload)
      item.status = payload.decision
      item.reason = payload.reason
      return route.fulfill({ json: item })
    }
    return route.fulfill({
      json: path.endsWith("/role-applications")
        ? applications
        : { notifications: [], unreadCount: 0 },
    })
  })
  await page.route("**/api/profiles/**", (route) => {
    profiles.push(new URL(route.request().url()).pathname.split("/").at(-1)!)
    return route.fulfill({
      json: {
        bio: mixed && route.request().url().endsWith("/m1") ? null : bio,
        skills:
          mixed && route.request().url().endsWith("/m1")
            ? []
            : [
                "Python",
                "NASA datasets",
                "Research",
                "Data visualization",
                "GIS",
                "Storytelling",
                "Prototyping",
              ],
      },
    })
  })
  return { applications, writes, profiles }
}

async function editNote(page: Page, name: string, note: string) {
  await page
    .getByRole("article", { name, exact: true })
    .getByRole("button", { name: "Review note (optional)", exact: true })
    .click()
  await page.getByRole("dialog").getByLabel("Review note (optional)").fill(note)
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Done", exact: true })
    .click()
}

async function expectNote(page: Page, name: string, note: string) {
  await page
    .getByRole("article", { name, exact: true })
    .getByRole("button", { name: "Review note (optional)", exact: true })
    .click()
  await expect(
    page.getByRole("dialog").getByLabel("Review note (optional)")
  ).toHaveValue(note)
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Done", exact: true })
    .click()
}

test("mentor signup details, drafts, pagination, and review notes work together", async ({
  page,
}) => {
  const { writes } = await setup(page)
  await page.goto("/en/dashboard/organizer/role-requests")
  const main = page.locator("main")
  await expect(main.getByRole("article")).toHaveCount(6)
  const first = page.getByRole("article", { name: "Mentor 1", exact: true })
  await expect(first).toContainText("Python")
  await expect(first).toContainText(bio)
  await first.getByRole("button", { name: "Show full details" }).click()
  await expect(
    page.getByRole("dialog").getByText("Prototyping", { exact: true })
  ).toBeVisible()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Done", exact: true })
    .click()
  await editNote(page, "Mentor 1", "Welcome! Please focus on climate datasets.")
  await page.getByRole("button", { name: /Judge requests/ }).click()
  await expect(main.getByRole("article")).toHaveCount(2)
  await page.getByRole("button", { name: /Mentor requests/ }).click()
  await expectNote(
    page,
    "Mentor 1",
    "Welcome! Please focus on climate datasets."
  )
  await main.getByRole("button", { name: "Next", exact: true }).click()
  await expect(main.getByRole("article")).toHaveCount(1)
  await expect(main.getByRole("article").first()).toHaveAccessibleName(
    "Mentor 7"
  )
  await page.getByLabel("Search applicants").fill("mentor0.long")
  await first.getByRole("button", { name: "Approve access" }).click()
  await expect(
    main.getByRole("status").filter({ hasText: "Mentor 1: Approved." })
  ).toBeVisible()
  expect(writes).toEqual([
    {
      decision: "approved",
      reason: "Welcome! Please focus on climate datasets.",
      expectedStatus: "pending",
    },
  ])
  await page
    .getByRole("combobox", { name: "Request status", exact: true })
    .selectOption("approved")
  await expectNote(page, "Mentor 1", writes[0].reason)
  await page.reload()
  await page
    .getByRole("combobox", { name: "Request status", exact: true })
    .selectOption("approved")
  await expectNote(page, "Mentor 1", writes[0].reason)
})

test("judge requests stay compact and can be declined then reconsidered", async ({
  page,
}) => {
  const { writes, profiles } = await setup(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/en/dashboard/organizer/role-requests")
  await page.getByRole("button", { name: /Judge requests/ }).click()
  const card = page.getByRole("article", { name: "Judge 1", exact: true })
  await expect(card).toBeVisible()
  await expect(
    card.getByRole("heading", { name: "About", exact: true })
  ).toHaveCount(0)
  await expect(
    card.getByText("No bio added yet.", { exact: true })
  ).toHaveCount(0)
  expect((await card.boundingBox())!.height).toBeLessThan(370)
  expect(profiles.some((id) => id.startsWith("j"))).toBe(false)
  await editNote(
    page,
    "Judge 1",
    "Please contact the event team to confirm your availability."
  )
  await card.getByRole("button", { name: "Decline request" }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Judge 1: Declined." })
  ).toBeVisible()
  await page
    .getByRole("combobox", { name: "Request status", exact: true })
    .selectOption("rejected")
  await expect(card).toBeVisible()
  await editNote(page, "Judge 1", "Availability confirmed.")
  await card.getByRole("button", { name: "Approve access" }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Judge 1: Approved." })
  ).toBeVisible()
  expect(writes.at(-1)).toEqual({
    decision: "approved",
    reason: "Availability confirmed.",
    expectedStatus: "rejected",
  })
})

test("profile and decision failures keep honest feedback and preserve drafted notes", async ({
  page,
}) => {
  await setup(page)
  await page.route("**/api/profiles/**", (route) =>
    route.fulfill({ status: 503, json: {} })
  )
  await page.route("**/api/account/role-applications/*/review", (route) =>
    route.fulfill({
      status: 409,
      json: { message: "This request has changed. Refresh before reviewing." },
    })
  )
  await page.goto("/en/dashboard/organizer/role-requests")
  const card = page.getByRole("article", { name: "Mentor 1", exact: true })
  await expect(card.getByRole("alert")).toContainText(
    "Mentoring details couldn’t be loaded."
  )
  await expect(
    card.getByText("No bio added yet.", { exact: true })
  ).toHaveCount(0)
  await editNote(page, "Mentor 1", "Keep this draft.")
  await card.getByRole("button", { name: "Approve access" }).click()
  await expect(
    page.getByRole("alert").filter({ hasText: "This request has changed." })
  ).toBeVisible()
  await expect(
    card.getByRole("button", { name: "Approve access" })
  ).toBeEnabled()
  await expectNote(page, "Mentor 1", "Keep this draft.")
  await page
    .locator("main")
    .getByRole("alert")
    .filter({ hasText: "This request has changed." })
    .getByRole("button", { name: "Retry" })
    .click()
  await expectNote(page, "Mentor 1", "Keep this draft.")
})

for (const [locale, width] of [
  ["en", 1440],
  ["en", 390],
  ["ar", 320],
] as const) {
  test(`${locale} approval sections and email cards fit ${width}px`, async ({
    page,
  }, testInfo) => {
    await setup(page, true)
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`/${locale}/dashboard/organizer/role-requests`)
    const group = page.getByRole("group", {
      name: locale === "ar" ? "نوع الطلب" : "Application type",
    })
    for (const [index, role] of ["mentor", "judge"].entries()) {
      await group.getByRole("button").nth(index).click()
      const cards = page.locator("main").getByRole("article")
      await expect(cards.first()).toBeVisible()
      if (role === "mentor") await expect(cards.first()).toContainText("Python")
      await expectUniformCards(cards)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      ).toBe(true)
      expect(
        await cards.first().evaluate((el) => el.scrollWidth <= el.clientWidth)
      ).toBe(true)
      if (width === 1440)
        expect((await cards.nth(0).boundingBox())!.y).toBe(
          (await cards.nth(1).boundingBox())!.y
        )
      await page.screenshot({
        path: testInfo.outputPath(`requests-${role}-${locale}-${width}.png`),
        fullPage: true,
      })
      const heights = await cards.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height)
      )
      await cards
        .first()
        .getByRole("button")
        .filter({
          hasText: locale === "ar" ? "ملاحظة المراجعة" : "Review note",
        })
        .click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible()
      await dialog.getByRole("textbox").fill("A long note ".repeat(50))
      await page.screenshot({
        path: testInfo.outputPath(`notes-${role}-${locale}-${width}.png`),
      })
      await page.keyboard.press("Escape")
      await expectUniformCards(cards)
      expect(
        await cards.evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().height)
        )
      ).toEqual(heights)
    }
    expect(errors).toEqual([])
  })
}
