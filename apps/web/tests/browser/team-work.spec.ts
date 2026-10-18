import { expect, test, type Page } from "@playwright/test"
import { profileSession } from "./fixtures/profile"
import type { Team, SubmissionState } from "../../lib/teams"

const crew: Team = {
  id: "crew",
  name: "NileScope",
  description: null,
  challenge: "Earth",
  track: null,
  maxMembers: 5,
  membersCount: 2,
  myRole: "leader",
  members: [
    {
      id: "m1",
      userId: "profile-user",
      role: "leader",
      assignedRole: null,
      user: { id: "profile-user", name: "Amira", avatar: null },
    },
    {
      id: "m2",
      userId: "member",
      role: "member",
      assignedRole: null,
      user: { id: "member", name: "Omar", avatar: null },
    },
  ],
  tasks: [
    {
      id: "task1",
      title: "Explore satellite data",
      description: "Find useful datasets.",
      status: "not_started",
      assignedToId: "member",
      dueDate: "2026-10-25T23:59:59.000Z",
    },
  ],
}
async function fixture(
  page: Page,
  options: {
    member?: boolean
    closed?: boolean
    noDeadline?: boolean
    noTeam?: boolean
    allStatuses?: boolean
  } = {}
) {
  const team = structuredClone(crew)
  if (options.allStatuses) {
    team.tasks!.push(
      {
        ...team.tasks![0],
        id: "task2",
        title: "Build the prototype",
        status: "in_progress",
        description: "Turn the selected datasets into a clear, accessible map.",
      },
      {
        ...team.tasks![0],
        id: "task3",
        title: "Choose our challenge",
        status: "completed",
        description: "Agree on the problem our team will solve.",
      }
    )
  }
  if (options.member) team.myRole = "member"
  let project: SubmissionState = {
    submission: null,
    canEdit: !options.member && !options.closed,
    deadline: options.noDeadline
      ? null
      : options.closed
        ? "2020-01-01T00:00:00Z"
        : "2099-10-25T18:00:00Z",
  }
  let fail = false
  const writes: { path: string; body: Record<string, unknown> }[] = []
  await page.route(/\/api\/teams(?:\/|\?|$)/, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/teams",
      ""
    )
    if (route.request().method() === "GET")
      return route.fulfill({
        json:
          path === "/me" ? (options.noTeam ? { team: null } : team) : project,
      })
    if (fail)
      return route.fulfill({
        status: 409,
        json: { code: "SUBMISSION_CONFLICT" },
      })
    const body = route.request().postDataJSON() || {}
    writes.push({ path, body })
    if (path === "/crew/submission") {
      project = {
        ...project,
        submission: {
          ...body,
          version: body.version + 1,
          status:
            project.submission?.status === "submitted"
              ? "submitted"
              : body.status,
          submittedAt:
            body.status === "submitted" ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        },
      }
      return route.fulfill({ json: project })
    }
    if (path === "/crew/tasks") team.tasks!.push({ ...body, id: "new-task" })
    else if (route.request().method() === "DELETE")
      team.tasks = team.tasks!.filter((task) => path !== `/tasks/${task.id}`)
    else
      team.tasks = team.tasks!.map((task) =>
        path === `/tasks/${task.id}` ? { ...task, ...body } : task
      )
    return route.fulfill({ json: { success: true } })
  })
  return {
    writes,
    fail: () => {
      fail = true
    },
  }
}
test.beforeEach(async ({ context }) => profileSession(context))

