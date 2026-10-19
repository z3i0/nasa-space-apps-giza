"use client"

import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "@/i18n/routing"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { getDashboardRole } from "@/components/dashboard/dashboard-navigation"
import { useAuthUser, type UserSession } from "@/lib/auth"
import { cn } from "@/lib/utils"
import styles from "./dashboard-shell.module.css"
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
  const user = useAuthUser() ?? initialUser
  const currentRole = getDashboardRole(pathname, user)
  const themeClassName = cn("dark", styles.theme, fontClassName)

  return (
    <DashboardThemeContext.Provider value={themeClassName}>
      <div
        className={cn(themeClassName, styles.shell)}
        data-dashboard-shell=""
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <a href="#dashboard-content" className={styles.skipLink}>
          {t("skipToContent")}
        </a>
        <DashboardNavbar
          currentRole={currentRole}
          themeClassName={themeClassName}
        />
        <SidebarProvider
          className={styles.workspace}
          style={{ "--sidebar-width": "224px" } as React.CSSProperties}
        >
          <AppSidebar currentRole={currentRole} />
          <div className={styles.content}>
            <main id="dashboard-content" tabIndex={-1} className={styles.main}>
              {currentRole === "mentor" || currentRole === "judge" ? (
                <RoleAccessGate key={currentRole} role={currentRole}>
                  {children}
                </RoleAccessGate>
              ) : (
                children
              )}
            </main>
            <footer className={styles.footer}>{t("footer")}</footer>
          </div>
        </SidebarProvider>
      </div>
    </DashboardThemeContext.Provider>
  )
}
