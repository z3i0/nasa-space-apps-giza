import { expect, test, type Page } from "@playwright/test"

const user = {
  id: "community-tester",
  name: "Mariam Ali",
  email: "mariam@example.test",
  role: "participant",
  roles: ["participant"],
}
const question = {
  id: "question-1",
  title: "How can I align satellite images in Python?",
  content:
    "Our team is combining Landsat and Sentinel imagery. What is the best way to align their coordinate systems?",
  category: "technical",
  status: "resolved",
  authorId: user.id,
  author: user,
  answersCount: 2,
  viewsCount: 24,
  createdAt: "2026-10-02T12:00:00Z",
  updatedAt: "2026-10-02T12:00:00Z",
  answers: [
    {
      id: "a1",
      questionId: "question-1",
      authorId: "mentor",
      author: { ...user, id: "mentor", name: "Omar Hassan", role: "mentor" },
      content: "Check the projection of both source files first.",
      isAccepted: false,
      createdAt: "2026-10-02T13:00:00Z",
      comments: [],
    },
    {
      id: "a2",
      questionId: "question-1",
      authorId: "mentor",
      author: { ...user, id: "mentor", name: "Omar Hassan", role: "mentor" },
      content:
        "Use rasterio.warp.reproject to match the coordinate system, resolution, and bounds of the reference raster.",
      isAccepted: true,
      createdAt: "2026-10-02T14:00:00Z",
      comments: [],
    },
  ],
}
const posts = ["python", "design"].map((tag, i) => ({
  id: `post-${i}`,
  title: `Our ${tag} progress`,
  content:
    "A small update from our team. Here is what we learned while building our prototype.",
  tags: [tag],
  author: user,
  authorId: user.id,
  likesCount: 3,
  commentsCount: 2,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
  isPinned: i === 0,
}))