test("tasks persist creation, assignment, edits, status, and deletion", async ({
  page,
}) => {
  const api = await fixture(page)
  await page.goto("/en/dashboard/participant/tasks")
  await page.getByRole("button", { name: "New task", exact: true }).click()
  await page
    .getByLabel("Task title", { exact: true })
    .fill("Build the prototype")
  await page
    .getByRole("combobox", { name: "Assigned to", exact: true })
    .selectOption("member")
  await page.getByLabel("Due date", { exact: true }).fill("2026-10-25")
  await page.getByRole("button", { name: "Save task", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Build the prototype" })
  ).toBeVisible()
  await page.reload()
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Build the prototype" }) })
  await card
    .getByLabel("Status of Build the prototype")
    .selectOption("completed")
  await expect(page.getByText("1 of 2 tasks completed")).toBeVisible()
  await card.getByRole("button", { name: "Edit task" }).click()
  await page
    .getByRole("combobox", { name: "Assigned to", exact: true })
    .selectOption("")
  await page.getByLabel("Due date", { exact: true }).fill("")
  await page.getByRole("button", { name: "Save task" }).click()
  await expect(card).toContainText("Unassigned")
  expect(api.writes.at(-1)?.body).toMatchObject({
    assignedToId: null,
    dueDate: null,
  })
  page.once("dialog", (dialog) => dialog.accept())
  await card.getByRole("button", { name: "Delete task" }).click()
  await expect(
    page.getByRole("heading", { name: "Build the prototype" })
  ).toHaveCount(0)
})

test("members can update tasks but cannot delete or submit", async ({
  page,
}) => {
  await fixture(page, { member: true })
  await page.goto("/en/dashboard/participant/tasks")
  await expect(page.getByRole("button", { name: "New task" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Delete task" })).toHaveCount(0)
  await page.goto("/en/dashboard/participant/submit")
  await expect(page.getByLabel("Project title", { exact: true })).toBeDisabled()
  await expect(
    page.getByRole("button", { name: "Submit project" })
  ).toHaveCount(0)
})

test("project drafts persist, submit, and remain submitted after editing", async ({
  page,
}) => {
  await fixture(page)
  await page.goto("/en/dashboard/participant/submit")
  await page.getByLabel("Project title", { exact: true }).fill("Flood signals")
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  await expect(page.getByText("Draft saved.", { exact: false })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Project title", { exact: true })).toHaveValue(
    "Flood signals"
  )
  await expect(
    page.getByRole("button", { name: "Submit project" })
  ).toBeDisabled()
  await page
    .getByLabel("Project summary", { exact: true })
    .fill("Flood forecasts for local communities")
  await page.getByLabel("Challenge", { exact: true }).fill("Earth observation")
  await page
    .getByLabel("Project page URL", { exact: true })
    .fill("https://example.org/flood")
  page.once("dialog", (dialog) => dialog.accept())
  await page
    .getByRole("button", { name: "Submit project", exact: true })
    .click()
  await expect(
    page.getByText("Your project is submitted.", { exact: false })
  ).toBeVisible()
  await page
    .getByLabel("Project title", { exact: true })
    .fill("Flood signals v2")
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.reload()
  await expect(page.getByLabel("Project title", { exact: true })).toHaveValue(
    "Flood signals v2"
  )
  await expect(page.getByText("Submitted", { exact: true })).toBeVisible()
})

test("conflicts preserve unsaved project edits", async ({ page }) => {
  const api = await fixture(page)
  await page.goto("/en/dashboard/participant/submit")
  await page.getByLabel("Project title", { exact: true }).fill("Keep my edits")
  api.fail()
  await page.getByRole("button", { name: "Save draft" }).click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "newer version"
  )
  await expect(page.getByLabel("Project title", { exact: true })).toHaveValue(
    "Keep my edits"
  )
})

test("closed deadlines lock edits and missing deadlines allow drafts only", async ({
  page,
}) => {
  await fixture(page, { closed: true })
  await page.goto("/en/dashboard/participant/submit")
  await expect(
    page.getByText("The deadline has passed.", { exact: false })
  ).toBeVisible()
  await expect(page.getByLabel("Project title", { exact: true })).toBeDisabled()
  await page.unrouteAll()
  await fixture(page, { noDeadline: true })
  await page.reload()
  await expect(page.getByLabel("Project title", { exact: true })).toBeEnabled()
  await expect(
    page.getByRole("button", { name: "Submit project" })
  ).toBeDisabled()
})

test("participants without a team get a route to team creation", async ({
  page,
}) => {
  await fixture(page, { noTeam: true })
  for (const route of ["tasks", "submit"]) {
    await page.goto(`/en/dashboard/participant/${route}`)
    await expect(
      page.getByRole("heading", { name: "Start your mission" })
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "New task" })).toHaveCount(0)
  }
})

for (const locale of ["en", "ar"])
  for (const width of [1440, 320]) {
    test(`${locale} work screens fit ${width}px`, async ({ page }, info) => {
      await fixture(page, { allStatuses: true })
      await page.setViewportSize({ width, height: 1000 })
      for (const route of ["tasks", "submit"]) {
        await page.goto(`/${locale}/dashboard/participant/${route}`)
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
        await expect(page.getByText("NileScope", { exact: true })).toBeVisible()
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth
          )
        ).toBe(true)
        await page.screenshot({
          path: info.outputPath(`${route}-${locale}-${width}.png`),
          fullPage: true,
        })
      }
    })
  }
