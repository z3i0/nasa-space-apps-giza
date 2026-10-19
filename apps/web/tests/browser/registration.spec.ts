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
    await page.route("**/api/auth/register", async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        name: user.name,
        email: user.email,
        phone: "+201000000001",
        password: "NewPassword123!",
        requestedRole: "participant",
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
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click()
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "do not match"
  )
  expect(writes).toBe(0)
})
