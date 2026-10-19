import { expect, test, type Page, type BrowserContext } from "@playwright/test"
import type { Challenge } from "../../lib/challenges"

const examples: Challenge[] = [
  {
    id: "earth",
    slug: "earth-observation",
    title: "Earth observation",
    titleAr: "رصد الأرض",
    summary: "Explore Earth data with your team.",
    summaryAr: "استكشف بيانات الأرض مع فريقك.",
    description:
      "Investigate an environmental change and explain the uncertainty behind your results.",
    descriptionAr: "حلل تغيراً بيئياً واشرح عدم اليقين في نتائجك.",
    category: "Earth science",
    difficulty: "beginner",
    year: 2026,
    tags: ["Maps"],
    isPublished: true,
    isArchived: false,
    isDemo: false,
    version: 1,
    saved: false,
    sourceUrl: "https://www.nasa.gov/",
    resources: [
      { id: "resource", label: "NASA data", url: "https://data.nasa.gov/" },
    ],
  },
  {
    id: "climate",
    slug: "climate-lab",
    title: "Climate lab",
    titleAr: "مختبر المناخ",
    summary: "Study climate signals and trends.",
    summaryAr: "ادرس إشارات المناخ واتجاهاته.",
    description:
      "Compare climate measurements and explain a trend to your community.",
    descriptionAr: null,
    category: "Climate",
    difficulty: "advanced",
    year: 2026,
    tags: ["Data"],
    isPublished: true,
    isArchived: false,
    isDemo: false,
    version: 1,
    saved: false,
    sourceUrl: null,
    resources: [],
  },
]

async function fixture(
  page: Page,
  context: BrowserContext,
  role = "participant",
  leader = true
) {
  const user = {
    id: "challenge-user",
    name: "Challenge User",
    email: "challenge@example.test",
    role,
    roles: [role],
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
  await context.addInitScript(
    (value) => localStorage.setItem("hackathon_user", JSON.stringify(value)),
    user
  )
  const records = structuredClone(examples)
  let selection = {
    team: {
      id: "team",
      name: "NileScope",
      challengeId: null as string | null,
      challenge: null as string | null,
      canSelect: leader,
    },
  }
  await page.route(/\/api\/challenges(?:\/|\?|$)/, async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.replace("/api/challenges", ""),
      method = route.request().method()
    if (path === "/selection") return route.fulfill({ json: selection })
    if (path === "/manage/legacy-teams")
      return route.fulfill({
        json: { items: [], total: 0, page: 1, totalPages: 0 },
      })
    if ((path === "" || path === "/manage") && method === "GET") {
      let items = records.filter(
        (item) => path === "/manage" || (item.isPublished && !item.isArchived)
      )
      const q = url.searchParams
      if (q.get("search"))
        items = items.filter((item) =>
          JSON.stringify([
            item.title,
            item.titleAr,
            item.summary,
            item.category,
          ])
            .toLowerCase()
            .includes(q.get("search")!.toLowerCase())
        )
      if (q.get("category"))
        items = items.filter((item) => item.category === q.get("category"))
      if (q.get("difficulty"))
        items = items.filter((item) => item.difficulty === q.get("difficulty"))
      if (q.get("year"))
        items = items.filter((item) => String(item.year) === q.get("year"))
      if (q.get("view") === "saved") items = items.filter((item) => item.saved)
      return route.fulfill({
        json: {
          items,
          total: items.length,
          page: 1,
          totalPages: items.length ? 1 : 0,
          categories: ["Earth science", "Climate"],
          years: [2026],
        },
      })
    }
    if (path === "/manage" && method === "POST") {
      const body = route.request().postDataJSON()
      const created = {
        ...body,
        id: "new",
        slug: "new-mission",
        version: 1,
        isDemo: false,
        saved: false,
      }
      records.push(created)
      return route.fulfill({ status: 201, json: created })
    }
    const parts = path.split("/").filter(Boolean),
      record = records.find(
        (item) =>
          item.id === (parts[0] === "manage" ? parts[1] : parts[0]) ||
          item.slug === parts[0]
      )
    if (!record) return route.fulfill({ status: 404, json: {} })
    if (parts[1] === "favorite") {
      record.saved = route.request().postDataJSON().saved
      return route.fulfill({ json: { saved: record.saved } })
    }
    if (parts[1] === "select") {
      selection = {
        team: {
          ...selection.team,
          challengeId: record.id,
          challenge: record.title,
        },
      }
      return route.fulfill({ json: selection })
    }
    if (parts[0] === "manage" && method === "DELETE") {
      record.isArchived = true
      record.version++
      return route.fulfill({ json: { success: true } })
    }
    if (parts[0] === "manage" && method === "PUT") {
      Object.assign(record, route.request().postDataJSON(), {
        version: record.version + 1,
      })
      return route.fulfill({ json: record })
    }
    return route.fulfill({ json: record })
  })
}

