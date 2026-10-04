"use client"

import { useTranslations } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import { UsersManagementTable } from "@/components/dashboard/users-management-table"
import { UserRound } from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"

export default function OrganizerParticipantsPage() {
  const t = useTranslations("Dashboard")

  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <div className="w-full flex flex-col gap-4 lg:gap-6">
        <PageHeader
          icon={UserRound}
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          title={t("organizer.usersTable.title")}
          subtitle={t("organizer.usersTable.subtitle")}
          backHref="/dashboard/organizer"
        />

        {/* Dedicated Participants Management Table */}
        <UsersManagementTable />
      </div>
    </RoleGuard>
  )
}
