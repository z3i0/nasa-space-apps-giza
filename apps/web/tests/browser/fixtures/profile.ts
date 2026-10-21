import type { BrowserContext } from "@playwright/test"
import type { ParticipantProfile } from "../../../lib/profile"

export const profileFixture: ParticipantProfile = {
  id: "profile-fixture",
  userId: "profile-user",
  institution: "Cairo University",
  academicLevel: "Third year",
  desiredRole: "Python / Machine Learning",
  skills: ["Python", "Machine Learning", "GIS"],
  bio: "I’m a computer engineering student who enjoys turning satellite data into useful tools for local communities. Looking for teammates who care about clear, accessible design.",
  experience:
    "Built a crop-health classifier using Sentinel-2 imagery. Volunteered on a campus flood-awareness campaign. GitHub: github.com/demo-salma",
  interests: ["Earth observation", "Climate resilience", "Open data"],
  preferredChallenge: "Flood Signals · Earth observation",
  teamStatus: "already_have_team",
  isPublic: true,
  hideFromSearch: false,
  shareProjectsWithMentors: true,
  updatedAt: "2026-10-17T10:00:00.000Z",
  user: {
    id: "profile-user",
    name: "Amira Ragab",
    emailVerified: true,
    phone: "+201000000001",
  },
  team: { id: "team-fixture", name: "NileScope", memberCount: 4 },
}

export async function profileSession(context: BrowserContext) {
  const user = {
    id: "profile-user",
    name: "Amira Ragab",
    email: "profile@example.test",
    role: "participant",
    roles: ["participant"],
  }
  await context.addCookies(
    Object.entries({
      auth_token: "profile-fixture",
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
    (user) => localStorage.setItem("hackathon_user", JSON.stringify(user)),
    user
  )
}
