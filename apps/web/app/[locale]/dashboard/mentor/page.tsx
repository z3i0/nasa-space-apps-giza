"use client"

import { useTranslations } from "next-intl"
import { DashboardHeader } from "@/components/dashboard-header"
import { RoleGuard } from "@/components/role-guard"
import { Compass } from "lucide-react"

export default function MentorDashboard() {
  const t = useTranslations("Dashboard.mentor")

  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <DashboardHeader roleName="mentor" />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-blue-500/10 via-background to-background p-8 sm:p-12 text-center max-w-xl w-full shadow-sm flex flex-col items-center gap-4">
            <span className="p-3 rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Compass className="h-8 w-8" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("welcome")}
            </h1>
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
