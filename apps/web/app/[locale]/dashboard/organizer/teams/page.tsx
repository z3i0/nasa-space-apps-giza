"use client"

import { useTranslations } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import { TeamsManagementTable } from "@/components/dashboard/teams-management-table"
import { Users } from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"

export default function OrganizerTeamsPage() {
  const t = useTranslations("Dashboard")

  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <div className="w-full flex flex-col gap-4 lg:gap-6">
        <PageHeader
          icon={Users}
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          title={t("organizer.teamsTable.title")}
          subtitle={t("organizer.teamsTable.subtitle")}
          backHref="/dashboard/organizer"
        />

        {/* Dedicated Teams Management Table */}
        <TeamsManagementTable />
      </div>
    </RoleGuard>
  )
}
