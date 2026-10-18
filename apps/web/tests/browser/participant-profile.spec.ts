import { expect, test } from "@playwright/test"
import { profileFixture, profileSession } from "./fixtures/profile"

test.beforeEach(async ({context}) => profileSession(context))

for (const locale of ["en", "ar"]) for (const width of [1440, 1024, 390, 320]) {
  test(`${locale} profile is responsive at ${width}px`, async ({page}, testInfo) => {
    await page.setViewportSize({width,height:1000})
    await page.route("**/api/profiles/me",route=>route.fulfill({json:profileFixture}))
    await page.goto(`/${locale}/dashboard/participant/profile`)
    await expect(page.locator("#profile-name")).toHaveValue("Amira Ragab")
    await page.evaluate(()=>document.fonts.ready)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await expect(page.locator("[data-matching-card]")).toContainText("Amira Ragab")
    await expect(page.getByRole("checkbox")).toHaveCount(3)
    await expect(page.locator("[data-dashboard-shell]")).toHaveAttribute("dir",locale==="ar"?"rtl":"ltr")
    await page.screenshot({path:testInfo.outputPath(`profile-${locale}-${width}.png`),fullPage:true,animations:"disabled"})
  })
}

test("edits preview immediately and save once; reload restores persisted data", async ({page}) => {
  let profile=structuredClone(profileFixture)
  let saves=0
  await page.route("**/api/profiles/me",async route=>{
    if(route.request().method()==="PATCH") {
      saves++
      const {name,phone,expectedUpdatedAt,...fields}=route.request().postDataJSON()
      expect(expectedUpdatedAt).toBe(profile.updatedAt)
      profile={...profile,...fields,user:{...profile.user,name,phone},updatedAt:"2026-10-17T10:01:00.000Z"}
    }
    await route.fulfill({json:profile})
  })
  await page.goto("/en/dashboard/participant/profile")
  await page.getByLabel("Display name",{exact:true}).fill("Amira Updated")
  await page.getByLabel("Contact number",{exact:true}).fill("+201011223344")
  await page.getByRole("button",{name:"Frontend",exact:true}).click()
  await page.getByLabel("Short bio",{exact:true}).fill("A new profile story")
  await expect(page.locator("[data-matching-card]")).toContainText("A new profile story")
  await page.getByRole("checkbox",{name:"Hide profile from participant search"}).check()
  await page.getByRole("button",{name:"Preview public profile",exact:true}).click()
  await expect(page.getByRole("dialog")).toHaveCSS("color-scheme","dark")
  await expect(page.getByRole("dialog")).toContainText("preview only")
  await expect(page.getByRole("dialog")).not.toContainText("profile@example.test")
  await page.getByRole("button",{name:"Close",exact:true}).click()
  await page.getByRole("button",{name:"Save changes",exact:true}).click()
  await expect(page.getByRole("status")).toHaveText("Changes saved")
  expect(saves).toBe(1)
  await page.reload()
  await expect(page.locator("#profile-name")).toHaveValue("Amira Updated")
  await expect(page.locator("#profile-phone")).toHaveValue("+201011223344")
  await expect(page.getByRole("button",{name:"Frontend",exact:true})).toHaveAttribute("aria-pressed","true")
  await expect(page.getByRole("checkbox",{name:"Hide profile from participant search"})).toBeChecked()
})

for(const code of [401,409,500]) test(`save failure ${code} preserves edits`,async({page})=>{
  await page.route("**/api/profiles/me",route=>route.fulfill(route.request().method()==="PATCH"?{status:code,json:{message:"failure"}}:{json:profileFixture}))
  await page.goto("/en/dashboard/participant/profile")
  await page.locator("#profile-bio").fill("Keep this unsaved work")
  await page.getByRole("button",{name:"Save changes",exact:true}).click()
  await expect(page.locator("[data-profile-form]").getByRole("alert")).toBeVisible()
  await expect(page.locator("#profile-bio")).toHaveValue("Keep this unsaved work")
  await expect(page.getByRole("button",{name:"Save changes",exact:true})).toBeEnabled()
})

test("failed load can be retried and blank names never reach the API",async({page})=>{
  let loaded=false, saves=0
  await page.route("**/api/profiles/me",async route=>{
    if(route.request().method()==="PATCH") saves++
    await route.fulfill(loaded?{json:profileFixture}:{status:500,json:{}})
    loaded=true
  })
  await page.goto("/en/dashboard/participant/profile")
  await page.getByRole("button",{name:"Try again",exact:true}).click()
  await page.locator("#profile-name").fill("   ")
  await page.getByRole("button",{name:"Save changes",exact:true}).click()
  await expect(page.getByText("Enter a display name.",{exact:true})).toBeVisible()
  expect(saves).toBe(0)
})

test("unsaved navigation can be cancelled and discard restores saved fields",async({page})=>{
  await page.route("**/api/profiles/me",route=>route.fulfill({json:profileFixture}))
  await page.goto("/en/dashboard/participant/profile")
  await page.locator("#profile-bio").fill("Unsaved")
  page.once("dialog",dialog=>dialog.dismiss())
  await page.getByRole("link",{name:"Explore challenges"}).click()
  await expect(page).toHaveURL(/\/participant\/profile$/)
  page.once("dialog",dialog=>dialog.accept())
  await page.getByRole("button",{name:"Discard changes",exact:true}).click()
  await expect(page.locator("#profile-bio")).toHaveValue(profileFixture.bio!)
})
