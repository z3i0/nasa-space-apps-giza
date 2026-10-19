import { expect, test } from "@playwright/test"
import { profileSession } from "./fixtures/profile"

const teamFixture = {
  id: "team-fixture-1",
  name: "NileScope Pioneers",
  description: "Building satellite tools for climate analysis.",
  createdById: "profile-user",
  createdAt: "2026-10-17T10:00:00.000Z",
  maxMembers: 5,
  track: "Climate & Earth Observation",
  members: [
    {
      id: "member-1",
      teamId: "team-fixture-1",
      userId: "profile-user",
      role: "leader",
      joinedAt: "2026-10-17T10:00:00.000Z",
      user: {
        id: "profile-user",
        name: "Amira Ragab",
        username: "amira_r",
      },
    },
    {
      id: "member-2",
      teamId: "team-fixture-1",
      userId: "user-2",
      role: "member",
      joinedAt: "2026-10-17T10:00:00.000Z",
      user: {
        id: "user-2",
        name: "Tarek Omar",
        username: "tarek_o",
      },
    },
  ],
  joinRequests: [],
}

test.beforeEach(async ({ context }) => profileSession(context))

test("Arabic team page opens Dialog instead of native window.confirm for leave action", async ({ page }) => {
  let nativeDialogTriggered = false
  page.on("dialog", (dialog) => {
    nativeDialogTriggered = true
    void dialog.dismiss()
  })

  await page.route("**/teams/me", (route) =>
    route.fulfill({ json: { team: teamFixture } })
  )

  await page.goto("/ar/dashboard/participant/team/overview")

  // Click leave team button
  const leaveButton = page.getByRole("button", { name: "مغادرة الفريق" })
  await expect(leaveButton).toBeVisible()
  await leaveButton.click()

  // Native window.confirm must NOT have fired
  expect(nativeDialogTriggered).toBe(false)

  // Custom modal dialog must be visible
  const dialogModal = page.getByRole("dialog")
  await expect(dialogModal).toBeVisible()
  await expect(dialogModal).toContainText("تأكيد مغادرة الفريق")
  await expect(dialogModal).toContainText("أنت قائد الفريق")

  // Cancel button closes the dialog
  const cancelButton = dialogModal.getByRole("button", { name: "إلغاء" })
  await cancelButton.click()
  await expect(dialogModal).not.toBeVisible()
})

test("English team page opens Dialog instead of native window.confirm for leave action", async ({ page }) => {
  let nativeDialogTriggered = false
  page.on("dialog", (dialog) => {
    nativeDialogTriggered = true
    void dialog.dismiss()
  })

  await page.route("**/teams/me", (route) =>
    route.fulfill({ json: { team: teamFixture } })
  )

  await page.goto("/en/dashboard/participant/team/overview")

  // Click leave team button
  const leaveButton = page.getByRole("button", { name: "Leave Team" })
  await expect(leaveButton).toBeVisible()
  await leaveButton.click()

  // Native window.confirm must NOT have fired
  expect(nativeDialogTriggered).toBe(false)

  // Custom modal dialog must be visible
  const dialogModal = page.getByRole("dialog")
  await expect(dialogModal).toBeVisible()
  await expect(dialogModal).toContainText("Confirm Leaving Team")
  await expect(dialogModal).toContainText("You are the team leader")

  // Cancel button closes the dialog
  const cancelButton = dialogModal.getByRole("button", { name: "Cancel" })
  await cancelButton.click()
  await expect(dialogModal).not.toBeVisible()
})

