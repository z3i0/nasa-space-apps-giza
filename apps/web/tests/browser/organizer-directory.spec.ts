import { expect, test, type Page } from "@playwright/test"
import { expectUniformCards } from "./card-grid-assertions"

async function setup(page: Page, mixed = false) {
  const user = {
    id: "organizer",
    name: "Organizer",
    email: "organizer@example.test",
    role: "organizer",
    roles: ["organizer"],
  }
  const origin = new URL(test.info().project.use.baseURL as string).origin
  await page.context().addCookies(
    Object.entries({
      auth_token: "fixture",
      auth_user: JSON.stringify(user),
      auth_role: user.role,
      auth_roles: JSON.stringify(user.roles),
    }).map(([name, value]) => ({
      name,
      value: encodeURIComponent(value),
      url: origin,
    }))
  )
  await page.addInitScript(
    (value) => localStorage.setItem("hackathon_user", JSON.stringify(value)),
    user
  )
  const participants = [
    ...Array.from({ length: 50 }, (_, i) => ({
      id: `p${i}`,
      name: `Participant ${String(i + 1).padStart(2, "0")}`,
      email: `participant${i}@example.test`,
      isActive: true,
      institution: "Cairo University",
      skills: ["GIS"],
      team: { id: "t1", name: "Nile Orbit" },
    })),
    {
      id: "last",
      name: "Zara Hassan",
      email: "zara.long.email.address@example.test",
      isActive: false,
      institution: "Design School",
      skills: [
        "Accessibility",
        "UX",
        "Research",
        "Prototyping",
        "Design systems",
      ],
      team: null,
    },
  ]
  const teams = [
    {
      id: "t1",
      name: "Nile Orbit",
      challenge: "Climate data",
      maxMembers: 5,
      members: [
        { userId: "p0", role: "leader", user: { name: "Participant 01" } },
      ],
      submission: { title: "Climate Atlas", status: "submitted", version: 2 },
    },
    {
      id: "t2",
      name: "Mars Path",
      challenge: "Mars exploration",
      maxMembers: 1,
      members: [
        { userId: "p1", role: "leader", user: { name: "Participant 02" } },
      ],
      submission: { title: "Rover Map", status: "draft", version: 1 },
    },
    {
      id: "t3",
      name: "New Team",
      challenge: null,
      maxMembers: 5,
      members: [],
      submission: null,
    },
  ]
  const pages: number[] = []
  if (mixed) {
    participants[0] = {
      ...participants[0],
      name: "Participant 01 with a much longer display name",
      email:
        "participant.with.a.very.long.contact.address@research.example.test",
      institution: "A university with a long department and institution name",
      skills: [
        "GIS",
        "Python",
        "Data visualization",
        "Satellite image processing and analysis",
        "Research",
      ],
    }
    participants[1] = {
      ...participants[1],
      institution: "",
      skills: [],
      team: null,
    }
    teams.push({
      ...teams[0],
      id: "t4",
      name: "Team with a very long display name for a research project",
      challenge: "A long challenge description ".repeat(12),
      submission: {
        title: "An equally long project title ".repeat(10),
        status: "draft",
        version: 1,
      },
    })
    teams.push({ ...teams[2], id: "t5", name: "Small team" })
  }
  await page.route("**/api/account/**", (route) =>
    route.fulfill({ json: { notifications: [], unreadCount: 0 } })
  )
  await page.route("**/api/account/directory?**", (route) => {
    const params = new URL(route.request().url()).searchParams
    const current = Number(params.get("page"))
    const limit = Number(params.get("limit"))
    expect(limit).toBeLessThanOrEqual(50)
    pages.push(current)
    const items = params.get("kind") === "teams" ? teams : participants
    return route.fulfill({
      json: {
        items: items.slice((current - 1) * limit, current * limit),
        total: items.length,
        page: current,
        totalPages: Math.ceil(items.length / limit),
      },
    })
  })
  return { pages }
}

