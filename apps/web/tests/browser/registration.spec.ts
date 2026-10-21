import { expect, test } from "@playwright/test"

for (const locale of ["en", "ar"]) {
  test(`${locale} new participant can create an account and enter the dashboard`, async ({
    page,
  }) => {
    const user = {
      id: "new-participant",
      name: "New Participant",
      email: "new@example.test",
      role: "participant",
    }
    let registered = false
    await page.route("**/api/auth/registration-options", (route) =>
      route.fulfill({
        json: [
          {
            id: "challenge-1",
            title: "Earth System Challenge",
            titleAr: "تحدي نظام الأرض",
          },
        ],
      })
    )
    await page.route("**/api/auth/register", async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        name: user.name,
        email: user.email,
        phone: "+201000000001",
        password: "NewPassword123!",
        requestedRole: "participant",
        institution: "Cairo University",
        academicLevel: "Year 3",
        skills: ["Python", "Machine Learning"],
        bio: "Curious about climate data.",
        interests: ["Earth science", "AI"],
        experience: "Built a satellite image classifier.",
        preferredChallenge: "Earth System Challenge",
        teamStatus: "want_to_create_team",
        desiredRole: "Python / Machine Learning",
      })
      registered = true
      return route.fulfill({
        status: 201,
        json: { user, tokens: { accessToken: "registered" } },
      })
    })
    await page.route("**/api/auth/sign-in/email", (route) => {
      expect(registered).toBe(true)
      return route.fulfill({ json: { user, token: "signed-in-session" } })
    })
    await page.goto(`/${locale}/register`)
    await page.locator('input[autocomplete="name"]').fill(user.name)
    await page.locator('input[type="email"]').fill("NEW@example.test")
    await page.locator('input[type="tel"]').fill("+201000000001")
    await page.locator('input[type="password"]').nth(0).fill("NewPassword123!")
    await page.locator('input[type="password"]').nth(1).fill("NewPassword123!")
    await page
      .getByRole("button", { name: locale === "en" ? "Continue" : "متابعة" })
      .click()
    await page.locator('[name="institution"]').fill("Cairo University")
    await page
      .getByRole("combobox", {
        name:
          locale === "en"
            ? "Academic year / level"
            : "السنة الدراسية / المستوى",
      })
      .click()
    await page
      .getByRole("option", {
        name: locale === "en" ? "Year 3" : "السنة الثالثة",
        exact: true,
      })
      .click()
    await page.locator('[name="skills"]').fill("Python, Machine Learning")
    await page.locator('[name="bio"]').fill("Curious about climate data.")
    await page.locator('[name="interests"]').fill("Earth science, AI")
    await page
      .locator('[name="experience"]')
      .fill("Built a satellite image classifier.")
    await page
      .getByRole("button", { name: locale === "en" ? "Continue" : "متابعة" })
      .click()
    await page
      .getByRole("combobox", {
        name: locale === "en" ? "Preferred challenge" : "التحدي المفضل",
      })
      .click()
    await page
      .getByRole("option", {
        name: locale === "en" ? "Earth System Challenge" : "تحدي نظام الأرض",
      })
      .click()
    await page
      .getByRole("combobox", {
        name:
          locale === "en" ? "Preferred team role" : "الدور المفضل في الفريق",
      })
      .click()
    await page
      .getByRole("option", {
        name:
          locale === "en" ? "Python / Machine Learning" : "Python / تعلم الآلة",
      })
      .click()
    await page
      .getByRole("combobox", {
        name: locale === "en" ? "Team status" : "حالة الفريق",
      })
      .click()
    await page
      .getByRole("option", {
        name:
          locale === "en" ? "I want to create a team" : "أرغب في إنشاء فريق",
      })
      .click()
    await page
      .getByRole("button", {
        name: locale === "en" ? "Create account" : "إنشاء حساب",
        exact: true,
      })
      .click()
    await expect(page).toHaveURL(/\/dashboard\/participant$/)
    await expect(page.locator("html")).toHaveAttribute("lang", locale)
    await expect(page.locator("[data-dashboard-shell]")).toBeVisible()
  })
}

test("login offers registration and duplicate emails have a clear error", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: null })
  )
  await page.route("**/api/auth/register", (route) =>
    route.fulfill({ status: 409, json: { message: "Already registered" } })
  )
  await page.goto("/en/login")
  await page.getByRole("link", { name: "Create an account" }).click()
  await expect(page).toHaveURL(/\/register$/)
  await page.locator('input[autocomplete="name"]').fill("New Participant")
  await page.locator('input[type="email"]').fill("existing@example.test")
  await page.locator('input[type="tel"]').fill("+201000000001")
  await page.locator('input[type="password"]').nth(0).fill("NewPassword123!")
  await page.locator('input[type="password"]').nth(1).fill("NewPassword123!")
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Continue" }).click()
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "already exists"
  )
  await expect(
    page.getByRole("button", { name: "Create account", exact: true })
  ).toBeEnabled()
})

