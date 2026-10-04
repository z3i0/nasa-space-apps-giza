"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import {
  ShieldCheck,
  Megaphone,
  Activity,
  Calendar,
  Users,
  UserRound,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { UsersManagementTable } from "@/components/dashboard/users-management-table"
import { TeamsManagementTable } from "@/components/dashboard/teams-management-table"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuthUser } from "@/lib/auth"

export default function OrganizerDashboard() {
  const t = useTranslations("Dashboard")
  const user = useAuthUser()
  const displayName = user?.name || user?.fullName
  const welcomeTitle = displayName
    ? t("welcomeTitle", { name: displayName })
    : t("welcomeFallback")

  const [activeTab, setActiveTab] = React.useState<"participants" | "teams">("participants")

  const activityItems = [
    { time: t("organizer.activityFeed.item1Time"), text: t("organizer.activityFeed.item1Text") },
    { time: t("organizer.activityFeed.item2Time"), text: t("organizer.activityFeed.item2Text") },
    { time: t("organizer.activityFeed.item3Time"), text: t("organizer.activityFeed.item3Text") },
    { time: t("organizer.activityFeed.item4Time"), text: t("organizer.activityFeed.item4Text") },
  ]

  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <div className="w-full flex flex-col gap-4 lg:gap-6">
        {/* Page Header */}
        <PageHeader
          icon={ShieldCheck}
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          title={welcomeTitle}
          subtitle={t("organizer.description")}
          actions={
            <Link
              href="/dashboard/organizer/announcements"
              className={cn(
                buttonVariants(),
                "gap-2 rounded-xl shadow-xs bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold text-xs sm:text-sm h-9 px-3.5 cursor-pointer"
              )}
            >
              <Megaphone className="size-4" />
              <span>{t("organizer.newAnnouncement")}</span>
            </Link>
          }
        />

        {/* Tab Switcher: Separate Teams from Participants */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-4">
          <div className="inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/50">
            <button
              type="button"
              onClick={() => setActiveTab("participants")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                activeTab === "participants"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserRound className="size-4 text-emerald-500" />
              <span>{t("organizer.tabs.participants")}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                240
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("teams")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
                activeTab === "teams"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-4 text-amber-500" />
              <span>{t("organizer.tabs.teams")}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                48
              </span>
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {activeTab === "participants"
              ? t("organizer.tabs.participantsDesc")
              : t("organizer.tabs.teamsDesc")}
          </p>
        </div>

        {/* Dynamic View: Participants or Teams */}
        {activeTab === "participants" ? (
          <UsersManagementTable />
        ) : (
          <TeamsManagementTable />
        )}

        {/* Real-time Event Progress & Milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Activity Feed */}
          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/40 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <h2 className="font-semibold text-base text-foreground">
                  {t("organizer.activityFeed.title")}
                </h2>
              </div>
              <Badge variant="outline" className="text-xs">
                {t("organizer.activityFeed.liveBadge")}
              </Badge>
            </div>

            <div className="space-y-3">
              {activityItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border/40 text-xs sm:text-sm hover:border-primary/30 transition-colors"
                >
                  <span className="text-foreground font-medium">{item.text}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 ps-3">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Milestones Card */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <Calendar className="size-4 text-amber-500" />
              <h2 className="font-semibold text-base text-foreground">
                {t("organizer.milestones.title")}
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>{t("organizer.milestones.m1Title")}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {t("organizer.milestones.m1Status")}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  {t("organizer.milestones.m1Date")}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                <div className="flex items-center justify-between font-semibold text-amber-600 dark:text-amber-400">
                  <span>{t("organizer.milestones.m2Title")}</span>
                  <Badge className="bg-amber-500 text-amber-950 text-[10px]">
                    {t("organizer.milestones.m2Status")}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  {t("organizer.milestones.m2Date")}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/40 bg-background/40 space-y-1 opacity-70">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>{t("organizer.milestones.m3Title")}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {t("organizer.milestones.m3Status")}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  {t("organizer.milestones.m3Date")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
