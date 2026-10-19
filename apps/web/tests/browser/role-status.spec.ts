import { expect, test } from "@playwright/test"
import { profileFixture, profileSession } from "./fixtures/profile"

for (const role of ["judge", "mentor"]) {
  test(`${role} signup opens its own pending dashboard`, async ({ page }) => {
    const user = {
      id: `new-${role}`,
      name: `New ${role}`,
      email: `${role}@example.test`,
      role: "participant",
    }
    await page.route("**/api/auth/register", (r) => {
      expect(r.request().postDataJSON().requestedRole).toBe(role)
      return r.fulfill({ status: 201, json: { user } })
    })
    await page.route("**/api/auth/sign-out", (r) =>
      r.fulfill({ json: { success: true } })
    )
    await page.route("**/api/auth/sign-in/email", (r) =>
      r.fulfill({ json: { user, token: "new-session" } })
    )
    await page.route(`**/api/account/access/${role}`, (r) =>
      r.fulfill({
        json: { role, roles: ["participant"], status: "pending", reason: "" },
      })
    )
    await page.goto("/en/register")
    await page.getByRole("combobox").selectOption(role)
    await page.locator('input[autocomplete="name"]').fill(user.name)
    await page.locator('input[type="email"]').fill(user.email)
    await page.locator('input[type="tel"]').fill("+201000000001")
    await page.locator('input[type="password"]').nth(0).fill("NewPassword123!")
    await page.locator('input[type="password"]').nth(1).fill("NewPassword123!")
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/${role}$`))
    await expect(
      page.getByRole("heading", {
        name: `${role === "judge" ? "Judge" : "Mentor"} dashboard`,
        exact: true,
      })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Pending approval", exact: true })
    ).toBeVisible()
  })
  test(`${role} dashboard automatically changes pending, accepted, denied, accepted`, async ({
    page,
    context,
  }, testInfo) => {
    const user = {
      id: "applicant",
      name: "Applicant",
      email: "applicant@example.test",
      role,
      roles: ["participant"],
    }
    await context.addCookies(
      Object.entries({
        auth_token: "fixture",
        auth_user: JSON.stringify(user),
        auth_role: role,
        auth_roles: JSON.stringify(user.roles),
      }).map(([name, value]) => ({
        name,
        value: encodeURIComponent(value),
        url: "http://localhost:3000",
      }))
    )
    let status = "pending",
      protectedRequests = 0
    await page.route(`**/api/account/access/${role}`, (r) =>
      r.fulfill({
        json: {
          role,
          roles:
            status === "approved" ? ["participant", role] : ["participant"],
          status,
          reason: status === "rejected" ? "Review declined" : "",
        },
      })
    )
    await page.route("**/api/judging/assignments", (r) => {
      protectedRequests++
      return r.fulfill({ json: [] })
    })
    await page.route("**/api/judging/results", (r) => r.fulfill({ json: null }))
    await page.route("**/api/mentorship/mentors", (r) => {
      protectedRequests++
      return r.fulfill({ json: [] })
    })
    await page.route("**/api/mentorship/requests", (r) =>
      r.fulfill({ json: [] })
    )
    await page.goto(`/en/dashboard/${role}`)
    await expect(
      page.getByRole("heading", { name: "Pending approval", exact: true })
    ).toBeVisible()
    expect(protectedRequests).toBe(0)
    await page.screenshot({
      path: testInfo.outputPath(`${role}-pending.png`),
      fullPage: true,
    })
    status = "approved"
    await expect(
      page.getByText(
        `${role === "judge" ? "Judge" : "Mentor"} access: accepted`,
        { exact: true }
      )
    ).toBeVisible({ timeout: 10000 })
    await expect.poll(() => protectedRequests).toBeGreaterThan(0)
    status = "rejected"
    await expect(
      page.getByRole("heading", { name: "Declined", exact: true })
    ).toBeVisible({ timeout: 10000 })
    const count = protectedRequests
    await expect(
      page.getByText("Review declined", { exact: true })
    ).toBeVisible()
    status = "approved"
    await expect(
      page.getByText(
        `${role === "judge" ? "Judge" : "Mentor"} access: accepted`,
        { exact: true }
      )
    ).toBeVisible({ timeout: 10000 })
    await expect.poll(() => protectedRequests).toBeGreaterThan(count)
  })
}
test("participant chooses a published challenge from the dropdown and saves it", async ({
  page,
  context,
}) => {
  await profileSession(context)
  let profile = structuredClone(profileFixture)
  await page.route("**/api/account/challenge-options", (r) =>
    r.fulfill({
      json: [
        { id: "earth", title: "Earth observation", titleAr: "رصد الأرض" },
        {
          id: "climate",
          title: "Climate resilience",
          titleAr: "المرونة المناخية",
        },
      ],
    })
  )
  await page.route("**/api/profiles/me", (r) => {
    if (r.request().method() === "PATCH") {
      const { name, phone, expectedUpdatedAt, ...fields } = r
        .request()
        .postDataJSON()
      expect(expectedUpdatedAt).toBe(profile.updatedAt)
      expect(fields.preferredChallenge).toBe("Climate resilience")
      profile = {
        ...profile,
        ...fields,
        user: { ...profile.user, name, phone },
        updatedAt: "2026-10-18T20:00:00.000Z",
      }
    }
    return r.fulfill({ json: profile })
  })
  await page.goto("/en/dashboard/participant/profile")
  await page.locator("#profile-challenge").selectOption("Climate resilience")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByRole("status")).toHaveText("Changes saved")
  await page.reload()
  await expect(page.locator("#profile-challenge")).toHaveValue(
    "Climate resilience"
  )
})
