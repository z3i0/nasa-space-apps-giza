import { expect, test, type BrowserContext, type Page } from "@playwright/test"
import { profileFixture } from "./fixtures/profile"

// UI fixture only: no backend users or authentication bypasses are added to the app.
async function setUser(context: BrowserContext, role = "participant") {
  const user = {
    id: "shell-review",
    name: "Amira Ragab",
    email: "shell-review@example.test",
    role,
    roles: [role],
  }
  await context.addCookies([
    {
      name: "auth_token",
      value: "shell-review-only",
      url: "http://localhost:3000",
    },
    {
      name: "auth_user",
      value: encodeURIComponent(JSON.stringify(user)),
      url: "http://localhost:3000",
    },
    {
      name: "auth_roles",
      value: encodeURIComponent(JSON.stringify(user.roles)),
      url: "http://localhost:3000",
    },
    { name: "auth_role", value: role, url: "http://localhost:3000" },
    { name: "theme", value: "light", url: "http://localhost:3000" },
  ])
  await context.addInitScript((value) => {
    localStorage.setItem("hackathon_user", JSON.stringify(value))
  }, user)
}

async function openProfile(page: Page, locale = "en") {
  await page.route("**/api/account/challenge-options",r=>r.fulfill({json:[]}))
  await page.route("**/api/profiles/me", (route) =>
    route.fulfill({ json: profileFixture })
  )
  await page.goto(`/${locale}/dashboard/participant/profile`)
  await expect(page.locator("[data-dashboard-shell]")).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

for (const locale of ["en", "ar"]) {
  for (const width of [1440, 1024, 768, 390, 320]) {
    test(`${locale} shell at ${width}px: layout, assets, active navigation`, async ({
      page,
      context,
    }, testInfo) => {
      await setUser(context)
      await page.setViewportSize({ width, height: 900 })
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await openProfile(page, locale)
      const shell = page.locator("[data-dashboard-shell]")
      const header = shell.locator("header")
      const navigation = page.locator("[data-dashboard-navigation]")
      const sidebar = shell.locator("aside:has([data-dashboard-navigation])")
      await expect(shell).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr"
      )
      await expect(shell).toHaveCSS("color-scheme", "dark")
      await expect(header).toHaveCSS("height", width > 760 ? "72px" : "64px")
      await expect(navigation.locator("a")).toHaveCount(9)
      await expect(navigation.locator('[aria-current="page"]')).toHaveCount(0)
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
      }))
      expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport)
      if (width > 760) {
        await expect(sidebar).toHaveCSS("width", "224px")
        const box = (await sidebar.boundingBox())!
        expect(locale === "ar" ? box.x > width / 2 : box.x < 20).toBe(true)
      } else {
        expect(
          await navigation.evaluate(
            (element) => element.scrollWidth > element.clientWidth
          )
        ).toBe(true)
        await expect(navigation).toHaveCSS("overflow-x", "auto")
      }
      await expect
        .poll(async () =>
          shell
            .locator("header img, aside img")
            .evaluateAll((images) =>
              images
                .filter((image) => image.getBoundingClientRect().width > 0)
                .every(
                  (image) =>
                    (image as HTMLImageElement).complete &&
                    (image as HTMLImageElement).naturalWidth > 0
                )
            )
        )
        .toBe(true)
      const iconSizes = await navigation
        .locator("a img")
        .evaluateAll((images) =>
          images
            .filter((image) => getComputedStyle(image).display !== "none")
            .map((image) => ({
              width: image.getBoundingClientRect().width,
              height: image.getBoundingClientRect().height,
            }))
        )
      for (const size of iconSizes) {
        expect([12, 18]).toContain(size.width)
        expect(size.height).toBe(size.width)
      }
      expect(errors).toEqual([])
      await page.screenshot({
        path: testInfo.outputPath(`shell-${locale}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      })
    })
  }
}

test("account menu, language switching and keyboard search stay dark and usable", async ({
  page,
  context,
}) => {
  await setUser(context)
  await openProfile(page)
  const menuButton = page.getByRole("button", {
    name: "User Menu: Amira Ragab",
  })
  await menuButton.click()
  const menu = page.getByRole("menu")
  await expect(menu).toHaveCSS("color-scheme", "dark")
  await expect(menu.getByText("Switch View")).toHaveCount(0)
  await page.getByRole("menuitem", { name: "العربية" }).click()
  await expect(page).toHaveURL(/\/dashboard\/participant\/profile$/)
  await expect(page.locator("html")).toHaveAttribute("lang", "ar")
  await page.keyboard.press("Control+k")
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute("dir", "rtl")
  await expect(dialog).toHaveCSS("color-scheme", "dark")
  await dialog.getByRole("combobox").fill("الفريق")
  await expect(dialog.getByRole("option").first()).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible()
})

test("navigation works and similar route prefixes do not mark the wrong item", async ({
  page,
  context,
}) => {
  await setUser(context)
  await openProfile(page)
  await page.getByRole("link", { name: "Challenges", exact: true }).click()
  await expect(page).toHaveURL(/\/participant\/challenges$/)
  await expect(
    page.locator('[data-dashboard-navigation] [aria-current="page"]')
  ).toHaveText("Challenges")
  await page.goto("/en/dashboard/participant/team-library")
  await expect(
    page.locator('[data-dashboard-navigation] [aria-current="page"]')
  ).toHaveCount(0)
})

test("dark dashboard does not change the landing page or saved theme on client navigation", async ({
  page,
  context,
}) => {
  await setUser(context)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/en")
  const landing = page.locator("body")
  const before = await landing.evaluate((element) => {
    const style = getComputedStyle(element)
    const title = document.querySelector("h1")!
    return {
      background: style.backgroundColor,
      color: style.color,
      font: getComputedStyle(title).fontFamily,
      titleSize: getComputedStyle(title).fontSize,
    }
  })
  await openProfile(page)
  await page.getByRole("link", { name: "NASA Space Apps Giza home" }).click()
  await expect(page).toHaveURL(/\/(?:en)?$/)
  await expect(page.locator("[data-dashboard-shell]")).toHaveCount(0)
  const after = await landing.evaluate((element) => {
    const style = getComputedStyle(element)
    const title = document.querySelector("h1")!
    return {
      background: style.backgroundColor,
      color: style.color,
      font: getComputedStyle(title).fontFamily,
      titleSize: getComputedStyle(title).fontSize,
    }
  })
  expect(after).toEqual(before)
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "theme")?.value
  ).toBe("light")
})

for (const role of ["organizer", "mentor", "judge"]) {
  test(`${role} keeps its existing role navigation`, async ({
    page,
    context,
  }) => {
    await setUser(context, role)
    await page.goto(`/dashboard/${role}`)
    await expect(page.locator("[data-dashboard-shell]")).toBeVisible()
    await expect(
      page.locator('[data-dashboard-navigation] [aria-current="page"]')
    ).toHaveAttribute("href", `/dashboard/${role}`)
    expect(
      await page.locator("[data-dashboard-navigation] a").count()
    ).toBeGreaterThan(5)
  })
}
