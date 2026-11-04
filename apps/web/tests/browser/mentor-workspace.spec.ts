import { expect, test, type Page } from "@playwright/test"
import type { Mentor, MentorshipRequest } from "../../lib/mentorship"

const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString()
const mentor: Mentor = {
  id: "mentor-review",
  name: "Mariam Samir",
  avatar: null,
  mentorProfile: {
    expertise: ["Python", "NASA datasets", "Data visualization"],
    bio: "I help teams turn satellite data into clear, useful stories.",
    availability: "Afternoons work best.",
  },
  profile: null,
  mentorSlots: [
    { id: "open-slot", startTime: future(2), endTime: future(2.04) },
  ],
}

function request(
  id: string,
  status: MentorshipRequest["status"],
  team: string
): MentorshipRequest {
  return {
    id,
    status,
    teamId: `team-${id}`,
    team: { id: `team-${id}`, name: team },
    mentorId: mentor.id,
    mentor,
    topic: `Help ${team} choose a NASA dataset.`,
    sessionNotes:
      status === "completed" ? "Label the source and show uncertainty." : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { messages: 2 },
    slot:
      status === "accepted"
        ? { id: `slot-${id}`, startTime: future(1), endTime: future(1.04) }
        : null,
  }
}

async function setup(
  page: Page,
  options: { empty?: boolean; fail?: boolean } = {}
) {
  const user = {
    id: mentor.id,
    name: mentor.name,
    email: "mentor@example.test",
    role: "mentor",
    roles: ["mentor"],
  }
  const origin = new URL(test.info().project.use.baseURL as string).origin
  await page.context().addCookies(
    Object.entries({
      auth_token: "mentor-ui-test",
      auth_user: JSON.stringify(user),
      auth_role: "mentor",
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
  let ownMentor = structuredClone(mentor)
  const requests = options.empty
    ? []
    : [
        request("pending", "pending", "New Horizons"),
        request("active", "accepted", "Nile Orbit"),
        request("answered", "accepted", "Mars Path"),
        request("done", "completed", "Past Explorers"),
        request("declined", "declined", "Declined Team"),
        {
          ...request("foreign", "pending", "Unrelated Team"),
          mentorId: "other-mentor",
        },
      ]
  const writes: { path: string; body: Record<string, unknown> | null }[] = []
  await page.route("**/api/account/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("/access/")
        ? { role: "mentor", roles: ["mentor"], status: "approved" }
        : { notifications: [], unreadCount: 0 },
    })
  )
  await page.route("**/api/mentorship/**", async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace("/api/mentorship", "")
    if (options.fail) return route.fulfill({ status: 503, json: {} })
    if (req.method() !== "GET") {
      const body = req.postData() ? req.postDataJSON() : null
      writes.push({ path, body })
      if (path === "/profile") ownMentor = { ...ownMentor, mentorProfile: body }
      if (path === "/requests/pending")
        requests.find((item) => item.id === "pending")!.status = body.status
      if (path === "/slots")
        ownMentor.mentorSlots.push({ id: "new-slot", ...body })
      if (path === "/slots/open-slot" && req.method() === "DELETE")
        ownMentor.mentorSlots = ownMentor.mentorSlots.filter(
          (item) => item.id !== "open-slot"
        )
      return route.fulfill({ json: {} })
    }
    if (path === "/mentors") return route.fulfill({ json: [ownMentor] })
    if (path === "/requests") return route.fulfill({ json: requests })
    if (path.endsWith("/messages"))
      return route.fulfill({
        json: [
          {
            id: "latest",
            senderId: path.includes("answered") ? mentor.id : "participant",
            content: "Could you check our updated map?",
            createdAt: new Date().toISOString(),
            sender: { name: "Layla", avatar: null },
          },
        ],
      })
    return route.fulfill({ status: 404, json: {} })
  })
  return writes
}

