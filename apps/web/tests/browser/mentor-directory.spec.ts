import { expect, test, type Page } from "@playwright/test"
import type { Mentor, MentorshipRequest } from "../../lib/mentorship"
import { profileSession } from "./fixtures/profile"

const soon = new Date(Date.now() + 86_400_000).toISOString()
const later = new Date(Date.now() + 172_800_000).toISOString()
const mentors: Mentor[] = [
  {
    id: "lina",
    name: "Dr. Lina",
    avatar: null,
    mentorProfile: {
      expertise: ["Python", "Climate data"],
      availability: "Afternoons",
      bio: "I help teams interpret satellite imagery and build climate tools. We can work through your data together, choose a useful analysis, and turn the findings into a clear story. Bring your questions about mapping and making your results useful to local communities.",
    },
    profile: { skills: ["python", " GIS "], bio: "Older profile bio" },
    mentorSlots: [
      { id: "later", startTime: later, endTime: later },
      { id: "soon", startTime: soon, endTime: soon },
    ],
  },
  {
    id: "omar",
    name: "Omar Hassan",
    avatar: null,
    mentorProfile: null,
    profile: {
      skills: ["Design", "Prototyping"],
      bio: "I help teams test accessible interfaces.",
    },
    mentorSlots: [{ id: "design-slot", startTime: soon, endTime: soon }],
  },
  {
    id: "mona",
    name: "Mona Ali",
    avatar: null,
    mentorProfile: { expertise: [], availability: "Evenings", bio: " " },
    profile: {
      skills: ["Pitching"],
      bio: "I help teams explain their idea in a short pitch.",
    },
    mentorSlots: [
      {
        id: "past",
        startTime: "2000-01-01T10:00:00Z",
        endTime: "2000-01-01T11:00:00Z",
      },
    ],
  },
  {
    id: "nour",
    name: "نور أحمد",
    avatar: null,
    mentorProfile: {
      expertise: ["تحليل البيانات"],
      availability: "",
      bio: "أساعد الفرق على فهم البيانات وعرض النتائج.",
    },
    profile: null,
    mentorSlots: [],
  },
  {
    id: "new",
    name: "New Mentor",
    avatar: null,
    mentorProfile: null,
    profile: null,
    mentorSlots: [],
  },
]

function requestFor(
  mentor: Mentor,
  status: MentorshipRequest["status"] = "accepted"
): MentorshipRequest {
  return {
    id: "team-request",
    teamId: "team",
    mentorId: mentor.id,
    mentor,
    topic: "Help us interpret satellite imagery",
    status,
    sessionNotes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    team: { id: "team", name: "NileScope" },
    slot: null,
    _count: { messages: 0 },
  }
}

async function mockDirectory(
  page: Page,
  options: {
    mentors?: Mentor[]
    requests?: MentorshipRequest[]
    failRequest?: boolean
  } = {}
) {
  const list = options.mentors ?? mentors
  let requests = options.requests ?? []
  const submitted: unknown[] = []
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === "/api/mentorship/mentors") return route.fulfill({ json: list })
    if (path === "/api/mentorship/requests") {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON()
        submitted.push(body)
        if (options.failRequest) return route.fulfill({ status: 400, json: {} })
        requests = [
          {
            ...requestFor(
              list.find((mentor) => mentor.id === body.mentorId)!,
              "pending"
            ),
            topic: body.message,
          },
        ]
        return route.fulfill({ json: requests[0] })
      }
      return route.fulfill({ json: requests })
    }
    if (path === "/api/account/notifications")
      return route.fulfill({ json: { notifications: [], unreadCount: 0 } })
    return route.fulfill({ status: 404, json: {} })
  })
  return submitted
}

test.beforeEach(async ({ context }) => profileSession(context))

test("search finds mentoring topics, signup skills, bios, names, and Arabic text", async ({
  page,
}) => {
  await mockDirectory(page)
  await page.goto("/en/dashboard/participant/mentorship")
  const directory = page.getByRole("region", {
    name: "What do you need help with?",
  })
  await expect(directory.getByRole("article")).toHaveCount(5)
  const lina = directory.getByRole("article", { name: "Dr. Lina" })
  await expect(lina.getByText("Python", { exact: true })).toHaveCount(1)
  await expect(lina.getByText("GIS", { exact: true })).toBeVisible()
  await expect(lina.locator("time")).toHaveAttribute("datetime", soon)
  await lina.getByRole("button", { name: "Read full bio" }).click()
  await expect(
    lina.getByText(mentors[0].mentorProfile!.bio, { exact: true })
  ).toBeVisible()
  const search = page.getByLabel("Search mentors", { exact: true })
  for (const [query, name] of [
    ["PYTHON climate", "Dr. Lina"],
    ["GIS", "Dr. Lina"],
    ["satellite", "Dr. Lina"],
    ["accessible", "Omar Hassan"],
    ["  oMaR  ", "Omar Hassan"],
    ["Pitching", "Mona Ali"],
    ["تَحليل البَيانات", "نور أحمد"],
  ]) {
    await search.fill(query)
    await expect(directory.getByRole("article")).toHaveCount(1)
    await expect(
      directory.getByRole("heading", { name, exact: true })
    ).toBeVisible()
  }
})

