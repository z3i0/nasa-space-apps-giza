import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createMiddleware(routing)
const dashboardRoles = [
  "organizer",
  "judge",
  "mentor",
  "participant",
  "competition",
]

function getSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("auth_token")?.value
  )
}

function getUserRoles(request: NextRequest): string[] {
  const roleSingle = request.cookies.get("auth_role")?.value
  const rolesRaw = request.cookies.get("auth_roles")?.value

  let roles: string[] = []
  if (rolesRaw) {
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(rolesRaw))
      if (Array.isArray(parsed)) {
        roles = parsed.filter(
          (role): role is string =>
            typeof role === "string" && dashboardRoles.includes(role)
        )
      }
    } catch {
      roles = []
    }
  }

  if (
    roleSingle &&
    dashboardRoles.includes(roleSingle) &&
    !roles.includes(roleSingle)
  ) {
    roles.unshift(roleSingle)
  }

  return roles
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = getSessionToken(request)

  // Cookie presence alone cannot verify a session. Always let the login page
  // validate it with the auth API and repair stale/missing local role hints.
  const dashboardMatch = pathname.match(
    /^(?:\/(ar|en))?\/dashboard(?:\/([^/]+))?(?:\/|$)/
  )
  if (dashboardMatch) {
    const locale = dashboardMatch[1] || routing.defaultLocale
    const roles = getUserRoles(request)
    if (!token || roles.length === 0) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }

    const requestedRole = dashboardMatch[2]
    const hasOrganizerBypass = roles.includes("organizer")
    const isCompetition = roles.includes("competition")

    // Scoped access control for competition role inside organizer dashboard
    if (requestedRole === "organizer" && isCompetition && !hasOrganizerBypass) {
      const subpathMatch = pathname.match(
        /^(?:\/(?:ar|en))?\/dashboard\/organizer(?:\/([^/]+))?/
      )
      const subpath = subpathMatch?.[1] || ""
      if (subpath) {
        return NextResponse.redirect(
          new URL(`/${locale}/dashboard/organizer`, request.url)
        )
      }
    }

    // Direct access to /dashboard/competition redirects to /dashboard/organizer
    if (requestedRole === "competition") {
      return NextResponse.redirect(
        new URL(`/${locale}/dashboard/organizer`, request.url)
      )
    }

    // Mentor/judge shells also host pending/denied applications. Their layout
    // verifies current server approval before mounting any protected content.
    if (
      dashboardRoles.includes(requestedRole) &&
      !hasOrganizerBypass &&
      !(requestedRole === "organizer" && isCompetition) &&
      !["mentor", "judge"].includes(requestedRole) &&
      !roles.includes(requestedRole)
    ) {
      // Choose only a role the user actually has; missing roles must never
      // bounce between participant and organizer dashboards.
      const targetRole = isCompetition
        ? "organizer"
        : (dashboardRoles.find((role) => roles.includes(role)) || "participant")
      return NextResponse.redirect(
        new URL(`/${locale}/dashboard/${targetRole}`, request.url)
      )
    }
  }

  // Delegate to next-intl middleware for locale routing
  return intlMiddleware(request)
}

export const config = {
  // Match all pathnames except for
  // - files with extensions (e.g. favicon.ico, images)
  // - api routes, _next, _vercel
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
