import { expect, test } from "@playwright/test"

test("organizer sees actionable approvals on overview, mentors, and judges", async ({
  page,
  context,
}, testInfo) => {
  const user = {
    id: "organizer",
    name: "Organizer",
    email: "organizer@example.test",
    role: "organizer",
    roles: ["organizer"],
  }
  await page.route("**/api/account/organizer-summary", (r) =>
    r.fulfill({
      json: {
        participants: 2,
        mentors: 0,
        judges: 0,
        teams: 0,
        submitted: 0,
        pending: 2,
        assigned: 0,
        completed: 0,
        deadline: "2026-11-14T23:59:59+02:00",
      },
    })
  )
  await context.addCookies(
    Object.entries({
      auth_token: "fixture",
      auth_user: JSON.stringify(user),
      auth_role: "organizer",
      auth_roles: JSON.stringify(user.roles),
    }).map(([name, value]) => ({
      name,
      value: encodeURIComponent(value),
      url: "http://localhost:3000",
    }))
  )
  const items = [
    {
      id: "mentor",
      role: "mentor",
      status: "pending",
      reason: "",
      user: { name: "Mentor Applicant", email: "mentor@example.test" },
    },
    {
      id: "judge",
      role: "judge",
      status: "pending",
      reason: "",
      user: { name: "Judge Applicant", email: "judge@example.test" },
    },
  ]
  await page.route("**/api/account/role-applications**", (r) => {
    if (r.request().method() === "POST") {
      const item = items.find((a) =>
        new URL(r.request().url()).pathname.includes(`/${a.id}/review`)
      )!
      const payload = r.request().postDataJSON()
      expect(payload.expectedStatus).toBe(item.status)
      item.status = payload.decision
      return r.fulfill({ json: item })
    }
    return r.fulfill({ json: items })
  })
  await page.route("**/api/judging/manage", (r) =>
    r.fulfill({
      json: {
        rubrics: [],
        judges: [],
        teams: [],
        assignments: [],
        rankings: [],
        publication: null,
      },
    })
  )
  await page.goto("/en/dashboard/organizer")
  await expect(
    page.getByRole("heading", { name: "Mentor & judge approvals", exact: true })
  ).toBeVisible()
  await page
    .getByRole("article")
    .filter({ hasText: "Mentor Applicant" })
    .getByRole("button", { name: "Approve access" })
    .click()
  await expect(
    page.getByRole("article").filter({ hasText: "Mentor Applicant" })
  ).toContainText("Approved")
  await page
    .getByRole("article")
    .filter({ hasText: "Judge Applicant" })
    .getByRole("button", { name: "Decline request" })
    .click()
  await expect(
    page.getByRole("article").filter({ hasText: "Judge Applicant" })
  ).toContainText("Declined")
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    window.scrollTo({ top: 0, behavior: "instant" })
  })
  await page.screenshot({
    path: testInfo.outputPath("organizer-overview-approvals.png"),
    fullPage: false,
  })
  const nav = page.locator("[data-dashboard-navigation]")
  await nav.getByRole("link", { name: "Mentors", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Mentor account approvals" })
  ).toBeVisible()
  await expect(
    page.getByRole("article").filter({ hasText: "Judge Applicant" })
  ).toHaveCount(0)
  await nav.getByRole("link", { name: "Judging Panels", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Judge account approvals" })
  ).toBeVisible()
  await page
    .getByRole("article")
    .filter({ hasText: "Judge Applicant" })
    .getByRole("button", { name: "Approve access" })
    .click()
  await expect(
    page.getByRole("article").filter({ hasText: "Judge Applicant" })
  ).toContainText("Approved")
  await nav
    .getByRole("link", { name: "Mentor & judge approvals", exact: true })
    .click()
  await expect(page).toHaveURL(/\/organizer\/role-requests$/)
  await expect(page.getByRole("article")).toHaveCount(2)
})
