"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { RoleGuard } from "@/components/role-guard"
import { Construction } from "lucide-react"
import {
  DASHBOARD_ROLES_CONFIG,
  DashboardRole,
} from "@/components/dashboard/dashboard-config"

import { PageHeader } from "@/components/dashboard/page-header"

export default function DashboardSubpage() {
  const params = useParams()
  const t = useTranslations("Dashboard")

  const role = (params?.role as DashboardRole) || "participant"
  const subpage = params?.subpage as string

  const roleConfig =
    DASHBOARD_ROLES_CONFIG[role] || DASHBOARD_ROLES_CONFIG.participant
  const RoleIcon = roleConfig.icon

  // Try to find matching item title
  const currentItem = roleConfig.sections
    .flatMap((s) => s.items)
    .find((item) => item.url.endsWith(`/${subpage}`))

  const pageTitle = currentItem ? t(currentItem.titleKey) : subpage

  return (
    <RoleGuard allowedRoles={[role]}>
      <div className="flex w-full flex-col gap-4 lg:gap-6">
        <PageHeader
          icon={RoleIcon}
          title={pageTitle}
          subtitle={t("placeholder.description")}
          backHref={`/dashboard/${role}`}
        />

        <div className="mx-auto w-full max-w-4xl py-6 sm:py-8">
          <div className="space-y-6 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-background p-8 text-center shadow-xs sm:p-12">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner ring-1 ring-primary/20">
              <Construction className="size-8" />
            </div>

            <div className="mx-auto max-w-lg space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {pageTitle}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("placeholder.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
