import { expect, test, type Page, type BrowserContext } from "@playwright/test"
const blank = {
  skills: [],
  challenge: null,
  profileComplete: false,
  team: null,
  mentorshipCount: 0,
  submitted: false,
  applications: [],
}
const user = {
  id: "new-user",
  name: "New Participant",
  email: "new@example.test",
  role: "participant",
  roles: ["participant"],
}
async function authRoutes(page: Page, wrongIdentity = false) {
  await page.route("**/api/auth/sign-out", (r) =>
    r.fulfill({ json: { success: true } })
  )
  await page.route("**/api/auth/sign-in/email", (r) =>
    r.fulfill({ json: { user, token: "new-session" } })
  )
  await page.route("**/api/auth/me", (r) =>
    r.fulfill({
      json: wrongIdentity ? { ...user, email: "other@example.test" } : user,
    })
  )
  await page.route("**/api/account/role-selection", (r) => {
    const role = r.request().postDataJSON().role
    return r.fulfill({
      json: {
        role,
        roles: ["participant"],
        status: role === "participant" ? "approved" : "pending",
      },
    })
  })
  await page.route("**/api/account/overview", (r) => r.fulfill({ json: blank }))
  await page.route("**/api/account/access/mentor", (r) =>
    r.fulfill({
      json: {
        role: "mentor",
        roles: ["participant"],
        status: "pending",
        reason: "",
      },
    })
  )
}
async function cookies(context: BrowserContext, role = "participant") {
  const account = { ...user, role, roles: [role] }
  await context.addCookies(
    Object.entries({
      auth_token: "fixture",
      auth_user: JSON.stringify(account),
      auth_role: role,
      auth_roles: JSON.stringify([role]),
    }).map(([name, value]) => ({
      name,
      value: encodeURIComponent(value),
      url: "http://localhost:3000",
    }))
  )
}
test("switching from cached old identity opens a blank participant workspace", async ({
  page,
  context,
}, testInfo) => {
  await authRoutes(page)
  await cookies(context)
  await page.goto("/en/login")
  await page.evaluate(() =>
    localStorage.setItem(
      "hackathon_user",
      JSON.stringify({
        id: "old",
        name: "Old Participant",
        email: "old@example.test",
        role: "participant",
        roles: ["participant"],
      })
    )
  )
  await page.getByLabel("Email Address", { exact: true }).fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill("NewPassword123!")
  await page.getByLabel("Sign in as").selectOption("participant")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\/participant$/)
  await expect(
    page.getByRole("heading", { name: "Welcome, New Participant" })
  ).toBeVisible()
  await expect(
    page.getByText("You have not added any skills yet.")
  ).toBeVisible()
  await expect(page.getByText("Not selected", { exact: true })).toBeVisible()
  await expect(
    page.getByText("You have not joined a team yet.", { exact: false })
  ).toBeVisible()
  await expect(page.getByText("Earth Science", { exact: true })).toHaveCount(0)
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("hackathon_user")!).id
    )
  ).toBe("new-user")
  await page.screenshot({
    path: testInfo.outputPath("blank-participant.png"),
    fullPage: true,
  })
})
test("login cannot reuse another email's session", async ({ page }) => {
  await authRoutes(page, true)
  await page.goto("/en/login")
  await page.getByLabel("Email Address", { exact: true }).fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill("NewPassword123!")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "does not match this email"
  )
  await expect(page).toHaveURL(/\/login$/)
  expect(
    await page.evaluate(() => localStorage.getItem("hackathon_user"))
  ).toBeNull()
})
test("unapproved mentor sees pending status in the mentor dashboard", async ({
  page,
}) => {
  await authRoutes(page)
  await page.route("**/api/account/overview", (r) =>
    r.fulfill({
      json: {
        ...blank,
        applications: [
          { id: "application", role: "mentor", status: "pending", reason: "" },
        ],
      },
    })
  )
  await page.goto("/en/login")
  await page.getByLabel("Email Address", { exact: true }).fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill("NewPassword123!")
  await page.getByLabel("Sign in as").selectOption("mentor")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\/mentor$/)
  await expect(
    page.getByRole("heading", { name: "Mentor dashboard" })
  ).toBeVisible()
  await expect(
    page.getByText("Your application is pending organizer approval.", {
      exact: false,
    })
  ).toBeVisible()
})
test("organizer can approve a mentor and decline a judge", async ({
  page,
  context,
}, testInfo) => {
  await cookies(context, "organizer")
  const applications = [
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
    const path = new URL(r.request().url()).pathname
    if (path.endsWith("/review")) {
      const item = applications.find((a) => path.includes(`/${a.id}/review`))!
      item.status = r.request().postDataJSON().decision
      return r.fulfill({ json: item })
    }
    return r.fulfill({ json: applications })
  })
  await page.goto("/en/dashboard/organizer/role-requests")
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
  await page
    .getByRole("article")
    .filter({ hasText: "Judge Applicant" })
    .getByRole("button", { name: "Approve access" })
    .click()
  await expect(
    page.getByRole("article").filter({ hasText: "Judge Applicant" })
  ).toContainText("Approved")
  await page.screenshot({
    path: testInfo.outputPath("role-approvals.png"),
    fullPage: true,
  })
})
test("a sign-in change in another tab clears the old workspace", async ({
  page,
  context,
}) => {
  await cookies(context)
  await page.route("**/api/account/overview", (r) =>
    r.fulfill({
      json: {
        ...blank,
        team: {
          id: "old-team",
          name: "Previous team",
          maxMembers: 5,
          members: [],
        },
      },
    })
  )
  await page.goto("/en/dashboard/participant")
  await expect(
    page.getByRole("heading", { name: "Previous team" })
  ).toBeVisible()
  const second = await context.newPage()
  await second.goto("/en/login")
  await second.evaluate(() =>
    localStorage.setItem(
      "hackathon_user",
      JSON.stringify({
        id: "different-user",
        name: "Different User",
        email: "different@example.test",
        role: "participant",
        roles: ["participant"],
      })
    )
  )
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole("heading", { name: "Previous team" })
  ).toHaveCount(0)
})
