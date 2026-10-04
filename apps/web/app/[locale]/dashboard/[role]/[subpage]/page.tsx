"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { Link } from "@/i18n/routing"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RoleGuard } from "@/components/role-guard"
import { Construction, ArrowLeft, ArrowRight, Sparkles } from "lucide-react"
import { useLocale } from "next-intl"
import { DASHBOARD_ROLES_CONFIG, DashboardRole } from "@/components/dashboard/dashboard-config"
import { cn } from "@/lib/utils"

import { PageHeader } from "@/components/dashboard/page-header"

export default function DashboardSubpage() {
  const params = useParams()
  const locale = useLocale()
  const t = useTranslations("Dashboard")

  const role = (params?.role as DashboardRole) || "participant"
  const subpage = params?.subpage as string

  const roleConfig = DASHBOARD_ROLES_CONFIG[role] || DASHBOARD_ROLES_CONFIG.participant
  const RoleIcon = roleConfig.icon

  // Try to find matching item title
  const currentItem = roleConfig.sections
    .flatMap((s) => s.items)
    .find((item) => item.url.endsWith(`/${subpage}`))

  const pageTitle = currentItem ? t(currentItem.titleKey as any) : subpage

  return (
    <RoleGuard allowedRoles={[role]}>
      <div className="w-full flex flex-col gap-4 lg:gap-6">
        <PageHeader
          icon={RoleIcon}
          title={pageTitle}
          subtitle={t("placeholder.description")}
          backHref={`/dashboard/${role}`}
        />

        <div className="w-full max-w-4xl mx-auto py-6 sm:py-8">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-background p-8 sm:p-12 text-center shadow-xs space-y-6">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-inner">
              <Construction className="size-8" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {pageTitle}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("placeholder.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
