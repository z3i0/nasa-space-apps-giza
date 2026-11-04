"use client"

import { useLocale, useTranslations } from "next-intl"
import useSWR from "swr"
import { Link } from "@/i18n/routing"
import {
  Users,
  Layers,
  GraduationCap,
  Scale,
  RefreshCw,
  BarChart3,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  Trophy,
  AlertCircle,
  Activity,
  Calendar,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/dashboard/page-header"
import { accountApi } from "@/lib/account"
import { RoleApplications } from "./role-applications"
import { cn } from "@/lib/utils"

interface Summary {
  participants: number
  mentors: number
  judges: number
  teams: number
  submitted: number
  pending: number
  assigned: number
  completed: number
  deadline: string | null
}

export function OrganizerOverview() {
  const t = useTranslations("Operations")
  const locale = useLocale()

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<Summary>("/organizer-summary", {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })

  const isRefreshing = isValidating && !isLoading
  const handleManualRefresh = () => {
    void mutate()
  }

  // 1. KPI Pillars
  const kpiPillars = [
    {
      key: "participants",
      label: t("participants"),
      value: data?.participants ?? 0,
      href: "/dashboard/organizer/participants",
      icon: Users,
      iconColor: "text-sky-500 bg-sky-500/10",
      borderHover: "hover:border-sky-500/40 dark:hover:border-sky-500/30",
    },
    {
      key: "teams",
      label: t("teams"),
      value: data?.teams ?? 0,
      href: "/dashboard/organizer/teams",
      icon: Layers,
      iconColor: "text-purple-500 bg-purple-500/10",
      borderHover: "hover:border-purple-500/40 dark:hover:border-purple-500/30",
    },
    {
      key: "mentors",
      label: t("mentors"),
      value: data?.mentors ?? 0,
      href: "/dashboard/organizer/mentors",
      icon: GraduationCap,
      iconColor: "text-emerald-500 bg-emerald-500/10",
      borderHover: "hover:border-emerald-500/40 dark:hover:border-emerald-500/30",
    },
    {
      key: "judges",
      label: t("judges"),
      value: data?.judges ?? 0,
      href: "/dashboard/organizer/judges",
      icon: Scale,
      iconColor: "text-amber-500 bg-amber-500/10",
      borderHover: "hover:border-amber-500/40 dark:hover:border-amber-500/30",
    },
  ]

  // 2. Calculations
  const submissionPct =
    data && data.teams > 0
      ? Math.min(100, Math.round((data.submitted / data.teams) * 100))
      : 0

  const judgingPct =
    data && data.assigned > 0
      ? Math.min(100, Math.round((data.completed / data.assigned) * 100))
      : 0

  const formattedDeadline = data?.deadline
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(data.deadline))
    : null

  // 3. Command Hub Grid
  const commandActions = [
    {
      href: "/dashboard/organizer/analytics",
      label: t("analytics"),
      desc: t("quickNavDescAnalytics"),
      icon: BarChart3,
      color: "text-sky-500 bg-sky-500/10",
      badge: "Live",
      badgeVariant: "default" as const,
    },
    {
      href: "/dashboard/organizer/role-requests",
      label: t("approvals"),
      desc: t("quickNavDescApprovals"),
      icon: ShieldCheck,
      color: "text-rose-500 bg-rose-500/10",
      badge: data && data.pending > 0 ? `${data.pending}` : undefined,
      badgeVariant: "destructive" as const,
    },
    {
      href: "/dashboard/organizer/requests-tracking",
      label: t("requestsTracking"),
      desc: t("quickNavDescRequests"),
      icon: FileText,
      color: "text-indigo-500 bg-indigo-500/10",
    },
    {
      href: "/dashboard/organizer/challenges",
      label: t("challenges"),
      desc: t("quickNavDescChallenges"),
      icon: Trophy,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      href: "/dashboard/organizer/judges",
      label: t("assignments"),
      desc: t("quickNavDescJudges"),
      icon: Scale,
      color: "text-teal-500 bg-teal-500/10",
    },
    {
      href: "/dashboard/organizer/scores",
      label: t("results"),
      desc: t("quickNavDescScores"),
      icon: Activity,
      color: "text-emerald-500 bg-emerald-500/10",
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      {/* 1. Header with Mission Control Telemetry status */}
      <PageHeader
        title={t("overview")}
        subtitle={t("overviewHelp")}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-9 gap-2 rounded-xl text-xs sm:text-sm"
              title={t("refreshData")}
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">{t("refreshData")}</span>
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-destructive shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-destructive">{t("error")}</span>
              <span className="text-xs text-muted-foreground">{t("overviewHelp")}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="w-full sm:w-auto"
          >
            {t("retry")}
          </Button>
        </Card>
      )}

      {/* Loading Skeletons */}
      {!data && !error && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-2 w-full">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="size-10 rounded-xl shrink-0" />
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Active Content when data is present */}
      {data && (
        <>
          {/* 2. Primary 4 Pillar Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiPillars.map((pillar) => {
              const Icon = pillar.icon
              return (
                <Link
                  key={pillar.key}
                  href={pillar.href}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:shadow-md",
                    pillar.borderHover
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-xs font-medium text-muted-foreground">
                        {pillar.label}
                      </span>
                      <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        {pillar.value}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                        <span>{t("viewAll")}</span>
                        <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                        pillar.iconColor
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* 3. Central Telemetry Deck (Submissions, Judging & Deadline) */}
          <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-muted/20">
            <CardHeader className="p-5 sm:p-6 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="size-4" />
                  </div>
                  <CardTitle className="text-base sm:text-lg font-bold">
                    {t("telemetryOverview")}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[11px] font-normal">
                  {t("operationalStatus")}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 pt-0">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Gauge A: Project Submissions */}
                <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-background/50 p-4 sm:p-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {t("submissionsRate")}
                      </span>
                      <span className="font-bold text-primary">{submissionPct}%</span>
                    </div>
                    <Progress
                      value={submissionPct}
                      className="h-2.5"
                      indicatorClassName="bg-gradient-to-r from-primary/80 to-primary"
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t("submittedTeamsCount", {
                        submitted: data.submitted,
                        total: data.teams,
                      })}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                      {t("statusSubmitted")}
                    </Badge>
                  </div>
                </div>

                {/* Gauge B: Judging Review Progress */}
                <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-background/50 p-4 sm:p-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {t("judgingProgress")}
                      </span>
                      <span className="font-bold text-teal-600 dark:text-teal-400">
                        {judgingPct}%
                      </span>
                    </div>
                    <Progress
                      value={judgingPct}
                      className="h-2.5"
                      indicatorClassName="bg-gradient-to-r from-teal-500 to-emerald-500"
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t("reviewsCompletedCount", {
                        completed: data.completed,
                        total: data.assigned,
                      })}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                      {t("completed")}
                    </Badge>
                  </div>
                </div>

                {/* Clock & Mission Deadline */}
                <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-background/50 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {t("submissionWindow")}
                    </span>
                    <Clock className="size-4 text-amber-500" />
                  </div>

                  <div className="my-2 flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {t("deadline")}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                      {formattedDeadline || t("deadlineMissing")}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Calendar className="size-3" />
                    <span>Africa/Cairo</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Command Hub (Quick Navigation Grid) */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {t("commandHub")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("commandHubDesc")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {commandActions.map((action) => {
                const ActionIcon = action.icon
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-start justify-between rounded-2xl border border-border/60 bg-card p-4 sm:p-5 transition-all duration-200 hover:border-border hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl",
                          action.color
                        )}
                      >
                        <ActionIcon className="size-5" />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {action.label}
                          </span>
                          {action.badge && (
                            <Badge
                              variant={action.badgeVariant || "default"}
                              className="text-[10px] px-1.5 py-0 font-normal h-4"
                            >
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {action.desc}
                        </p>
                      </div>
                    </div>

                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ms-2 mt-0.5" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* 5. Role Applications Queue Stream */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {t("roleApplicationsSection")}
                  </h2>
                  {data.pending > 0 && (
                    <Badge variant="destructive" className="text-[11px] px-2 py-0.5 font-normal">
                      {data.pending}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("roleApplicationsSectionDesc")}
                </p>
              </div>

              <Link
                href="/dashboard/organizer/role-requests"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>{t("viewAll")}</span>
                <ArrowUpRight className="size-3" />
              </Link>
            </div>

            <RoleApplications embedded />
          </div>
        </>
      )}
    </div>
  )
}