test("mismatched passwords do not create an account", async ({ page }) => {
  let writes = 0
  await page.route("**/api/auth/register", (route) => {
    writes++
    return route.fulfill({ status: 201, json: {} })
  })
  await page.goto("/en/register")
  await page.locator('input[autocomplete="name"]').fill("New Participant")
  await page.locator('input[type="email"]').fill("new@example.test")
  await page.locator('input[type="tel"]').fill("+201000000001")
  await page.locator('input[type="password"]').nth(0).fill("NewPassword123!")
  await page.locator('input[type="password"]').nth(1).fill("DifferentPassword!")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "do not match"
  )
  expect(writes).toBe(0)
})

test("interactive skill and interest chip selection, custom inputs, and review", async ({
  page,
}) => {
  await page.route("**/api/auth/registration-options", (route) =>
    route.fulfill({
      json: [],
    })
  )
  const registeredData: Record<string, unknown>[] = []
  await page.route("**/api/auth/register", async (route) => {
    registeredData.push(
      route.request().postDataJSON() as Record<string, unknown>
    )
    return route.fulfill({
      status: 201,
      json: {
        user: {
          id: "test",
          name: "Chip Participant",
          email: "chip@example.test",
          role: "participant",
        },
        tokens: { accessToken: "token" },
      },
    })
  })
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "test",
          name: "Chip Participant",
          email: "chip@example.test",
          role: "participant",
        },
        token: "signed-in",
      },
    })
  )

  await page.goto("/en/register")
  await page.locator('input[autocomplete="name"]').fill("Chip Participant")
  await page.locator('input[type="email"]').fill("chip@example.test")
  await page.locator('input[type="tel"]').fill("+201000000002")
  await page.locator('input[type="password"]').nth(0).fill("Password123!")
  await page.locator('input[type="password"]').nth(1).fill("Password123!")
  await page.getByRole("button", { name: "Continue" }).click()

  // On step 2
  // 1. Click popular skill pills
  await page.getByRole("button", { name: /Python/i }).click()
  await page.getByRole("button", { name: /GIS/i }).click()

  // 2. Add custom skill
  await page.locator("#custom-skill-input").fill("Next.js")
  await page.getByRole("button", { name: "Add skill" }).click()

  // 3. Click popular interest pills
  await page.getByRole("button", { name: /Earth observation/i }).click()
  await page.getByRole("button", { name: /Space exploration/i }).click()

  // 4. Add custom interest
  await page.locator("#custom-interest-input").fill("Astrophysics")
  await page.getByRole("button", { name: "Add interest" }).click()

  await page.getByRole("button", { name: "Continue" }).click()

  // On step 3: Check review badges
  await expect(page.getByText("Python", { exact: true })).toBeVisible()
  await expect(page.getByText("GIS", { exact: true })).toBeVisible()
  await expect(page.getByText("Next.js", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Earth observation", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("Space exploration", { exact: true })
  ).toBeVisible()
  await expect(page.getByText("Astrophysics", { exact: true })).toBeVisible()

  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click()
  expect(registeredData[0]?.skills).toEqual(
    expect.arrayContaining(["Python", "GIS", "Next.js"])
  )
  expect(registeredData[0]?.interests).toEqual(
    expect.arrayContaining([
      "Earth observation",
      "Space exploration",
      "Astrophysics",
    ])
  )
})

for (const locale of ["en", "ar"]) {
  test(`${locale} registration responsive at 375px mobile viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.route("**/api/auth/registration-options", (route) =>
      route.fulfill({ json: [] })
    )
    await page.goto(`/${locale}/register`)
    await page.locator('input[autocomplete="name"]').fill("Mobile User")
    await page.locator('input[type="email"]').fill("mobile@example.test")
    await page.locator('input[type="tel"]').fill("+201000000003")
    await page.locator('input[type="password"]').nth(0).fill("Password123!")
    await page.locator('input[type="password"]').nth(1).fill("Password123!")
    await page
      .getByRole("button", {
        name: locale === "en" ? "Continue" : "متابعة",
      })
      .click()

    // Step 2
    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    )
    expect(hasOverflow).toBe(false)

    // Select skills and interests
    await page.getByRole("button", { name: /Python/i }).click()
    await page.screenshot({
      path: testInfo.outputPath(`register-step2-${locale}-mobile-375.png`),
      fullPage: true,
    })

    await page
      .getByRole("button", {
        name: locale === "en" ? "Continue" : "متابعة",
      })
      .click()

    // Step 3
    const hasOverflowStep3 = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
    )
    expect(hasOverflowStep3).toBe(false)
    await page.screenshot({
      path: testInfo.outputPath(`register-step3-${locale}-mobile-375.png`),
      fullPage: true,
    })
  })
}