test("participant filters include later API pages and combine with search and pagination", async ({
  page,
}) => {
  const { pages } = await setup(page)
  await page.goto("/en/dashboard/organizer/participants")
  const main = page.locator("main")
  await expect(main.getByRole("article")).toHaveCount(6)
  expect([...new Set(pages)]).toEqual([1, 2])
  await main.getByRole("button", { name: "Next", exact: true }).click()
  await expect(main.getByRole("article").first()).toHaveAccessibleName(
    "Participant 07"
  )
  await page
    .getByRole("combobox", { name: "Account status", exact: true })
    .selectOption("inactive")
  const zara = page.getByRole("article", { name: "Zara Hassan" })
  await expect(zara).toBeVisible()
  await expect(main.getByRole("article")).toHaveCount(1)
  await page
    .getByRole("combobox", { name: "Skill", exact: true })
    .selectOption("accessibility")
  await page.getByLabel("Team membership").selectOption("without")
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("zara.long.email")
  await expect(
    zara.getByRole("link", { name: "zara.long.email.address@example.test" })
  ).toHaveAttribute("href", "mailto:zara.long.email.address@example.test")
  await zara.getByRole("button", { name: "View profile" }).click()
  await expect(page.getByRole("dialog")).toContainText("Design systems")
  await page.getByRole("button", { name: "Done", exact: true }).click()
  await page.getByLabel("Team membership").selectOption("with")
  await expect(
    main.getByRole("heading", { name: "No matching records." })
  ).toBeVisible()
  await main
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click()
  await expect(main.getByRole("article")).toHaveCount(6)
})

test("team filters combine challenge, capacity, submission, and roster search", async ({
  page,
}) => {
  await setup(page)
  await page.goto("/en/dashboard/organizer/teams")
  const main = page.locator("main")
  await expect(main.getByRole("article")).toHaveCount(3)
  await page
    .getByRole("combobox", { name: "Challenge", exact: true })
    .selectOption("climate data")
  await page.getByLabel("Team capacity").selectOption("open")
  await page.getByLabel("Submission status").selectOption("submitted")
  await expect(main.getByRole("article")).toHaveCount(1)
  const nile = page.getByRole("article", { name: "Nile Orbit" })
  await expect(nile).toContainText("Climate Atlas · v2")
  await nile.getByText("View team members", { exact: true }).click()
  await expect(page.getByRole("dialog")).toContainText(
    "Participant 01 · Leader"
  )
  await page.getByRole("button", { name: "Done", exact: true }).click()
  await main.getByRole("button", { name: "Clear filters", exact: true }).click()
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("participant 02")
  await expect(main.getByRole("article")).toHaveCount(1)
  await expect(page.getByRole("article", { name: "Mars Path" })).toContainText(
    "Team full"
  )
  await main.getByRole("button", { name: "Clear filters", exact: true }).click()
  await page
    .getByRole("combobox", { name: "Challenge", exact: true })
    .selectOption("__none")
  await expect(page.getByRole("article", { name: "New Team" })).toContainText(
    "Not started"
  )
})

test("failed later pages are not presented as a complete directory", async ({
  page,
}) => {
  await setup(page)
  await page.route(
    "**/api/account/directory?kind=participants&page=2&limit=50",
    (route) => route.fulfill({ status: 503, json: {} })
  )
  await page.goto("/en/dashboard/organizer/participants")
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Could not load event data."
  )
  await expect(page.locator("main").getByRole("article")).toHaveCount(0)
  await page.unroute(
    "**/api/account/directory?kind=participants&page=2&limit=50"
  )
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(page.locator("main").getByRole("article")).toHaveCount(6)
})

for (const [locale, width] of [
  ["en", 1440],
  ["en", 390],
  ["ar", 320],
] as const) {
  test(`${locale} participant and team cards fit ${width}px`, async ({
    page,
  }, testInfo) => {
    await setup(page, true)
    await page.setViewportSize({ width, height: 900 })
    for (const kind of ["participants", "teams"]) {
      await page.goto(`/${locale}/dashboard/organizer/${kind}`)
      const cards = page.locator("main").getByRole("article")
      await expect(cards.first()).toBeVisible()
      await expectUniformCards(cards)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      ).toBe(true)
      if (width === 1440) {
        const first = await cards.nth(0).boundingBox()
        const second = await cards.nth(1).boundingBox()
        expect(first!.y).toBe(second!.y)
        expect(first!.x).not.toBe(second!.x)
      }
      await page.screenshot({
        path: testInfo.outputPath(`${kind}-${locale}-${width}.png`),
        fullPage: true,
      })
      const heights = await cards.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height)
      )
      await cards.first().getByRole("button").last().click()
      await expect(page.getByRole("dialog")).toBeVisible()
      const dialog = await page.getByRole("dialog").boundingBox()
      expect(dialog!.x).toBeGreaterThanOrEqual(0)
      expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(width)
      await page.keyboard.press("Escape")
      await expectUniformCards(cards)
      expect(
        await cards.evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().height)
        )
      ).toEqual(heights)
    }
  })
}