test("Arabic team page opens Dialog for member removal and transfer actions", async ({ page }) => {
  let nativeDialogTriggered = false
  page.on("dialog", (dialog) => {
    nativeDialogTriggered = true
    void dialog.dismiss()
  })

  await page.route("**/teams/me", (route) =>
    route.fulfill({ json: { team: teamFixture } })
  )

  await page.goto("/ar/dashboard/participant/team/overview")

  // Open member actions menu for Tarek Omar
  const memberMenuTrigger = page.getByRole("button", { name: "إجراءات العضو" })
  await expect(memberMenuTrigger).toBeVisible()
  await memberMenuTrigger.click()

  // Click remove member
  const removeMenuItem = page.getByRole("menuitem", { name: "إزالة" })
  await expect(removeMenuItem).toBeVisible()
  await removeMenuItem.click()

  expect(nativeDialogTriggered).toBe(false)
  const removeDialog = page.getByRole("dialog")
  await expect(removeDialog).toBeVisible()
  await expect(removeDialog).toContainText("تأكيد إزالة العضو")
  await expect(removeDialog).toContainText("Tarek Omar")

  // Close dialog via Cancel
  await removeDialog.getByRole("button", { name: "إلغاء" }).click()
  await expect(removeDialog).not.toBeVisible()

  // Now test transfer leadership
  await memberMenuTrigger.click()
  const transferMenuItem = page.getByRole("menuitem", { name: "جعله قائداً" })
  await expect(transferMenuItem).toBeVisible()
  await transferMenuItem.click()

  expect(nativeDialogTriggered).toBe(false)
  const transferDialog = page.getByRole("dialog")
  await expect(transferDialog).toBeVisible()
  await expect(transferDialog).toContainText("تأكيد نقل القيادة")
  await expect(transferDialog).toContainText("Tarek Omar")

  // Close dialog
  await transferDialog.getByRole("button", { name: "إلغاء" }).click()
  await expect(transferDialog).not.toBeVisible()
})

test("Team permalink [teamId] page opens Dialog for leave and leader actions", async ({ page }) => {
  let nativeDialogTriggered = false
  page.on("dialog", (dialog) => {
    nativeDialogTriggered = true
    void dialog.dismiss()
  })

  await page.route("**/teams/team-fixture-1", (route) =>
    route.fulfill({ json: teamFixture })
  )
  await page.route("**/teams/me", (route) =>
    route.fulfill({ json: { team: teamFixture } })
  )

  await page.goto("/ar/dashboard/participant/team/team-fixture-1")

  // Click leave team
  const leaveButton = page.getByRole("button", { name: "مغادرة الفريق" })
  await expect(leaveButton).toBeVisible()
  await leaveButton.click()

  expect(nativeDialogTriggered).toBe(false)
  const dialogModal = page.getByRole("dialog")
  await expect(dialogModal).toBeVisible()
  await expect(dialogModal).toContainText("تأكيد مغادرة الفريق")
  await dialogModal.getByRole("button", { name: "إلغاء" }).click()
  await expect(dialogModal).not.toBeVisible()
})

test("ignores another account's cached team while loading the current team", async ({ page }) => {
  await page.addInitScript((fixture) => {
    localStorage.setItem(
      "my_team_cache",
      JSON.stringify({ userId: "another-account", team: { ...fixture, name: "Another account team" } })
    )
  }, teamFixture)

  // The stale cache must never be rendered, including before the API completes.
  await page.route("**/teams/me", async (route) => {
    await new Promise((r) => setTimeout(r, 800))
    await route.fulfill({ json: { team: teamFixture } })
  })

  await page.goto("/ar/dashboard/participant/team/overview")
  await expect(page.getByRole("heading", { name: "Another account team" })).toHaveCount(0)

  // The verified current team replaces the loading state.
  await expect(page.getByRole("heading", { name: "NileScope Pioneers" })).toBeVisible()

  // The "no team" hero must NOT appear
  await expect(page.getByText("You dont have a team yet")).not.toBeVisible()
})

test("the original creator loses leader controls after transferring leadership", async ({ page }) => {
  await page.route("**/teams/me", route => route.fulfill({ json: { team: {
    ...teamFixture,
    members: teamFixture.members.map(member => ({ ...member, role: member.userId === "profile-user" ? "member" : "leader" })),
  } } }))
  await page.goto("/en/dashboard/participant/team/overview")
  await expect(page.getByRole("heading", { name: teamFixture.name })).toBeVisible()
  await expect(page.getByRole("button", { name: "Edit Team", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Member actions", exact: true })).toHaveCount(0)
})
