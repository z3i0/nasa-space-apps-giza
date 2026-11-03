import { expect, test, type Page } from "@playwright/test"

async function fillAccount(page: Page) {
  await page.locator('input[autocomplete="name"]').fill("Test Applicant")
  await page.locator('input[type="email"]').fill("APPLICANT@example.test")
  await page.locator('input[type="tel"]').fill("+201000000001")
  await page.locator('input[type="password"]').nth(0).fill("Password123!")
  await page.locator('input[type="password"]').nth(1).fill("Password123!")
}

async function expectCompact(page: Page, allowance = 0) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }))
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewportWidth)
  expect(dimensions.height).toBeLessThanOrEqual(
    dimensions.viewportHeight + allowance
  )
}

test("switching from participant to judge drops all profile and team fields", async ({
  page,
}) => {
  await page.route("**/api/auth/registration-options", (route) =>
    route.fulfill({ json: [] })
  )
  let submitted: Record<string, unknown> | undefined
  await page.route("**/api/auth/register", (route) => {
    submitted = route.request().postDataJSON()
    return route.fulfill({ status: 409, json: {} })
  })
  await page.goto("/en/register")
  await fillAccount(page)
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.locator('[name="institution"]').fill("Research Institute")
  await page.locator('[name="bio"]').fill("Participant bio")
  await page.locator('[name="experience"]').fill("Participant experience")
  await page.getByRole("combobox", { name: "Academic year / level" }).click()
  await page.getByRole("option", { name: "Year 3", exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.locator('[name="skills"]').fill("GIS")
  await page.locator('[name="interests"]').fill("Climate")
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("combobox", { name: "Preferred team role" }).click()
  await page.getByRole("option", { name: "Frontend", exact: true }).click()
  for (let step = 4; step > 1; step--)
    await page.getByRole("button", { name: "Back", exact: true }).click()
  await page.getByRole("combobox").click()
  await page.getByRole("option", { name: "Judge", exact: true }).click()
  // The single-step path must retain password confirmation validation.
  await page.locator('input[type="password"]').nth(1).fill("DifferentPassword!")
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "do not match"
  )
  expect(submitted).toBeUndefined()
  await page.locator('input[type="password"]').nth(1).fill("Password123!")
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "already exists"
  )
  expect(submitted).toEqual({
    name: "Test Applicant",
    email: "applicant@example.test",
    phone: "+201000000001",
    password: "Password123!",
    requestedRole: "judge",
  })
})

test("mentor validates topics on submission and preserves topics and bio when going back", async ({
  page,
}) => {
  await page.route("**/api/auth/registration-options", (route) =>
    route.fulfill({ json: [] })
  )
  let submitted: Record<string, unknown> | undefined
  await page.route("**/api/auth/register", (route) => {
    submitted = route.request().postDataJSON()
    return route.fulfill({ status: 409, json: {} })
  })
  await page.goto("/en/register")
  await page.getByRole("combobox").click()
  await page.getByRole("option", { name: "Mentor", exact: true }).click()
  await fillAccount(page)
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Short bio", exact: true })
    .fill("I mentor teams on mapping.")
  await page
    .getByLabel("Topics you mentor", { exact: true })
    .fill("x".repeat(65))
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "64 characters"
  )
  expect(submitted).toBeUndefined()
  await page
    .getByLabel("Topics you mentor", { exact: true })
    .fill("GIS, gis, Mapping")
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(
    page.getByRole("textbox", { name: "Short bio", exact: true })
  ).toHaveValue("I mentor teams on mapping.")
  await expect(
    page.getByLabel("Topics you mentor", { exact: true })
  ).toHaveValue("GIS, gis, Mapping")
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "already exists"
  )
  expect(submitted).toEqual({
    name: "Test Applicant",
    email: "applicant@example.test",
    phone: "+201000000001",
    password: "Password123!",
    requestedRole: "mentor",
    skills: ["GIS", "Mapping"],
    bio: "I mentor teams on mapping.",
  })
})

