import { expect, test, type BrowserContext, type Page } from "@playwright/test"

// Browser fixtures only; no backend accounts or permissions are changed.
async function prepareSession(
  context: BrowserContext,
  page: Page,
  role: string,
  roles: string[],
  status = "approved"
) {
  const user = {
    id: "role-lock-review",
    name: "Role Review",
    email: "role-review@example.test",
    role,
    roles,
  }
  await context.addCookies(
    Object.entries({
      auth_token: "browser-fixture",
      auth_user: JSON.stringify(user),
      auth_role: role,
      auth_roles: JSON.stringify(roles),
    }).map(([name, value]) => ({
      name,
      value: encodeURIComponent(value),
      url: "http://localhost:3000",
    }))
  )
  await context.addInitScript((value) => {
    localStorage.setItem("hackathon_user", JSON.stringify(value))
  }, user)

  const requests: string[] = []
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname
    requests.push(path)
    const responses: Record<string, unknown> = {
      [`/api/account/access/${role}`]: { role, roles, status, reason: "" },
      "/api/account/notifications": { notifications: [], unreadCount: 0 },
      "/api/judging/assignments": [],
      "/api/judging/results": null,
      "/api/mentorship/mentors": [],
      "/api/mentorship/requests": [],
      "/api/account/role-applications": [],
      "/api/account/organizer-summary": {
        participants: 0,
        mentors: 0,
        judges: 0,
        teams: 0,
        submitted: 0,
        pending: 0,
        assigned: 0,
        completed: 0,
        deadline: null,
      },
      "/api/account/overview": {
        skills: [],
        challenge: null,
        profileComplete: false,
        team: null,
        mentorshipCount: 0,
        submitted: false,
        applications: [],
      },
    }
    return path in responses
      ? route.fulfill({ json: responses[path] })
      : route.fulfill({ status: 404, json: { message: "Unmocked endpoint" } })
  })
  return requests
}

for (const role of ["judge", "mentor", "organizer"]) {
  test(`${role} has no dashboard switcher and cannot open participant pages`, async ({
    page,
    context,
  }) => {
    const requests = await prepareSession(context, page, role, [
      "participant",
      role,
    ])
    await page.goto(`/en/dashboard/${role}`)
    await expect(page.locator("[data-dashboard-shell]")).toBeVisible()
    await expect(page.locator("main h1").first()).toBeVisible()

    await page.getByRole("button", { name: "User Menu: Role Review" }).click()
    const menu = page.getByRole("menu")
    await expect(menu.getByText("Switch View", { exact: true })).toHaveCount(0)
    await expect(menu.locator('a[href*="/dashboard/participant"]')).toHaveCount(
      0
    )
    await expect(
      menu.getByRole("menuitem", { name: "Profile", exact: true })
    ).toHaveAttribute("href", new RegExp(`/dashboard/${role}/`))
    await page.keyboard.press("Escape")

    await page.keyboard.press("Control+k")
    const search = page.getByRole("dialog")
    await expect(search).toBeVisible()
    await expect(search.getByText("Switch View", { exact: true })).toHaveCount(
      0
    )
    await expect(
      search.getByRole("option", {
        name: /^(Participant|Mentor|Judge|Organizer) Dashboard$/,
      })
    ).toHaveCount(0)
    await search.getByRole("option").first().click()
    await expect(search).not.toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/dashboard/${role}$`))

    await page.goto("/en/dashboard/participant/profile")
    await expect(page).toHaveURL(new RegExp(`/dashboard/${role}$`))
    await expect(page.locator("[data-dashboard-shell]")).toBeVisible()
    expect(requests).not.toContain("/api/profiles/me")
    expect(requests).not.toContain("/api/account/overview")
    expect(requests).not.toContain("/api/account/challenge-options")
  })
}

test("Arabic judge URLs stay in the mentor's own dashboard", async ({
  page,
  context,
}) => {
  const requests = await prepareSession(context, page, "mentor", [
    "participant",
    "mentor",
  ])
  await page.goto("/ar/dashboard/judge")
  await expect(page).toHaveURL(/\/dashboard\/mentor$/)
  await expect(page.locator("html")).toHaveAttribute("lang", "ar")
  await expect(page.locator("[data-dashboard-shell]")).toHaveAttribute(
    "dir",
    "rtl"
  )
  expect(requests).not.toContain("/api/account/access/judge")
  expect(requests).not.toContain("/api/judging/assignments")
})

test("participants cannot open mentor or judge dashboards", async ({
  page,
  context,
}) => {
  const requests = await prepareSession(context, page, "participant", [
    "participant",
  ])
  for (const role of ["judge", "mentor"]) {
    await page.goto(`/en/dashboard/${role}`)
    await expect(page).toHaveURL(/\/dashboard\/participant$/)
    await expect(page.locator("main h1")).toBeVisible()
    expect(requests).not.toContain(`/api/account/access/${role}`)
  }
})

for (const role of ["judge", "mentor"]) {
  test(`pending ${role} stays in its approval screen from dashboard and participant URLs`, async ({
    page,
    context,
  }) => {
    const requests = await prepareSession(
      context,
      page,
      role,
      ["participant"],
      "pending"
    )
    for (const path of ["/en/dashboard", "/en/dashboard/participant"]) {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`/dashboard/${role}$`))
      await expect(
        page.getByRole("heading", { name: "Pending approval", exact: true })
      ).toBeVisible()
    }
    expect(requests).not.toContain("/api/account/overview")
    expect(requests).not.toContain("/api/judging/assignments")
    expect(requests).not.toContain("/api/mentorship/mentors")
  })
}

test("competition search stays limited to its existing organizer overview", async ({
  page,
  context,
}) => {
  await prepareSession(context, page, "competition", ["competition"])
  await page.goto("/en/dashboard/competition")
  await expect(page).toHaveURL(/\/dashboard\/organizer$/)
  await expect(page.locator("[data-dashboard-navigation] a")).toHaveCount(1)
  await page.keyboard.press("Control+k")
  const search = page.getByRole("dialog")
  await expect(search.getByRole("option")).toHaveCount(1)
  await search.getByRole("option").click()
  await expect(search).not.toBeVisible()
  await expect(page).toHaveURL(/\/dashboard\/organizer$/)
})
