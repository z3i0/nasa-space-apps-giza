import { expect, test, type Page, type BrowserContext } from "@playwright/test"
import type { Assignment, Management } from "../../lib/judging"

const initial: Assignment = {
  id: "assignment",
  judgeId: "judge",
  teamId: "team",
  rubricId: "rubric",
  submissionVersion: 3,
  snapshot: {
    teamName: "NileScope",
    title: "Our changing planet",
    summary:
      "We use satellite observations to explain how our local climate is changing.",
    challenge: "Earth science",
    projectUrl: "https://example.com",
    repositoryUrl: "https://github.com/example/project",
    demoUrl: "",
  },
  rubric: {
    id: "rubric",
    name: "Local event rubric v1",
    criteria: [
      { name: "Science", weight: 60 },
      { name: "Impact", weight: 40 },
    ],
  },
  scores: {},
  feedback: "",
  completed: false,
  version: 1,
  judge: { name: "Judge A" },
}
async function fixture(page: Page, context: BrowserContext, role = "judge") {
  await page.route("**/api/account/role-applications", (r) =>
    r.fulfill({ json: [] })
  )
  await page.route("**/api/account/access/judge", (r) =>
    r.fulfill({
      json: { role: "judge", roles: [role], status: "approved", reason: "" },
    })
  )
  const user = {
    id: "judge",
    name: "Judge A",
    email: "judge@example.test",
    role,
    roles: [role],
  }
  await context.addCookies(
    Object.entries({
      auth_token: "fixture",
      auth_user: JSON.stringify(user),
      auth_role: role,
      auth_roles: JSON.stringify([role]),
    }).map(([name, value]) => ({
      name,
      value: encodeURIComponent(value),
      url: "http://localhost:3000",
    }))
  )
  await context.addInitScript(
    (value) => localStorage.setItem("hackathon_user", JSON.stringify(value)),
    user
  )
  let a = structuredClone(initial)
  const management: Management = {
    rubrics: [a.rubric],
    judges: [{ id: "judge", name: "Judge A" }],
    teams: [
      {
        id: "team",
        name: "NileScope",
        submission: { title: a.snapshot.title, version: 3 },
      },
    ],
    assignments: [a],
    rankings: [],
    publication: null,
  }
  await page.route(/\/api\/judging(?:\/|$)/, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/judging",
      ""
    )
    if (path === "/assignments" && route.request().method() === "GET")
      return route.fulfill({ json: [a] })
    if (path === "/results")
      return route.fulfill({ json: management.publication })
    if (path === "/manage")
      return route.fulfill({ json: { ...management, assignments: [a] } })
    if (path === "/assignments/assignment") {
      a = { ...a, ...route.request().postDataJSON(), version: a.version + 1 }
      return route.fulfill({ json: a })
    }
    if (path === "/rubrics") {
      const rubric = { id: "new", ...route.request().postDataJSON() }
      management.rubrics.push(rubric)
      return route.fulfill({ json: rubric })
    }
    if (path === "/assignments") return route.fulfill({ json: a })
    return route.fulfill({
      status: 409,
      json: {
        message: "Complete every assigned evaluation before publishing.",
      },
    })
  })
}

test("judge saves a draft, reloads it, finalizes, and sees real progress", async ({
  page,
  context,
}, testInfo) => {
  await fixture(page, context)
  await page.goto("/en/dashboard/judge")
  await expect(
    page.getByRole("heading", { name: "Judge dashboard" })
  ).toBeVisible()
  await page
    .getByRole("link", { name: "Evaluate project", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: "Our changing planet" })
  ).toBeVisible()
  await page.getByRole("spinbutton", { name: "Science", exact: true }).fill("8")
  await page.getByRole("spinbutton", { name: "Impact", exact: true }).fill("9")
  await page
    .getByLabel("Feedback for the project")
    .fill("Strong scientific basis. Explain the uncertainty more clearly.")
  await expect(page.getByText("84.0 / 100")).toBeVisible()
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Changes saved successfully." })
  ).toHaveText("Changes saved successfully.")
  await page.reload()
  await expect(
    page.getByRole("spinbutton", { name: "Science", exact: true })
  ).toHaveValue("8")
  await page
    .getByRole("button", { name: "Finalize evaluation", exact: true })
    .click()
  await expect(
    page.getByText(
      "Evaluation finalized and saved. This evaluation is now read only."
    )
  ).toBeVisible()
  await expect(
    page.getByRole("spinbutton", { name: "Science", exact: true })
  ).toBeDisabled()
  await page.getByRole("link", { name: "Overview", exact: true }).last().click()
  await expect(page.getByText("100%", { exact: true }).first()).toBeVisible()
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    window.scrollTo({ top: 0, behavior: "instant" })
  })
  await page.screenshot({
    path: testInfo.outputPath("judge-dashboard.png"),
    fullPage: true,
  })
})
test("judge dashboard handles an empty unpublished-results response", async ({ page, context }) => {
  await fixture(page, context)
  await page.route("**/api/judging/results", (route) =>
    route.fulfill({ status: 200, body: "" })
  )
  await page.goto("/en/dashboard/judge")
  await expect(page.getByRole("heading", { name: "Judge dashboard", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Evaluate project", exact: true })).toBeVisible()
  await expect(page.getByRole("alert").filter({ hasText: /JSON|empty response/ })).toHaveCount(0)
})

test("organizer creates rubric and gets a publication validation error", async ({
  page,
  context,
}, testInfo) => {
  await fixture(page, context, "organizer")
  await page.goto("/en/dashboard/organizer/judges")
  await expect(
    page.getByRole("heading", { name: "Judging control room" })
  ).toBeVisible()
  await page.getByLabel("Rubric version name").fill("Event rubric v2")
  await page.getByLabel("Criterion 1", { exact: true }).fill("Innovation")
  await page
    .getByRole("button", { name: "Create rubric version", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: "Event rubric v2" })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Publish leaderboard", exact: true })
    .click()
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Complete every assigned evaluation" })
  ).toContainText("Complete every assigned evaluation")
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    window.scrollTo({ top: 0, behavior: "instant" })
  })
  await page.screenshot({
    path: testInfo.outputPath("organizer-judging.png"),
    fullPage: true,
  })
})
test("Arabic judge workspace is responsive and right to left", async ({
  page,
  context,
}, testInfo) => {
  await fixture(page, context)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/ar/dashboard/judge")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.getByRole("heading", { name: "لوحة المحكم" })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.screenshot({
    path: testInfo.outputPath("judge-arabic-mobile.png"),
    fullPage: true,
  })
})