test("overview is a read-only summary with honest requests and message previews", async ({
  page,
}) => {
  await setup(page)
  await page.goto("/en/dashboard/mentor")
  const main = page.locator("main")
  await expect(
    main.getByRole("heading", { name: "Your mentoring overview" })
  ).toBeVisible()
  await expect(
    main.getByRole("region", { name: "Your profile" })
  ).toContainText("Mariam Samir")
  await expect(main).toContainText("Python")
  await expect(main).toContainText("I help teams turn satellite data")
  await expect(
    main.getByRole("region", { name: "Needs your attention" })
  ).toContainText("1 team is waiting")
  await expect(main).not.toContainText("Unrelated Team")
  const messages = main.getByRole("region", { name: "Latest from your teams" })
  await expect(messages).toContainText("Could you check our updated map?")
  await expect(messages).toContainText("Reply needed")
  await expect(messages).not.toContainText("Mars Path")
  await expect(main.locator("input, textarea, form")).toHaveCount(0)
  await main.getByRole("link", { name: "Edit profile" }).click()
  await expect(page).toHaveURL(/\/mentor\/profile$/)
  await expect(main.getByLabel("About you")).toHaveValue(
    mentor.mentorProfile!.bio
  )
  await expect(main.getByRole("button", { name: "Add slot" })).toHaveCount(0)
})

test("request decisions move the team into the active workspace", async ({
  page,
}) => {
  const writes = await setup(page)
  await page.goto("/en/dashboard/mentor/requests")
  const main = page.locator("main")
  await expect(main.getByRole("article")).toHaveCount(1)
  await expect(main).not.toContainText("Past Explorers")
  await main.getByRole("button", { name: "Accept", exact: true }).click()
  await expect(main).toContainText("No requests waiting for your response.")
  expect(writes).toEqual([
    { path: "/requests/pending", body: { status: "accepted" } },
  ])
  await main.getByRole("link", { name: "View your teams" }).click()
  await expect(
    main.getByRole("heading", { name: "Your teams", exact: true })
  ).toBeVisible()
  await expect(main.getByRole("article")).toHaveCount(3)
  await expect(
    main.getByRole("button", { name: "Accept", exact: true })
  ).toHaveCount(0)
  await expect(main.locator("textarea")).toHaveCount(0)
})

test("profile and office hours save through the existing endpoints", async ({
  page,
}) => {
  const writes = await setup(page)
  await page.goto("/en/dashboard/mentor/profile")
  const main = page.locator("main")
  await main
    .getByRole("button", { name: "Remove NASA datasets", exact: true })
    .click()
  await main
    .getByRole("button", { name: "Remove Data visualization", exact: true })
    .click()
  await main.getByLabel("Mentoring topics", { exact: true }).fill("UX design")
  await main.getByLabel("Mentoring topics", { exact: true }).press("Enter")
  await main.getByLabel("Mentoring topics", { exact: true }).fill("python")
  await main.getByRole("button", { name: "Add", exact: true }).click()
  await expect(
    main
      .getByRole("list", { name: "Your mentoring topics" })
      .getByRole("listitem")
  ).toHaveCount(2)
  expect(writes).toHaveLength(0)
  await main.getByLabel("About you").fill("A short updated bio.")
  await main.getByRole("button", { name: "Save profile" }).click()
  await expect(
    main.getByRole("status").filter({ hasText: "Your changes" })
  ).toContainText("saved")
  expect(writes[0]).toEqual({
    path: "/profile",
    body: {
      expertise: ["Python", "UX design"],
      bio: "A short updated bio.",
      availability: "Afternoons work best.",
    },
  })
  await page.goto("/en/dashboard/mentor/office-hours")
  await main.getByLabel("Date", { exact: true }).fill(future(5).slice(0, 10))
  await main.getByLabel("From", { exact: true }).fill("13:00")
  await main.getByLabel("To", { exact: true }).fill("12:00")
  await main.getByRole("button", { name: "Add slot" }).click()
  await expect(main.getByRole("alert")).toContainText(
    "Choose a future start time"
  )
  expect(writes).toHaveLength(1)
  await main.getByLabel("To", { exact: true }).fill("14:00")
  await main.getByRole("button", { name: "Add slot" }).click()
  await expect(
    main.getByRole("status").filter({ hasText: "Your changes" })
  ).toContainText("saved")
  expect(writes[1].path).toBe("/slots")
  await expect(main.getByLabel("From", { exact: true })).toHaveValue("")
  await main
    .getByRole("button", { name: /Remove slot on/ })
    .first()
    .click()
  await expect.poll(() => writes.at(-1)?.path).toBe("/slots/open-slot")
})

