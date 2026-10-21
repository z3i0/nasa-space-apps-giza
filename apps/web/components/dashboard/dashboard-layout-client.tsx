"use client"

import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "@/i18n/routing"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { getDashboardRole } from "@/components/dashboard/dashboard-navigation"
import { useAuthUser, type UserSession } from "@/lib/auth"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { DashboardThemeContext } from "./dashboard-theme-context"
import { RoleAccessGate } from "@/components/account/role-access-gate"

interface DashboardLayoutClientProps {
  children: React.ReactNode
  initialUser?: UserSession | null
  fontClassName: string
}

export function DashboardLayoutClient({
  children,
  initialUser,
  fontClassName,
}: DashboardLayoutClientProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations("Dashboard.shell")
  const { resolvedTheme } = useTheme()
  const user = useAuthUser() ?? initialUser
  const currentRole = getDashboardRole(pathname, user)
  const themeClassName = cn(
    resolvedTheme === "dark" && "dark",
    fontClassName,
    "font-[family-name:var(--font-dashboard-body),var(--font-arabic),var(--font-latin),sans-serif]"
  )

  return (
    <DashboardThemeContext.Provider value={themeClassName}>
      <div
        className={cn(
          themeClassName,
          resolvedTheme === "dark"
            ? "[color-scheme:dark]"
            : "[color-scheme:light]",
          "min-h-dvh bg-background text-foreground [font-synthesis:none] motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:scroll-auto motion-reduce:[&_*]:transition-none [&_[tabindex]:focus-visible]:outline-2 [&_[tabindex]:focus-visible]:outline-offset-[3px] [&_[tabindex]:focus-visible]:outline-ring [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-[3px] [&_a:focus-visible]:outline-ring [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-[3px] [&_button:focus-visible]:outline-ring [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-[3px] [&_input:focus-visible]:outline-ring [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-[3px] [&_select:focus-visible]:outline-ring [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-offset-[3px] [&_textarea:focus-visible]:outline-ring"
        )}
        data-dashboard-shell=""
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <a
          href="#dashboard-content"
          className="fixed inset-s-4 top-2 z-[100] -translate-y-[160%] rounded-lg bg-primary px-4 py-2.5 text-primary-foreground focus:translate-y-0"
        >
          {t("skipToContent")}
        </a>
        <DashboardNavbar
          currentRole={currentRole}
          themeClassName={themeClassName}
        />
        <SidebarProvider
          className="flex min-h-[calc(100dvh-72px)] w-full items-start bg-background bg-[radial-gradient(circle_at_91%_85%,#4f8bd633,transparent_34%)] max-[760px]:block max-[760px]:min-h-[calc(100dvh-64px)] rtl:bg-[radial-gradient(circle_at_9%_85%,#4f8bd633,transparent_34%)] dark:bg-[radial-gradient(circle_at_91%_85%,#245c9b57,transparent_34%)] dark:rtl:bg-[radial-gradient(circle_at_9%_85%,#245c9b57,transparent_34%)]"
          style={{ "--sidebar-width": "224px" } as React.CSSProperties}
        >
          <AppSidebar currentRole={currentRole} />
          <div className="flex min-h-[calc(100dvh-72px)] min-w-0 flex-1 flex-col gap-5 px-10 pt-7 pb-10 max-[1050px]:px-6 max-[760px]:min-h-[calc(100dvh-180px)] max-[760px]:px-4 max-[760px]:pt-5 max-[760px]:pb-8">
            <main
              id="dashboard-content"
              tabIndex={-1}
              className="w-full min-w-0 flex-1 outline-none"
            >
              {currentRole === "mentor" || currentRole === "judge" ? (
                <RoleAccessGate key={currentRole} role={currentRole}>
                  {children}
                </RoleAccessGate>
              ) : (
                children
              )}
            </main>
            <footer className="mt-[26px] border-t border-border pt-[26px] text-[11px] leading-[1.55] text-muted-foreground">
              {t("footer")}
            </footer>
          </div>
        </SidebarProvider>
      </div>
    </DashboardThemeContext.Provider>
  )
}
