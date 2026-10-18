import { expect, test, type BrowserContext } from "@playwright/test"

for (const locale of ["en", "ar"]) {
  for (const outcome of ["success", "lost-response", "invalid", "other-user", "offline"]) {
    test(`${locale} submitted login handles ${outcome}`, async ({ page }) => {
      let submitted = false
      const user = { id: "login-user", name: "Login User", email: "login@example.test", role: "participant" }
      const session = { token: "login-session", expiresAt: "2099-01-01T00:00:00.000Z" }
      await page.route("**/api/auth/get-session**", route => {
        if (submitted && outcome === "offline") return route.abort("failed")
        return route.fulfill({ json: submitted ? {
          user: outcome === "other-user" ? { ...user, email: "other@example.test" } : user,
          session,
        } : null })
      })
      await page.route("**/api/auth/sign-in/email", route => {
        expect(new URL(route.request().url()).origin).toBe("http://localhost:3000")
        submitted = true
        if (["lost-response", "other-user", "offline"].includes(outcome)) return route.abort("failed")
        if (outcome === "invalid") return route.fulfill({ status: 401, json: { message: "Invalid credentials" } })
        return route.fulfill({ json: { user, token: session.token } })
      })
      await page.goto(`/${locale}/login`)
      await page.locator('input[type="email"]').fill(user.email)
      await page.locator('input[type="password"]').fill("test-password")
      await page.locator('button[type="submit"]').click()
      if (["success", "lost-response"].includes(outcome)) {
        await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard/participant$`))
        await expect(page.locator("[data-dashboard-shell]")).toBeVisible()
      } else {
        await expect(page.locator('button[type="submit"]')).toBeEnabled()
        await expect(page).toHaveURL(new RegExp(`/${locale}/login$`))
        expect(await page.evaluate(() => localStorage.getItem("hackathon_user"))).toBeNull()
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
      auth_token: "expired-session-fixture",
      ...(roles === undefined ? {} : { auth_roles: roles }),
    })
    // Use the context request so the saved browser cookies are included.
    const response = await context.request.get("/en/dashboard/participant", {
      maxRedirects: 5,
    })
    expect(response.status()).toBe(200)
    expect(new URL(response.url()).pathname).toBe("/en/login")
  })
}

for (const locale of ["en", "ar"]) {
  test(`${locale} sign-in recovers from expired cookies and cached user data`, async ({
    page,
    context,
  }) => {
    await setCookies(context, {
      auth_token: "expired-session-fixture",
      auth_roles: '["participant"]',
      auth_role: "participant",
    })
    await page.addInitScript(() => {
      localStorage.setItem(
        "hackathon_user",
        JSON.stringify({
          id: "expired-user",
          name: "Expired User",
          roles: ["participant"],
        })
      )
    })
    await page.route("**/auth/get-session**", (route) =>
      route.fulfill({ json: null })
    )
    await page.goto(`/${locale}/login`)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/${locale}/login$`))
    expect(
      await page.evaluate(() => localStorage.getItem("hackathon_user"))
    ).toBeNull()
    expect(
      (await context.cookies()).find((cookie) => cookie.name === "auth_token")
    ).toBeUndefined()
  })
}

test("verified session restores missing role cookies before dashboard navigation", async ({
  page,
  context,
}) => {
  await setCookies(context, { "better-auth.session_token": "session-fixture" })
  await page.route("**/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "verified-user",
          name: "Verified User",
          email: "verified@example.test",
          role: "participant",
        },
        session: {
          token: "verified-session-fixture",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      },
    })
  )
  await page.goto("/en/login")
  await expect(page).toHaveURL(/\/en\/dashboard\/participant$/)
  await expect(page.locator("[data-dashboard-shell]")).toBeVisible()
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "auth_role")
      ?.value
  ).toBe("participant")
})

test("role restrictions redirect to the user's own dashboard", async ({
  context,
}) => {
  await setCookies(context, {
    auth_token: "session-fixture",
    auth_roles: '["participant"]',
  })
  const response = await context.request.get("/ar/dashboard/organizer", {
    maxRedirects: 5,
  })
  expect(response.status()).toBe(200)
  expect(new URL(response.url()).pathname).toBe("/ar/dashboard/participant")
})
