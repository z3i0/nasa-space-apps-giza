import {
  DASHBOARD_ROLES_CONFIG,
  type DashboardRole,
  type NavItem,
} from "./dashboard-config"
import type { UserSession } from "@/lib/auth"

export interface ShellNavItem extends NavItem {
  asset?: string
  activeAsset?: string
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
    asset: "mission",
    activeAsset: "mission-active",
  },
  { route: "/challenges", label: "challenges", asset: "challenges" },
  {
    route: "/find-team",
    label: "findTeam",
    asset: "find-team",
    activeAsset: "find-team-active",
  },
  {
    route: "/team",
    label: "team",
    asset: "team",
    activeAsset: "team-active",
  },
  { route: "/tasks", label: "tasks", asset: "tasks" },
  { route: "/community", label: "community", asset: "community" },
  { route: "/schedule", label: "schedule", asset: "schedule" },
  {
    route: "/mentorship",
    label: "mentors",
    asset: "mentors",
    matchPaths: [
      "/dashboard/participant/sessions",
      "/dashboard/participant/mentor-map",
    ],
  },
  {
    route: "/submit",
    label: "submission",
    asset: "submission",
    matchPaths: ["/dashboard/participant/project"],
  },
].map(({ route, label, asset, activeAsset, matchPaths }): ShellNavItem => {
  const url = `/dashboard/participant${route}`
  const existing = participantItems.find((item) => item.url === url)!
  return {
    ...existing,
    titleKey: `shell.nav.${label}`,
    asset,
    activeAsset,
    matchPaths,
  }
})

export function getShellNavigation(role: DashboardRole): ShellNavSection[] {
  return role === "participant"
    ? [{ items: participantNavigation }]
    : DASHBOARD_ROLES_CONFIG[role].sections
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

export function getDashboardRole(
  pathname: string,
  user?: UserSession | null
): DashboardRole {
  const routeRole = pathname.split("/")[2]
  if (routeRole && Object.hasOwn(DASHBOARD_ROLES_CONFIG, routeRole))
    return routeRole as DashboardRole
  return (
    (["organizer", "judge", "mentor", "participant"] as const).find(
      (role) => user?.roles?.includes(role) || user?.role === role
    ) ?? "participant"
  )
}

export function getAvailableRoles(user: UserSession | null): DashboardRole[] {
  const roles = Object.keys(DASHBOARD_ROLES_CONFIG) as DashboardRole[]
  return roles.filter(
    (role) =>
      user?.roles?.includes("organizer") ||
      user?.role === "organizer" ||
      user?.roles?.includes(role) ||
      user?.role === role
  )
}