test("sessions open the selected conversation; history and notes have their own content", async ({
  page,
}) => {
  const writes = await setup(page)
  const main = page.locator("main")
  await page.goto(
    "/en/dashboard/mentor/sessions?conversation=active#mentorship-request-active"
  )
  await expect(main.getByRole("article")).toHaveCount(2)
  await expect(main.getByRole("log", { name: "Conversation" })).toContainText(
    "updated map"
  )
  await expect(main).not.toContainText("New Horizons")
  await page.goto("/en/dashboard/mentor/history")
  await expect(main.getByRole("article")).toHaveCount(2)
  await main.getByLabel("Filter history").selectOption("completed")
  await expect(main.getByRole("article")).toHaveCount(1)
  await expect(main).toContainText("Label the source and show uncertainty.")
  await page.goto("/en/dashboard/mentor/feedback")
  const notes = main.getByRole("article", { name: "Nile Orbit", exact: true })
  await notes
    .getByLabel("Session notes", { exact: true })
    .fill("Next step: validate the map labels.")
  await notes.getByRole("button", { name: "Save notes" }).click()
  await expect(notes.getByRole("status")).toHaveText("Notes saved")
  expect(writes.at(-1)).toEqual({
    path: "/requests/active/notes",
    body: { content: "Next step: validate the map labels." },
  })
})

for (const [locale, width] of [
  ["en", 1440],
  ["en", 390],
  ["ar", 320],
] as const) {
  test(`${locale} mentor overview fits ${width}px and navigation stays distinct`, async ({
    page,
  }, testInfo) => {
    await setup(page)
    await page.setViewportSize({ width, height: 1000 })
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`/${locale}/dashboard/mentor`)
    await expect(page.locator("main")).toContainText("Mariam Samir")
    await expect(page.locator("main")).toContainText(
      "Could you check our updated map?"
    )
    await expect(
      page.locator('[data-dashboard-navigation] [aria-current="page"]')
    ).toHaveCount(1)
    await expect(
      page.locator('a[href="/dashboard/mentor/office-hours"]').first()
    ).toBeAttached()
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`mentor-${locale}-${width}.png`),
      fullPage: true,
    })
    for (const section of ["profile", "office-hours"]) {
      await page.goto(`/${locale}/dashboard/mentor/${section}`)
      await expect(
        page.locator(
          section === "profile"
            ? "#mentor-topic-input"
            : 'main input[type="date"]'
        )
      ).toBeVisible()
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
      ).toBe(true)
      await page.screenshot({
        path: testInfo.outputPath(`mentor-${section}-${locale}-${width}.png`),
        fullPage: true,
      })
    }
    expect(errors).toEqual([])
  })
}

test("empty and unavailable data never masquerade as unread messages", async ({
  page,
}) => {
  await setup(page, { empty: true })
  await page.goto("/en/dashboard/mentor")
  await expect(page.locator("main")).toContainText("You're all caught up")
  await expect(page.locator("main")).toContainText(
    "No team messages waiting for a reply"
  )
  await page.route("**/api/mentorship/**", (route) =>
    route.fulfill({ status: 503, json: {} })
  )
  await page.reload()
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Could not load mentorship"
  )
  await expect(
    page.getByRole("region", { name: "Your profile", exact: true })
  ).toHaveCount(0)
})
