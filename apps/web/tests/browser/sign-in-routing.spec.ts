import { expect, test, type BrowserContext } from "@playwright/test"
for (const locale of ["en", "ar"]) {
  for (const outcome of [
    "success",
    "lost-response",
    "invalid",
    "other-user",
    "offline",
  ]) {
    test(`${locale} login requires a verified matching identity: ${outcome}`, async ({
      page,
    }) => {
      const user = {
        id: "login-user",
        name: "Login User",
        email: "login@example.test",
        role: "participant",
        roles: ["participant"],
      }
      await page.route("**/api/auth/sign-out", (r) =>
        r.fulfill({ json: { success: true } })
      )
      await page.route("**/api/auth/sign-in/email", (r) => {
        if (["lost-response", "offline"].includes(outcome))
          return r.abort("failed")
        if (outcome === "invalid")
          return r.fulfill({
            status: 401,
            json: { message: "Invalid credentials" },
          })
        return r.fulfill({ json: { user, token: "signed-in" } })
      })
      await page.route("**/api/auth/me", (r) =>
        r.fulfill({
          json:
            outcome === "other-user"
              ? { ...user, email: "other@example.test" }
              : user,
        })
      )
      await page.route("**/api/account/role-selection", (r) =>
        r.fulfill({
          json: {
            role: "participant",
            roles: ["participant"],
            status: "approved",
          },
        })
      )
      await page.route("**/api/account/overview", (r) =>
        r.fulfill({
          json: {
            skills: [],
            challenge: null,
            profileComplete: false,
            team: null,
            mentorshipCount: 0,
            submitted: false,
            applications: [],
          },
        })
      )
      await page.goto(`/${locale}/login`)
      await page.locator('input[type="email"]').fill(user.email)
      await page.locator('input[type="password"]').fill("test-password")
      await page.locator('button[type="submit"]').click()
      if (outcome === "success") {
        await expect(page).toHaveURL(/\/dashboard\/participant$/)
        await expect(page.locator("[data-dashboard-shell]")).toBeVisible()
      } else {
        await expect(page.getByRole("main").getByRole("alert")).toBeVisible()
        await expect(page.locator('button[type="submit"]')).toBeEnabled()
        await expect(page).toHaveURL(/\/login$/)
        expect(
          await page.evaluate(() => localStorage.getItem("hackathon_user"))
        ).toBeNull()
      }
    })
  }
}
async function setCookies(
  context: BrowserContext,
  values: Record<string, string>
) {
  await context.addCookies(
    Object.entries(values).map(([name, value]) => ({
      name,
      value: encodeURIComponent(value),
      url: "http://localhost:3000",
    }))
  )
}
for (const roles of [
  undefined,
  "[]",
  '"participant"',
  "null",
  "{broken",
  '["unknown"]',
]) {
  test(`incomplete session roles (${roles}) reach sign-in without a redirect loop`, async ({
    context,
  }) => {
    await setCookies(context, {
      auth_token: "expired",
      ...(roles === undefined ? {} : { auth_roles: roles }),
    })
    const response = await context.request.get("/en/dashboard/participant", {
      maxRedirects: 5,
    })
    expect(response.status()).toBe(200)
    expect(new URL(response.url()).pathname).toMatch(/\/login$/)
  })
}
test("an existing session does not skip choosing a role or force the previous account", async ({
  page,
  context,
}) => {
  await setCookies(context, {
    "better-auth.session_token": "previous-session",
    auth_user: JSON.stringify({
      id: "old",
      name: "Old User",
      roles: ["mentor"],
    }),
  })
  await page.goto("/en/login")
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.getByRole("combobox")).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})
test("role restrictions redirect to an authorized workspace", async ({
  context,
}) => {
  await setCookies(context, {
    auth_token: "fixture",
    auth_roles: '["participant"]',
  })
  const response = await context.request.get("/ar/dashboard/organizer", {
    maxRedirects: 5,
  })
  expect(response.status()).toBe(200)
  expect(new URL(response.url()).pathname).toMatch(/\/dashboard\/participant$/)
})
