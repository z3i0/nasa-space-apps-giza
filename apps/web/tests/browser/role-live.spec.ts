// Opt-in real services: LIVE_ROLE_BROWSER=1, PLAYWRIGHT_PORT=3000.
// No mocked routes. All database records created here are uniquely named and removed.
import { test, expect } from "@playwright/test"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"

test("real participant, mentor, judge and organizer browser journey", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.LIVE_ROLE_BROWSER !== "1",
    "Requires local database and running development API/web services"
  )
  test.setTimeout(180000)
  if (
    process.env.NODE_ENV === "production" ||
    !baseURL ||
    new URL(baseURL).hostname !== "localhost"
  )
    throw new Error("Local development services required")
  const require = createRequire(
    new URL("../../../api/package.json", import.meta.url)
  )
  const { PrismaClient } = require("@prisma/client"),
    bcrypt = require("bcryptjs")
  const env = readFileSync(
    new URL("../../../api/.env", import.meta.url),
    "utf8"
  )
  const databaseURL = env
    .match(/^DATABASE_URL\s*=\s*(.+)$/m)?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, "")
  if (
    !databaseURL ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(databaseURL).hostname)
  )
    throw new Error("Local database required")
  const db = new PrismaClient({ datasources: { db: { url: databaseURL } } })
  const suffix = randomUUID().slice(0, 8),
    password = "BrowserRoleFlow2026!",
    teamName = `Browser Crew ${suffix}`
  const actors = ["participant", "mentor", "judge", "organizer"].map(
    (role) => ({
      role,
      name: `Browser ${role} ${suffix}`,
      email: `${role}.${suffix}@role-browser.invalid`,
    })
  )
  const contexts = await Promise.all(
    actors.map(() => browser.newContext({ baseURL }))
  )
  const pages = await Promise.all(contexts.map((c) => c.newPage()))
  try {
    const organizerId = randomUUID(),
      passwordHash = await bcrypt.hash(password, 10),
      organizer = actors[3]
    await db.user.create({
      data: {
        id: organizerId,
        name: organizer.name,
        email: organizer.email,
        role: "organizer",
        passwordHash,
        accounts: {
          create: {
            accountId: organizerId,
            providerId: "credential",
            password: passwordHash,
          },
        },
      },
    })
    for (let i = 0; i < 3; i++) {
      const page = pages[i],
        actor = actors[i]
      await page.goto("/en/register")
      await page.getByRole("combobox").selectOption(actor.role)
      await page.locator('input[autocomplete="name"]').fill(actor.name)
      await page.locator('input[type="email"]').fill(actor.email)
      await page.locator('input[type="tel"]').fill("+201000000001")
      await page.locator('input[type="password"]').nth(0).fill(password)
      await page.locator('input[type="password"]').nth(1).fill(password)
      await page
        .getByRole("button", { name: "Create account", exact: true })
        .click()
      await expect(page).toHaveURL(new RegExp(`/dashboard/${actor.role}$`), {
        timeout: 30000,
      })
      if (i > 0)
        await expect(
          page.getByRole("heading", { name: "Pending approval", exact: true })
        ).toBeVisible()
    }
    const participant = pages[0],
      mentor = pages[1],
      judge = pages[2],
      organizerPage = pages[3]
    await expect(
      participant.getByText("You have not added any skills yet.")
    ).toBeVisible()
    await expect(
      participant.getByText("Not selected", { exact: true })
    ).toBeVisible()
    await participant.goto("/en/dashboard/participant/team")
    await participant.getByLabel("Team name", { exact: true }).fill(teamName)
    await participant
      .getByRole("button", { name: "Create team", exact: true })
      .click()
    await expect(
      participant.getByRole("heading", { name: teamName, exact: true })
    ).toBeVisible()
    await participant.getByRole("link", { name: "Team overview", exact: true }).click()
    await expect(participant.getByRole("heading", { name: teamName, exact: true })).toBeVisible()
    await expect(participant.getByRole("button", { name: "Edit Team", exact: true }).first()).toBeVisible()
    await participant.goto("/en/dashboard/participant/challenges")
    await expect(participant.getByRole("article")).toHaveCount(14)
    await organizerPage.goto("/en/login")
    await organizerPage
      .getByLabel("Email Address", { exact: true })
      .fill(organizer.email)
    await organizerPage.getByLabel("Password", { exact: true }).fill(password)
    await organizerPage.getByRole("combobox").selectOption("organizer")
    await organizerPage
      .getByRole("button", { name: "Sign In", exact: true })
      .click()
    await expect(organizerPage).toHaveURL(/\/dashboard\/organizer$/, {
      timeout: 30000,
    })
    const mentorApplication = organizerPage
      .getByRole("article")
      .filter({ hasText: actors[1].email })
    await mentorApplication
      .getByRole("button", { name: "Approve access", exact: true })
      .click()
    await expect(
      mentor.getByText("Mentor access: accepted", { exact: true })
    ).toBeVisible({ timeout: 15000 })
    const judgeApplication = organizerPage
      .getByRole("article")
      .filter({ hasText: actors[2].email })
    await judgeApplication
      .getByRole("button", { name: "Decline request", exact: true })
      .click()
    await expect(
      judge.getByRole("heading", { name: "Declined", exact: true })
    ).toBeVisible({ timeout: 15000 })
    await judgeApplication
      .getByRole("button", { name: "Approve access", exact: true })
      .click()
    await expect(
      judge.getByText("Judge access: accepted", { exact: true })
    ).toBeVisible({ timeout: 15000 })
    await organizerPage.goto("/en/dashboard/organizer/participants")
    await organizerPage
      .getByRole("textbox", { name: "Search", exact: true })
      .fill(actors[0].email)
    await organizerPage
      .getByRole("button", { name: "Search", exact: true })
      .click()
    await expect(
      organizerPage.getByRole("heading", { name: actors[0].name, exact: true })
    ).toBeVisible()
    await organizerPage.goto("/en/dashboard/organizer/teams")
    await organizerPage
      .getByRole("textbox", { name: "Search", exact: true })
      .fill(teamName)
    await organizerPage
      .getByRole("button", { name: "Search", exact: true })
      .click()
    await expect(
      organizerPage.getByRole("heading", { name: teamName, exact: true })
    ).toBeVisible()
    await organizerPage.getByText("View team members", { exact: true }).click()
    await expect(
      organizerPage.getByText(`${actors[0].name} · Leader`, { exact: true })
    ).toBeVisible()
  } finally {
    await Promise.all(contexts.map((c) => c.close()))
    await db.team.deleteMany({ where: { name: teamName } })
    await db.user.deleteMany({
      where: { email: { in: actors.map((a) => a.email) } },
    })
    await db.$disconnect()
  }
})
