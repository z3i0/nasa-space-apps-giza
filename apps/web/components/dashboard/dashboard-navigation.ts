import {
  DASHBOARD_ROLES_CONFIG,
  type DashboardRole,
  type NavItem,
} from "./dashboard-config"
import type { UserSession } from "@/lib/auth"

export interface ShellNavItem extends NavItem {
  matchPaths?: string[]
}

export interface ShellNavSection {
  titleKey?: string
  items: ShellNavItem[]
}

const participantItems = DASHBOARD_ROLES_CONFIG.participant.sections.flatMap(
  (section) => section.items
)
const participantNavigation = [
  {
    route: "",
    label: "mission",
  },
  { route: "/challenges", label: "challenges" },
  {
    route: "/find-team",
    label: "findTeam",
  },
  {
    route: "/team",
    label: "team",
  },
  { route: "/tasks", label: "tasks" },
  { route: "/community", label: "community" },
  { route: "/schedule", label: "schedule" },
  {
    route: "/mentorship",
    label: "mentors",
    matchPaths: [
      "/dashboard/participant/sessions",
      "/dashboard/participant/mentor-map",
    ],
  },
  {
    route: "/submit",
    label: "submission",
    matchPaths: ["/dashboard/participant/project"],
  },
].map(({ route, label, matchPaths }): ShellNavItem => {
  const url = `/dashboard/participant${route}`
  const existing = participantItems.find((item) => item.url === url)!
  return {
    ...existing,
    titleKey: `shell.nav.${label}`,
    matchPaths,
  }
})

import { LayoutDashboard } from "lucide-react"

export function getShellNavigation(
  role: DashboardRole,
  user?: UserSession | null
): ShellNavSection[] {
  if (role === "participant") {
    return [{ items: participantNavigation }]
  }

  const isCompetitionOnly =
    role === "organizer" &&
    (user?.roles?.includes("competition") || user?.role === "competition") &&
    !user?.roles?.includes("organizer") &&
    user?.role !== "organizer"

  if (isCompetitionOnly) {
    return [
      {
        titleKey: "sections.main",
        items: [
          {
            titleKey: "nav.overview",
            url: "/dashboard/organizer",
            icon: LayoutDashboard,
          },
        ],
      },
    ]
  }

  return DASHBOARD_ROLES_CONFIG[role].sections
}

export function isNavigationActive(
  pathname: string,
  item: ShellNavItem,
  role: DashboardRole
): boolean {
  const path = pathname.replace(/\/$/, "")
  return [item.url, ...(item.matchPaths ?? [])].some(
    (target) =>
      path === target ||
      (target !== `/dashboard/${role}` && path.startsWith(`${target}/`))
  )
}

export function getDashboardRole(user?: UserSession | null): DashboardRole {
  // Keep frontend navigation in the account's main workspace. A selected
  // mentor/judge role still identifies a pending application; API permissions
  // continue to be checked by the existing backend.
  if (user?.roles?.includes("competition") || user?.role === "competition") {
    return "organizer"
  }
  return (
    (["organizer", "judge", "mentor", "participant"] as const).find(
      (role) => user?.roles?.includes(role) || user?.role === role
    ) ?? "participant"
  )
}