test("participant searches, saves a challenge, opens resources, and selects it for the team", async ({
  page,
  context,
}, testInfo) => {
  await fixture(page, context)
  await page.goto("/en/dashboard/participant/challenges")
  await expect(
    page.getByRole("heading", { name: "Earth observation", exact: true })
  ).toBeVisible()
  await page
    .getByRole("searchbox", { name: "Search challenges", exact: true })
    .fill("climate")
  await expect(
    page.getByRole("heading", { name: "Earth observation", exact: true })
  ).toHaveCount(0)
  await page.getByRole("searchbox").fill("")
  const card = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Earth observation",
        exact: true,
      }),
    })
  await card
    .getByRole("button", { name: "Save challenge", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Saved challenges", exact: true })
    .click()
  await expect(page.getByRole("article")).toHaveCount(1)
  await page.reload()
  await expect(
    card.getByRole("button", { name: "Remove from saved" })
  ).toBeVisible()
  await card.getByRole("link", { name: "Explore challenge" }).click()
  await expect(page.getByRole("link", { name: "NASA data" })).toHaveAttribute(
    "href",
    "https://data.nasa.gov/"
  )
  await page
    .getByRole("button", { name: "Use for my team", exact: true })
    .click()
  await expect(
    page.getByText("Your team’s challenge was updated.")
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Selected for your team" })
  ).toBeDisabled()
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo({top:0,behavior:"instant"}) })
  await page.screenshot({
    path: testInfo.outputPath("challenge-detail-desktop.png"),
    fullPage: true,
  })
})

test("Arabic catalogue fits mobile and a member cannot select for the team", async ({
  page,
  context,
}, testInfo) => {
  await fixture(page, context, "participant", false)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/ar/dashboard/participant/challenges")
  await expect(
    page.getByRole("heading", { name: "رصد الأرض", exact: true })
  ).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await page.getByRole("article").first().getByRole("link").click()
  await expect(
    page.getByText("قائد فريقك هو من يختار التحدي للجميع.")
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo({top:0,behavior:"instant"}) })
  await page.screenshot({
    path: testInfo.outputPath("challenge-detail-ar-mobile.png"),
    fullPage: true,
  })
})

test("organizer creates, publishes, edits, and archives a challenge", async ({
  page,
  context,
}) => {
  await fixture(page, context, "organizer")
  await page.goto("/en/dashboard/organizer/challenges")
  await page.getByRole("button", { name: "New challenge", exact: true }).click()
  const form = page.getByRole("region", { name: "New challenge", exact: true })
  await form
    .getByRole("textbox", { name: "Title (English)", exact: true })
    .fill("Ocean mission")
  await form
    .getByRole("textbox", { name: "Short summary (English)", exact: true })
    .fill("Explore changes in our ocean with open data.")
  await form
    .getByRole("textbox", { name: "Full description (English)", exact: true })
    .fill(
      "Choose an ocean dataset and build a prototype that explains a change to your community."
    )
  await form
    .getByRole("textbox", { name: "Category", exact: true })
    .fill("Ocean")
  await form.getByRole("button", { name: "Add resource", exact: true }).click()
  await form
    .getByRole("textbox", { name: "Link label", exact: true })
    .fill("NASA data")
  await form
    .getByRole("textbox", { name: "Link URL", exact: true })
    .fill("https://data.nasa.gov/")
  await form.getByRole("checkbox", { name: "Publish to the catalogue" }).check()
  await form
    .getByRole("button", { name: "Save challenge", exact: true })
    .click()
  const card = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Ocean mission", exact: true }),
    })
  await expect(card.getByText("Published", { exact: true })).toBeVisible()
  await card.getByRole("button", { name: "Edit", exact: true }).click()
  const edit = page.getByRole("region", { name: "Edit", exact: true })
  await edit
    .getByRole("textbox", { name: "Short summary (English)", exact: true })
    .fill("An updated ocean challenge summary for the team.")
  await edit
    .getByRole("button", { name: "Save challenge", exact: true })
    .click()
  await expect(
    card.getByText("An updated ocean challenge summary for the team.")
  ).toBeVisible()
  await card.getByRole("button", { name: "Archive", exact: true }).click()
  await expect(card.getByText("Archived", { exact: true })).toBeVisible()
})