async function setup(page: Page) {
  const origin = new URL(test.info().project.use.baseURL as string).origin
  await page.context().addCookies(
    Object.entries({
      auth_token: "community-ui-test",
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
  await page.route("**/api/account/**", (route) =>
    route.fulfill({ json: { notifications: [], unreadCount: 0 } })
  )
  await page.route("**/api/community/**", (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith("/questions/question-1"))
      return route.fulfill({ json: question })
    if (url.pathname.endsWith("/questions")) {
      const empty =
        url.searchParams.get("status") === "unanswered" ||
        url.searchParams.get("q") === "missing"
      return route.fulfill({
        json: {
          items: empty ? [] : [question],
          total: empty ? 0 : 13,
          totalPages: empty ? 1 : 2,
          page: Number(url.searchParams.get("page") || 1),
          limit: 12,
        },
      })
    }
    const tag = url.searchParams.get("tag")
    const items = tag ? posts.filter((post) => post.tags.includes(tag)) : posts
    return route.fulfill({
      json: { items, total: items.length, totalPages: 1, page: 1, limit: 12 },
    })
  })
}

test("Q&A filters are labeled, reset restores results, and list/grid remain usable", async ({
  page,
}) => {
  await setup(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/en/dashboard/participant/community?tab=qa")
  await expect(
    page.getByRole("button", { name: "Grid View", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("2 answers", { exact: true })).toBeVisible()
  await page.getByRole("combobox", { name: "Answer status" }).click()
  await page.getByRole("option", { name: "Unanswered", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "No questions found" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Reset filters" }).first().click()
  await expect(
    page.getByRole("heading", { name: question.title })
  ).toBeVisible()
  const nextRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/questions?") &&
      new URL(request.url()).searchParams.get("page") === "2"
  )
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await nextRequest
  await page.getByRole("button", { name: "Grid View", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Grid View", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "List View", exact: true }).click()
  await page.screenshot({
    path: ".playwright/community-desktop.png",
    fullPage: true,
  })
})

test("question statuses are clear and the grid adapts to screen width", async ({
  page,
}) => {
  await setup(page)
  const items = [
    {
      ...question,
      id: "unanswered",
      title: "Question waiting for help",
      status: "unanswered",
      answersCount: 0,
    },
    {
      ...question,
      id: "answered",
      title: "Question with replies",
      status: "answered",
      answersCount: 2,
    },
    {
      ...question,
      id: "resolved",
      title: "Question with a solution",
      status: "resolved",
      answersCount: 1,
    },
  ]
  await page.route("**/api/community/questions?**", (route) =>
    route.fulfill({
      json: { items, total: 3, totalPages: 1, page: 1, limit: 12 },
    })
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/en/dashboard/participant/community?tab=qa")
  const cards = page.locator("[data-community-question]")
  await expect(cards).toHaveCount(3)
  await expect(
    cards.nth(0).locator('[data-question-status="unanswered"]')
  ).toHaveText("Unanswered")
  await expect(
    cards.nth(1).locator('[data-question-status="answered"]')
  ).toHaveText("Answered")
  await expect(
    cards.nth(2).locator('[data-question-status="resolved"]')
  ).toHaveText("Solved")
  const desktop = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y } = element.getBoundingClientRect()
      return { x, y }
    })
  )
  expect(desktop[0].y).toBe(desktop[1].y)
  expect(desktop[0].x).not.toBe(desktop[1].x)
  expect(desktop[2].y).toBeGreaterThan(desktop[0].y)
  await page.setViewportSize({ width: 390, height: 844 })
  const mobile = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().y)
  )
  expect(mobile[1]).toBeGreaterThan(mobile[0])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
})

test("tag choices remain available after filtering and reset returns all posts", async ({
  page,
}) => {
  await setup(page)
  await page.goto("/en/dashboard/participant/community")
  await page.getByRole("combobox", { name: "Tag", exact: true }).click()
  await page.getByRole("option", { name: "#python", exact: true }).click()
  await expect(page.getByText("1 post", { exact: true })).toBeVisible()
  await page.getByRole("combobox", { name: "Tag", exact: true }).click()
  await expect(
    page.getByRole("option", { name: "#design", exact: true })
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Reset filters" }).click()
  await expect(page.getByText("2 posts", { exact: true })).toBeVisible()
  await page.screenshot({
    path: ".playwright/community-feed.png",
    fullPage: true,
  })
})

test("accepted answers lead the thread and the answer shortcut focuses the composer", async ({
  page,
}) => {
  await setup(page)
  await page.goto("/en/dashboard/participant/community/question-1")
  await expect(page.locator("[data-community-answer]").first()).toContainText(
    "Use rasterio.warp.reproject"
  )
  await page
    .getByRole("button", { name: "Write an answer", exact: true })
    .click()
  await expect(page.locator("#answer-draft")).toBeFocused()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: ".playwright/community-answers.png",
    fullPage: true,
  })
  await page.getByRole("link", { name: "Back to all questions" }).click()
  await expect(page).toHaveURL(/tab=qa/)
})

test("feed likes are independent of the post link", async ({ page }) => {
  await setup(page)
  await page.route("**/api/community/posts/post-0/like", (route) =>
    route.fulfill({ json: { isLiked: true, likesCount: 4 } })
  )
  await page.goto("/en/dashboard/participant/community")
  const link = page.getByRole("link", { name: "Our python progress" })
  await expect(link).toHaveAttribute("href", /posts\/post-0$/)
  const like = page.getByRole("button", { name: "3 likes" }).first()
  await like.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("button", { name: "4 likes" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  await expect(page).toHaveURL(/community$/)
})

test("a post card opens its discussion and its author can edit and delete it", async ({
  page,
}) => {
  await setup(page)
  let post = { ...posts[0], comments: [] as object[] }
  await page.route("**/api/community/posts/post-0", (route) => {
    if (route.request().method() === "DELETE")
      return route.fulfill({ json: { success: true } })
    if (route.request().method() === "PATCH")
      post = { ...post, ...route.request().postDataJSON() }
    return route.fulfill({ json: post })
  })
  await page.route("**/api/community/posts/post-0/comments", (route) =>
    route.fulfill({
      json: {
        id: "comment-1",
        author: user,
        authorId: user.id,
        content: route.request().postDataJSON().content,
        createdAt: question.createdAt,
        replies: [],
      },
    })
  )
  await page.goto("/en/dashboard/participant/community")
  const card = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole("link", { name: posts[0].title }) })
  const contentBox = await card.getByText(posts[0].content).boundingBox()
  expect(contentBox).not.toBeNull()
  await page.mouse.click(contentBox!.x + 10, contentBox!.y + 10)
  await expect(page).toHaveURL(/community\/posts\/post-0$/)
  await expect(page.getByRole("button", { name: "Edit Post" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Delete Post" })).toBeVisible()
  await expect(page.getByRole("button", { name: "3 likes" })).toBeVisible()
  await page
    .getByPlaceholder("Write your constructive comment here...")
    .fill("Great work, team!")
  await page.getByRole("button", { name: "Submit Comment" }).click()
  await expect(page.getByText("Great work, team!")).toBeVisible()
  await page.getByRole("button", { name: "Edit Post" }).click()
  const dialog = page.getByRole("dialog")
  await dialog
    .getByPlaceholder(
      "e.g. Quick walkthrough of our team's AI satellite pipeline"
    )
    .fill("Updated team progress")
  await dialog.getByRole("button", { name: "Save Changes" }).click()
  await expect(page.getByText("Updated team progress")).toBeVisible()
  page.once("dialog", (confirmation) => confirmation.accept())
  await page.getByRole("button", { name: "Delete Post" }).click()
  await expect(page).toHaveURL(/community\?tab=feed$/)
})

test("post management actions are hidden from other participants", async ({
  page,
}) => {
  await setup(page)
  await page.route("**/api/community/posts/post-1", (route) =>
    route.fulfill({
      json: { ...posts[1], authorId: "another-user", comments: [] },
    })
  )
  await page.goto("/en/dashboard/participant/community/posts/post-1")
  await expect(page.getByText(posts[1].title)).toBeVisible()
  await expect(page.getByRole("button", { name: "Edit Post" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Delete Post" })).toHaveCount(0)
})

test("Arabic mobile Q&A fits the viewport and retains labeled filters", async ({
  page,
}) => {
  await setup(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/ar/dashboard/participant/community?tab=qa")
  await expect(
    page.getByRole("heading", { name: question.title })
  ).toBeVisible()
  await expect(
    page.getByRole("combobox", { name: "حالة الإجابة" })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.screenshot({
    path: ".playwright/community-mobile-ar.png",
    fullPage: true,
  })
  await page.getByRole("link", { name: /How can I align satellite/ }).click()
  await expect(page.locator("[data-community-answer]").first()).toContainText(
    "Use rasterio.warp.reproject"
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.screenshot({
    path: ".playwright/community-answers-mobile-ar.png",
    fullPage: true,
  })
})

test("retry reloads a failed request on the first page", async ({ page }) => {
  await setup(page)
  let requests = 0
  await page.route("**/api/community/questions?**", (route) => {
    requests += 1
    return requests === 1
      ? route.fulfill({ status: 500, json: { message: "Unavailable" } })
      : route.fulfill({
          json: {
            items: [question],
            total: 1,
            totalPages: 1,
            page: 1,
            limit: 12,
          },
        })
  })
  await page.goto("/en/dashboard/participant/community?tab=qa")
  await expect(
    page.getByRole("alert").filter({ hasText: "Failed to load" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Try again" }).click()
  await expect(
    page.getByRole("heading", { name: question.title })
  ).toBeVisible()
  expect(requests).toBe(2)
})
