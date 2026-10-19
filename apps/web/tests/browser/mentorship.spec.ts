import { expect, test } from "@playwright/test"
import type { Mentor, MentorshipRequest } from "../../lib/mentorship"
test.beforeEach(async ({ page }) => {
  await page.route("**/api/account/access/mentor", (r) =>
    r.fulfill({
      json: {
        role: "mentor",
        roles: ["mentor"],
        status: "approved",
        reason: "",
      },
    })
  )
})

const mentor: Mentor = {
  id: "mentor-1",
  name: "Dr. Lina",
  avatar: null,
  mentorProfile: {
    expertise: ["Earth data"],
    availability: "Afternoons",
    bio: "I help teams interpret satellite data.",
  },
  profile: null,
  mentorSlots: [],
}

test("participant requests a mentor and sends a message", async ({
  page,
  context,
}) => {
  const user = {
    id: "participant-1",
    name: "Amira",
    email: "amira@example.test",
    role: "participant",
    roles: ["participant"],
  }
  await context.addCookies(
    Object.entries({
      auth_token: "fixture",
      auth_user: JSON.stringify(user),
      auth_role: "participant",
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
  let requests: MentorshipRequest[] = []
  let messages: {
    id: string
    senderId: string
    content: string
    createdAt: string
    sender: { name: string; avatar: null }
  }[] = []
  await page.route(/\/api\/mentorship(?:\/|\?|$)/, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/mentorship",
      ""
    )
    const method = route.request().method()
    if (path === "/mentors") return route.fulfill({ json: [mentor] })
    if (path === "/requests" && method === "GET")
      return route.fulfill({ json: requests })
    if (path === "/requests" && method === "POST") {
      const body = route.request().postDataJSON()
      requests = [
        {
          id: "request-1",
          teamId: "team-1",
          mentorId: mentor.id,
          topic: body.message,
          sessionNotes: null,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          team: { id: "team-1", name: "NileScope" },
          mentor,
          slot: null,
          _count: { messages: 1 },
        },
      ]
      messages = [
        {
          id: "message-1",
          senderId: user.id,
          content: body.message,
          createdAt: new Date().toISOString(),
          sender: { name: user.name, avatar: null },
        },
      ]
      return route.fulfill({ json: requests[0] })
    }
    if (path === "/requests/request-1/messages" && method === "GET")
      return route.fulfill({ json: [...messages].reverse() })
    if (path === "/requests/request-1/messages" && method === "POST") {
      const body = route.request().postDataJSON()
      messages.push({
        id: "message-2",
        senderId: user.id,
        content: body.content,
        createdAt: new Date().toISOString(),
        sender: { name: user.name, avatar: null },
      })
      return route.fulfill({ json: messages.at(-1) })
    }
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto("/en/dashboard/participant/mentorship")
  await expect(page.getByRole("heading", { name: "Dr. Lina" })).toBeVisible()
  await page.getByRole("button", { name: "Request mentorship" }).click()
  await page
    .getByRole("textbox", { name: /Describe what your team needs help with/ })
    .fill("Help us interpret satellite imagery")
  await page.getByRole("button", { name: "Send request" }).click()
  await expect(
    page.getByText("Help us interpret satellite imagery")
  ).toBeVisible()
  await page.getByRole("button", { name: "Open conversation" }).click()
  await page
    .getByRole("textbox", { name: "Write a message" })
    .fill("Can you review our data source?")
  await page.getByRole("button", { name: "Send", exact: true }).click()
  await expect(page.getByText("Can you review our data source?")).toBeVisible()
})

test("mentor accepts a team request, saves persistent notes, and scrolls its conversation", async ({
  page,
  context,
}, testInfo) => {
  const user = {
    id: mentor.id,
    name: mentor.name,
    email: "lina@example.test",
    role: "mentor",
    roles: ["mentor"],
  }
  await context.addCookies(
    Object.entries({
      auth_token: "fixture",
      auth_user: JSON.stringify(user),
      auth_role: "mentor",
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
  const request: MentorshipRequest = {
    id: "request-1",
    teamId: "team-1",
    mentorId: mentor.id,
    topic: "Help us interpret satellite imagery",
    sessionNotes: null,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    team: { id: "team-1", name: "NileScope" },
    mentor,
    slot: null,
    _count: { messages: 1 },
  }
  await page.route(/\/api\/mentorship(?:\/|\?|$)/, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/api/mentorship",
      ""
    )
    if (path === "/mentors") return route.fulfill({ json: [mentor] })
    if (path === "/requests" && route.request().method() === "GET")
      return route.fulfill({ json: [request] })
    if (
      path === "/requests/request-1" &&
      route.request().method() === "PATCH"
    ) {
      request.status = "accepted"
      return route.fulfill({ json: request })
    }
    if (
      path === "/requests/request-1/notes" &&
      route.request().method() === "PUT"
    ) {
      request.sessionNotes = route.request().postDataJSON().content
      return route.fulfill({ json: request })
    }
    if (path === "/requests/request-1/messages")
      return route.fulfill({
        json: Array.from({ length: 35 }, (_, index) => ({
          id: `message-${index}`,
          senderId: "participant-1",
          content: `Team question ${index}: ${request.topic}`,
          createdAt: new Date(
            Date.parse(request.createdAt) + index * 1000
          ).toISOString(),
          sender: { name: "Amira", avatar: null },
        })),
      })
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto("/en/dashboard/mentor")
  await expect(page.getByText("NileScope")).toBeVisible()
  await expect(
    page.getByText("Pending requests").locator("..").getByText("1")
  ).toBeVisible()
  await page.getByRole("button", { name: "Accept" }).click()
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible()
  await page
    .getByRole("textbox", { name: "Session notes" })
    .fill("Review the Earth observation dataset before our next session.")
  await page.getByRole("button", { name: "Save notes", exact: true }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Notes saved" })
  ).toHaveText("Notes saved")
  await page.reload()
  await expect(
    page.getByRole("textbox", { name: "Session notes" })
  ).toHaveValue("Review the Earth observation dataset before our next session.")
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole("button", { name: "Open conversation" }).click()
  const log = page.getByRole("log", { name: "Conversation" })
  await expect(
    log.getByText("Team question 34:", { exact: false })
  ).toBeVisible()
  expect(
    await log.evaluate((node) => node.scrollHeight > node.clientHeight)
  ).toBe(true)
  await log.focus()
  await page.keyboard.press("Home")
  await log.evaluate((node) => {
    node.scrollTop = 0
  })
  await expect(
    log.getByText("Team question 0:", { exact: false })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await log.scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath("mentor-chat-mobile.png") })
})
