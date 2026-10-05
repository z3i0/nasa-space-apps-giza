import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createMiddleware(routing)

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
      roles = JSON.parse(decodeURIComponent(rolesRaw))
    } catch {
      roles = []
    }
  }

  if (roleSingle && !roles.includes(roleSingle)) {
    roles.unshift(roleSingle)
  }

  return roles
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = getSessionToken(request)

  // 1. If already authenticated and visiting /login -> redirect to designated dashboard
  const loginMatch = pathname.match(/^(\/(ar|en))?\/login\/?$/)
  if (loginMatch) {
    if (token) {
      const roles = getUserRoles(request)
      const locale = loginMatch[2] || routing.defaultLocale
      const targetRole = roles.includes("organizer")
        ? "organizer"
        : roles.includes("judge")
        ? "judge"
        : roles.includes("mentor")
        ? "mentor"
        : "participant"

      return NextResponse.redirect(new URL(`/${locale}/dashboard/${targetRole}`, request.url))
    }
  }

  // 2. Check if target is a dashboard route (e.g. /ar/dashboard/... or /en/dashboard/... or /dashboard/...)
  const isDashboardRoute = pathname.includes("/dashboard/")

  if (isDashboardRoute) {
    const localeMatch = pathname.match(/^\/(ar|en)\//)
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale

    // 1. If unauthenticated -> redirect to /login
    if (!token) {
      const loginUrl = new URL(`/${locale}/login`, request.url)
      return NextResponse.redirect(loginUrl)
    }

    // 2. Role verification
    const roles = getUserRoles(request)
    const isOrganizer = roles.includes("organizer")

    // Role-specific route protection:
    if (pathname.includes("/dashboard/organizer") && !isOrganizer) {
      const targetRoleDashboard = roles.includes("judge")
        ? "judge"
        : roles.includes("mentor")
        ? "mentor"
        : "participant"
      return NextResponse.redirect(new URL(`/${locale}/dashboard/${targetRoleDashboard}`, request.url))
    }

    if (pathname.includes("/dashboard/judge") && !roles.includes("judge") && !isOrganizer) {
      const targetRoleDashboard = roles.includes("mentor") ? "mentor" : "participant"
      return NextResponse.redirect(new URL(`/${locale}/dashboard/${targetRoleDashboard}`, request.url))
    }

    if (pathname.includes("/dashboard/mentor") && !roles.includes("mentor") && !isOrganizer) {
      const targetRoleDashboard = roles.includes("judge") ? "judge" : "participant"
      return NextResponse.redirect(new URL(`/${locale}/dashboard/${targetRoleDashboard}`, request.url))
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