for (const locale of ["en", "ar"] as const) {
  const next = locale === "en" ? "Continue" : "متابعة"
  for (const role of ["judge", "mentor"] as const) {
    test(`${locale} ${role} signup submits only its allowed fields with the existing API contract`, async ({
      page,
    }) => {
      const roleName =
        locale === "en"
          ? role === "judge"
            ? "Judge"
            : "Mentor"
          : role === "judge"
            ? "محكم"
            : "مرشد"
      let submitted: Record<string, unknown> | undefined
      await page.route("**/api/auth/registration-options", (route) =>
        route.fulfill({ json: [] })
      )
      await page.route("**/api/auth/sign-out", (route) =>
        route.fulfill({ json: { success: true } })
      )
      await page.route("**/api/auth/register", (route) => {
        submitted = route.request().postDataJSON()
        return route.fulfill({ status: 201, json: {} })
      })
      // Exercise the created-account fallback without relying on a backend session.
      await page.route("**/api/auth/sign-in/email", (route) =>
        route.fulfill({ status: 401, json: { message: "Sign in again" } })
      )
      await page.goto(`/${locale}/register`)
      await page.getByRole("combobox").click()
      await page.getByRole("option", { name: roleName, exact: true }).click()
      await fillAccount(page)
      if (role === "mentor") {
        await page.getByRole("button", { name: next, exact: true }).click()
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          roleName
        )
        await expect(page.getByRole("combobox")).toHaveCount(0)
        await expect(page.locator("textarea")).toHaveCount(1)
        await page
          .locator('[name="bio"]')
          .fill("I help teams understand climate data.")
        await page.locator('[name="skills"]').fill("Python, python, Climate")
      } else {
        await expect(page.getByRole("progressbar")).toHaveCount(0)
        await expect(page.locator('textarea, [name="skills"]')).toHaveCount(0)
      }
      await expect(
        page.getByRole("button", { name: next, exact: true })
      ).toHaveCount(0)
      await expect(
        page.locator(
          '[name="institution"], [name="experience"], [name="interests"]'
        )
      ).toHaveCount(0)
      await page
        .getByRole("button", {
          name: locale === "en" ? "Create account" : "إنشاء حساب",
          exact: true,
        })
        .click()
      await expect(page.getByRole("status")).toContainText(
        locale === "en" ? "Your account was created" : "تم إنشاء حسابك"
      )
      expect(submitted).toEqual({
        name: "Test Applicant",
        email: "applicant@example.test",
        phone: "+201000000001",
        password: "Password123!",
        requestedRole: role,
        ...(role === "mentor"
          ? {
              skills: ["Python", "Climate"],
              bio: "I help teams understand climate data.",
            }
          : {}),
      })
    })
  }

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 1366, height: 768 },
  ]) {
    for (const role of ["participant", "judge", "mentor"] as const) {
      test(`${locale} ${role} auth screens fit ${viewport.width}x${viewport.height}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(viewport)
        await page.route("**/api/auth/registration-options", (route) =>
          route.fulfill({ json: [] })
        )
        await page.goto(`/${locale}/login`)
        await expectCompact(page)
        await page.goto(`/${locale}/register`)
        if (role !== "participant") {
          await page.getByRole("combobox").click()
          await page
            .getByRole("option", {
              name:
                locale === "en"
                  ? role === "judge"
                    ? "Judge"
                    : "Mentor"
                  : role === "judge"
                    ? "محكم"
                    : "مرشد",
              exact: true,
            })
            .click()
        }
        await fillAccount(page)
        const totalSteps =
          role === "participant" ? 4 : role === "mentor" ? 2 : 1
        for (let step = 1; step <= totalSteps; step++) {
          await expectCompact(page)
          await page.screenshot({
            path: testInfo.outputPath(`step-${step}.png`),
            fullPage: true,
          })
          if (step < totalSteps)
            await page.getByRole("button", { name: next, exact: true }).click()
        }
      })
    }
  }
}
