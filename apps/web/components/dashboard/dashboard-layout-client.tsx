"use client"

import * as React from "react"
import { usePathname } from "@/i18n/routing"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { DashboardRole } from "@/components/dashboard/dashboard-config"
import { getAuthUser, UserSession } from "@/lib/auth"

interface DashboardLayoutClientProps {
  children: React.ReactNode
  initialUser?: UserSession | null
}

export function DashboardLayoutClient({ children, initialUser }: DashboardLayoutClientProps) {
  const pathname = usePathname()

  // Determine current role based on active route
  const roleFromPath: DashboardRole | null = React.useMemo(() => {
    if (pathname.includes("/dashboard/organizer")) return "organizer"
    if (pathname.includes("/dashboard/judge")) return "judge"
    if (pathname.includes("/dashboard/mentor")) return "mentor"
    if (pathname.includes("/dashboard/participant")) return "participant"
    return null
  }, [pathname])

  const initialRole: DashboardRole =
    initialUser?.roles?.includes("organizer") || initialUser?.role === "organizer"
      ? "organizer"
      : initialUser?.roles?.includes("judge") || initialUser?.role === "judge"
      ? "judge"
      : initialUser?.roles?.includes("mentor") || initialUser?.role === "mentor"
      ? "mentor"
      : "participant"

  const [fallbackRole, setFallbackRole] = React.useState<DashboardRole>(initialRole)

  React.useEffect(() => {
    const user = getAuthUser() || initialUser
    if (user?.roles?.includes("organizer") || user?.role === "organizer") {
      setFallbackRole("organizer")
    } else if (user?.roles?.includes("judge") || user?.role === "judge") {
      setFallbackRole("judge")
    } else if (user?.roles?.includes("mentor") || user?.role === "mentor") {
      setFallbackRole("mentor")
    }
  }, [initialUser])

  const currentRole: DashboardRole = roleFromPath ?? fallbackRole

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar currentRole={currentRole} />
      <SidebarInset className="min-h-svh flex flex-col bg-background overflow-x-clip">
        <DashboardNavbar currentRole={currentRole} />
        <main className="size-full flex-1 px-4 py-6 sm:px-6 mx-auto max-w-360">
          <div className="flex flex-col gap-3 lg:gap-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
