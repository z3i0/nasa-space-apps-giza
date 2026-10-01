"use client"

import { useTranslations } from "next-intl"
import { DashboardHeader } from "@/components/dashboard-header"
import { RoleGuard } from "@/components/role-guard"
import { Users } from "lucide-react"

export default function ParticipantDashboard() {
  const t = useTranslations("Dashboard.participant")

  return (
    <RoleGuard allowedRoles={["participant"]}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <DashboardHeader roleName="participant" />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-emerald-500/10 via-background to-background p-8 sm:p-12 text-center max-w-xl w-full shadow-sm flex flex-col items-center gap-4">
            <span className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Users className="h-8 w-8" />
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
