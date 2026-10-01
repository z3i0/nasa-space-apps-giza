"use client"

import { useTranslations } from "next-intl"
import { DashboardHeader } from "@/components/dashboard-header"
import { RoleGuard } from "@/components/role-guard"
import { ShieldCheck } from "lucide-react"

export default function OrganizerDashboard() {
  const t = useTranslations("Dashboard.organizer")

  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <DashboardHeader roleName="organizer" />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-amber-500/10 via-background to-background p-8 sm:p-12 text-center max-w-xl w-full shadow-sm flex flex-col items-center gap-4">
            <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="h-8 w-8" />
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
