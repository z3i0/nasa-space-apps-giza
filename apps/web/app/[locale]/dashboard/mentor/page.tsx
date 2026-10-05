"use client"

import { useTranslations } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import {
  Compass,
  Users,
  MessageSquareCode,
  CalendarClock,
  Star,
  Clock,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuthUser } from "@/lib/auth"

export default function MentorDashboard() {
  const t = useTranslations("Dashboard")
  const user = useAuthUser()
  const displayName = user?.name || user?.fullName
  const welcomeTitle = displayName
    ? t("welcomeTitle", { name: displayName })
    : t("welcomeFallback")

  const stats = [
    {
      title: t("mentor.stats.assignedTeams"),
      value: "6",
      subtext: t("mentor.stats.assignedTeamsSub"),
      icon: Users,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      title: t("mentor.stats.requests"),
      value: "3",
      subtext: t("mentor.stats.requestsSub"),
      icon: MessageSquareCode,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: t("mentor.stats.completedSessions"),
      value: "8",
      subtext: t("mentor.stats.completedSessionsSub"),
      icon: CalendarClock,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: t("mentor.stats.rating"),
      value: "4.9 ★",
      subtext: t("mentor.stats.ratingSub"),
      icon: Star,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ]

  const queueItems = [
    {
      team: t("mentor.queue.req1Team"),
      topic: t("mentor.queue.req1Topic"),
      time: t("mentor.queue.req1Time"),
    },
    {
      team: t("mentor.queue.req2Team"),
      topic: t("mentor.queue.req2Topic"),
      time: t("mentor.queue.req2Time"),
    },
    {
      team: t("mentor.queue.req3Team"),
      topic: t("mentor.queue.req3Topic"),
      time: t("mentor.queue.req3Time"),
    },
  ]

  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <div className="w-full flex flex-col gap-4 lg:gap-6">
        {/* Page Header */}
        <PageHeader
          icon={Compass}
          iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          title={welcomeTitle}
          subtitle={t("mentor.description")}
          actions={
            <Link
              href="/dashboard/mentor/requests"
              className={cn(
                buttonVariants(),
                "gap-2 rounded-xl shadow-xs bg-sky-500 hover:bg-sky-600 text-sky-950 font-semibold text-xs sm:text-sm h-9 px-3.5 cursor-pointer"
              )}
            >
              <MessageSquareCode className="size-4" />
              <span>{t("mentor.viewRequests", { count: 3 })}</span>
            </Link>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card
              key={i}
              size="sm"
              className="p-5 flex-row items-center justify-between hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {stat.subtext}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="size-5" />
              </div>
            </Card>
          ))}
        </div>

        {/* Mentorship Requests Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-sky-500" />
                <CardTitle className="text-base">{t("mentor.queue.title")}</CardTitle>
              </div>
              <CardAction>
                <Badge variant="outline" className="text-xs text-sky-600 dark:text-sky-400 border-sky-500/30">
                  {t("mentor.queue.badge")}
                </Badge>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              {queueItems.map((req, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/40 border border-border/70 gap-3 hover:bg-muted/70 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-sm text-foreground">{req.team}</span>
                    <p className="text-xs text-muted-foreground">{req.topic}</p>
                    <span className="text-[10px] text-muted-foreground">{req.time}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" className="h-8 text-xs rounded-lg bg-sky-500 hover:bg-sky-600 text-sky-950 font-medium">
                      {t("mentor.queue.accept")}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Schedule Card */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 text-sky-500" />
                <CardTitle className="text-base">{t("mentor.upcoming.title")}</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-xs pt-4">
              <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-1">
                <p className="font-semibold text-foreground">
                  {t("mentor.upcoming.session1Team")}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {t("mentor.upcoming.session1Time")}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-muted/30 space-y-1">
                <p className="font-semibold text-foreground">
                  {t("mentor.upcoming.session2Team")}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {t("mentor.upcoming.session2Time")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  )
}