test("topic and upcoming-hours filters combine with search and can be cleared", async ({
  page,
}) => {
  await mockDirectory(page)
  await page.goto("/en/dashboard/participant/mentorship")
  const directory = page.getByRole("region", {
    name: "What do you need help with?",
  })
  await page.getByRole("combobox", { name: "Mentoring topic" }).click()
  await page.getByRole("option", { name: "GIS", exact: true }).click()
  await expect(directory.getByRole("article")).toHaveCount(1)
  await page.getByLabel("Search mentors", { exact: true }).fill("Design")
  await expect(
    page.getByRole("heading", { name: "No mentors match these filters" })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click()
  await expect(directory.getByRole("article")).toHaveCount(5)
  await page
    .getByRole("checkbox", { name: "With upcoming office hours" })
    .check()
  await expect(directory.getByRole("article")).toHaveCount(2)
  await expect(
    directory.getByRole("article", { name: "Mona Ali" })
  ).toHaveCount(0)
  await page.getByRole("combobox", { name: "Mentoring topic" }).click()
  await page.getByRole("option", { name: "Design", exact: true }).click()
  await expect(directory.getByRole("article")).toHaveCount(1)
  await expect(
    directory.getByRole("heading", { name: "Omar Hassan" })
  ).toBeVisible()
})

test("missing profiles have honest fallbacks and an empty directory has its own message", async ({
  page,
}) => {
  await mockDirectory(page)
  await page.goto("/en/dashboard/participant/mentorship")
  const card = page.getByRole("article", { name: "New Mentor", exact: true })
  await expect(card.getByText("Topics not added yet.")).toBeVisible()
  await expect(
    card.getByText("This mentor hasn't added a bio yet.")
  ).toBeVisible()
  await expect(
    card.getByText("Request mentorship to arrange a time")
  ).toBeVisible()
  await mockDirectory(page, { mentors: [] })
  await page.reload()
  await expect(
    page.getByRole("heading", { name: "No mentors are available yet." })
  ).toBeVisible()
  await expect(page.getByText("No mentors match these filters")).toHaveCount(0)
})

test("requesting a filtered mentor preserves the API contract and links to the pending request", async ({
  page,
}) => {
  const submitted = await mockDirectory(page)
  await page.goto("/en/dashboard/participant/mentorship")
  await page.getByLabel("Search mentors", { exact: true }).fill("Design")
  const card = page.getByRole("article", { name: "Omar Hassan", exact: true })
  await card
    .getByRole("button", { name: "Request mentorship", exact: true })
    .click()
  await card
    .getByRole("textbox", { name: /Describe what your team/ })
    .fill("  Help our team review an accessible prototype.  ")
  await card.getByRole("button", { name: "Send request", exact: true }).click()
  await expect(card.getByText("Your team's request is pending")).toBeVisible()
  expect(submitted).toEqual([
    {
      mentorId: "omar",
      message: "Help our team review an accessible prototype.",
    },
  ])
  await expect(
    card.getByRole("button", { name: "Request mentorship", exact: true })
  ).toHaveCount(0)
  await card.getByRole("link", { name: "View request" }).click()
  await expect(
    page.locator("#mentorship-request-team-request")
  ).toBeInViewport()
})

test("an existing accepted request is shown instead of a duplicate request button", async ({
  page,
}) => {
  const submitted = await mockDirectory(page, {
    requests: [requestFor(mentors[0])],
  })
  await page.goto("/en/dashboard/participant/mentorship")
  const card = page.getByRole("article", { name: "Dr. Lina", exact: true })
  await expect(card.getByText("Mentoring your team")).toBeVisible()
  await expect(
    card.getByRole("link", { name: "View request" })
  ).toHaveAttribute("href", "#mentorship-request-team-request")
  await expect(
    card.getByRole("button", { name: "Request mentorship", exact: true })
  ).toHaveCount(0)
  expect(submitted).toEqual([])
})

test("a failed request retains the draft and shows the team requirement next to the form", async ({
  page,
}) => {
  await mockDirectory(page, { failRequest: true })
  await page.goto("/en/dashboard/participant/mentorship")
  const card = page.getByRole("article", { name: "Dr. Lina", exact: true })
  await card
    .getByRole("button", { name: "Request mentorship", exact: true })
    .click()
  const draft = card.getByRole("textbox", { name: /Describe what your team/ })
  await draft.fill("Help us interpret satellite imagery")
  await card.getByRole("button", { name: "Send request", exact: true }).click()
  await expect(card.getByRole("alert")).toHaveText(
    "Create or join a team to request a mentor."
  )
  await expect(draft).toHaveValue("Help us interpret satellite imagery")
})

for (const locale of ["en", "ar"]) {
  test(`${locale} mentor directory and filters fit a narrow screen`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockDirectory(page)
    await page.goto(`/${locale}/dashboard/participant/mentorship`)
    await expect(
      page.getByRole("article", { name: "Dr. Lina", exact: true })
    ).toBeVisible()
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      locale === "ar" ? "rtl" : "ltr"
    )
    await page
      .getByRole("combobox", {
        name: locale === "ar" ? "مجال الإرشاد" : "Mentoring topic",
      })
      .click()
    await page.getByRole("option", { name: "Python", exact: true }).click()
    await expect(
      page
        .getByRole("region")
        .filter({ has: page.locator("#mentor-directory-title") })
        .getByRole("article")
    ).toHaveCount(1)
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
    await page.screenshot({
      path: testInfo.outputPath(`mentor-directory-${locale}.png`),
      fullPage: true,
      animations: "disabled",
    })
  })
}
