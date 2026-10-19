import { expect, test } from "@playwright/test"
test("organizer directories show current API records and support searching and roster details", async ({
  page,
  context,
}) => {
  const user = {
    id: "organizer",
    name: "Organizer",
    email: "organizer@example.test",
    role: "organizer",
    roles: ["organizer"],
  }
  await context.addCookies(
    Object.entries({
      auth_token: "fixture",
      auth_user: JSON.stringify(user),
      auth_role: "organizer",
      auth_roles: JSON.stringify(user.roles),
    }).map(([name, value]) => ({
      name,
      value: encodeURIComponent(value),
      url: "http://localhost:3000",
    }))
  )
  await page.route("**/api/account/directory?**", (route) => {
    const query = new URL(route.request().url()).searchParams
    const participant = {
      id: "participant",
      name: "Actual Participant",
      email: "actual@example.test",
      isActive: true,
      institution: "University",
      skills: ["GIS"],
      team: { id: "crew", name: "Actual Crew" },
    }
    const team = {
      id: "crew",
      name: "Actual Crew",
      challenge: "Climate data",
      maxMembers: 5,
      members: [
        {
          userId: "participant",
          role: "leader",
          user: { name: "Actual Participant" },
        },
      ],
      submission: { title: "Actual project", status: "submitted", version: 2 },
    }
    const items =
      query.get("search") === "absent"
        ? []
        : [query.get("kind") === "teams" ? team : participant]
    return route.fulfill({
      json: {
        items,
        total: items.length,
        page: 1,
        totalPages: items.length ? 1 : 0,
      },
    })
  })
  await page.goto("/en/dashboard/organizer/participants")
  await expect(
    page.getByRole("heading", { name: "Actual Participant" })
  ).toBeVisible()
  await expect(
    page.getByText("actual@example.test", { exact: true })
  ).toBeVisible()
  await page
    .getByRole("textbox", { name: "Search", exact: true })
    .fill("absent")
  await page.getByRole("button", { name: "Search", exact: true }).click()
  await expect(page.getByText("No matching records.")).toBeVisible()
  await page.goto("/en/dashboard/organizer/teams")
  await expect(page.getByRole("heading", { name: "Actual Crew" })).toBeVisible()
  await page.getByText("View team members", { exact: true }).click()
  await expect(
    page.getByText("Actual Participant · Leader", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText("Actual project · v2", { exact: true })
  ).toBeVisible()
})
