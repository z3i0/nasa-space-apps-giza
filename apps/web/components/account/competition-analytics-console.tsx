"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Activity,
  Award,
  Compass,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { accountApi, type CompetitionAnalyticsResponse } from "@/lib/account"
import { cn } from "@/lib/utils"

type AnalyticsTab = "overview" | "challenges" | "community" | "mentors" | "judges"

export function CompetitionAnalyticsConsole() {
  const t = useTranslations("Dashboard.competitionAnalytics")
  const locale = useLocale()
  const isAr = locale === "ar"

  const [data, setData] = useState<CompetitionAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview")
  const fetchLock = useRef(false)

  const fetchAnalytics = useCallback(async (isBackground = false) => {
    if (fetchLock.current) return
    fetchLock.current = true

    if (!isBackground) setLoading(true)
    else setIsRefreshing(true)
    setError(false)

    try {
      const res = await accountApi<CompetitionAnalyticsResponse>(
        "/competition-analytics"
      )
      setData(res)
    } catch {
      if (!isBackground) setError(true)
    } finally {
      fetchLock.current = false
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchAnalytics()
  }, [fetchAnalytics])

  // Live polling every 12 seconds when page is visible
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchAnalytics(true)
      }
    }, 12000)
    return () => clearInterval(timer)
  }, [fetchAnalytics])

  const tabs: { id: AnalyticsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: t("tabs.overview"), icon: Activity },
    { id: "challenges", label: t("tabs.challenges"), icon: Target },
    { id: "community", label: t("tabs.community"), icon: MessageSquare },
    { id: "mentors", label: t("tabs.mentors"), icon: Compass },
    { id: "judges", label: t("tabs.judges"), icon: Award },
  ]

  if (loading && !data) {
    return (
      <div className="mx-auto flex min-h-[420px] w-full max-w-7xl flex-col items-center justify-center gap-4 py-16">
        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
          <Activity className="size-7 animate-pulse text-primary" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <Card className="mx-auto my-8 max-w-lg p-6 text-center">
        <p className="text-sm text-destructive">{t("loading")}</p>
        <Button
          variant="outline"
          onClick={() => void fetchAnalytics()}
          className="mt-4 rounded-xl"
        >
          {t("refresh")}
        </Button>
      </Card>
    )
  }

  const activeUsers = data?.activeUsers
  const challenges = data?.challenges
  const community = data?.community
  const mentors = data?.mentors
  const judges = data?.judges

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      {/* Header */}
      <header className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-background p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                </span>
                {t("liveBadge")}
              </span>
              <span className="text-xs text-muted-foreground">
                NASA Space Apps Giza
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchAnalytics()}
              disabled={isRefreshing}
              className="h-10 gap-2 rounded-xl text-xs font-semibold"
            >
              <RefreshCw
                className={cn("size-3.5", isRefreshing && "animate-spin")}
              />
              <span>{t("refresh")}</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all sm:text-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* TAB 1: Live Active Users */}
      {activeTab === "overview" && activeUsers && (
        <div className="space-y-6">
          {/* Active Users KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="col-span-2 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-xs sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t("activeUsers.onlineNow")}
                </span>
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
                </span>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-foreground">
                {activeUsers.currentCount}
              </div>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {t("activeUsers.title")}
              </span>
            </Card>

            <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("activeUsers.participants")}
                </span>
                <Users className="size-4 text-primary" />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {activeUsers.breakdownByRole.participants}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${
                      activeUsers.currentCount > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (activeUsers.breakdownByRole.participants /
                                activeUsers.currentCount) *
                                100
                            )
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </Card>

            <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("activeUsers.mentors")}
                </span>
                <Compass className="size-4 text-sky-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {activeUsers.breakdownByRole.mentors}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-sky-500"
                  style={{
                    width: `${
                      activeUsers.currentCount > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (activeUsers.breakdownByRole.mentors /
                                activeUsers.currentCount) *
                                100
                            )
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </Card>

            <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("activeUsers.judges")}
                </span>
                <Award className="size-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {activeUsers.breakdownByRole.judges}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${
                      activeUsers.currentCount > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (activeUsers.breakdownByRole.judges /
                                activeUsers.currentCount) *
                                100
                            )
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </Card>

            <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("activeUsers.organizers")}
                </span>
                <Sparkles className="size-4 text-purple-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {activeUsers.breakdownByRole.organizers}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${
                      activeUsers.currentCount > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (activeUsers.breakdownByRole.organizers /
                                activeUsers.currentCount) *
                                100
                            )
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Activity Timeline Bar Chart */}
          <Card className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold sm:text-lg">
                  {t("activeUsers.hourlyActivity")}
                </CardTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary" />
                    {t("activeUsers.participants")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-sky-500" />
                    {t("activeUsers.mentors")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-500" />
                    {t("activeUsers.judges")}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="flex h-52 items-end gap-2 pt-6 sm:gap-4">
                {activeUsers.hourlyTrend.map((slot, idx) => {
                  const maxVal = Math.max(
                    1,
                    ...activeUsers.hourlyTrend.map((s) => s.total)
                  )
                  const heightPercent = Math.max(12, Math.round((slot.total / maxVal) * 100))
                  return (
                    <div
                      key={idx}
                      className="group relative flex flex-1 flex-col items-center"
                    >
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute -top-10 z-10 hidden rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background opacity-0 shadow-md transition-opacity group-hover:block group-hover:opacity-100">
                        {slot.total} online ({slot.hour})
                      </div>

                      {/* Stacked bar */}
                      <div
                        className="flex w-full max-w-[28px] flex-col justify-end overflow-hidden rounded-t-md bg-muted/60 transition-all hover:brightness-110"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div
                          className="w-full bg-amber-500/80 transition-all"
                          style={{
                            height: `${
                              slot.total > 0
                                ? (slot.judges / slot.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                        <div
                          className="w-full bg-sky-500/80 transition-all"
                          style={{
                            height: `${
                              slot.total > 0
                                ? (slot.mentors / slot.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                        <div
                          className="w-full bg-primary transition-all"
                          style={{
                            height: `${
                              slot.total > 0
                                ? (slot.participants / slot.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="mt-2 text-[10px] text-muted-foreground truncate">
                        {slot.hour}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Challenges Distribution */}
      {activeTab === "challenges" && challenges && (
        <div className="space-y-6">
          {/* Challenge Summary KPIs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">
                {t("challenges.totalTeams")}
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {challenges.totalTeams}
              </div>
            </Card>
            <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t("challenges.assigned")}
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {challenges.assignedTeams}
              </div>
            </Card>
            <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {t("challenges.unassigned")}
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {challenges.unassignedTeams}
              </div>
            </Card>
          </div>

          {/* List of Challenges with Visual Progress */}
          <Card className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base font-bold sm:text-lg">
                {t("challenges.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0 pt-2">
              {challenges.distribution.map((ch) => (
                <div
                  key={ch.id}
                  className="rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {isAr ? ch.titleAr : ch.title}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {ch.category}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {isAr ? ch.title : ch.titleAr}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className="border-primary/20 bg-primary/10 text-primary">
                        {t("challenges.teamsCount", { count: ch.teamsCount })}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {t("challenges.participantsCount", {
                          count: ch.participantsCount,
                        })}
                      </Badge>
                      <span className="min-w-[40px] text-end text-sm font-bold text-foreground">
                        {ch.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-sky-500"
                      style={{ width: `${Math.max(ch.percentage, ch.teamsCount > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Community Analytics */}
      {activeTab === "community" && community && (
        <div className="space-y-6">
          {/* Community KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">
                {t("community.totalQuestions")}
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {community.totalQuestions}
              </div>
            </Card>

            <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t("community.answeredQuestions")}
              </span>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {community.answeredCount}
              </div>
            </Card>

            <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {t("community.unansweredQuestions")}
              </span>
              <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {community.unansweredCount}
              </div>
            </Card>

            <Card className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-primary">
                {t("community.responseRate")}
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {community.answerRate}%
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Categories Breakdown */}
            <Card className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold">
                  {t("community.categories")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-0 pt-2">
                {community.categoryBreakdown.map((cat) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground uppercase">
                        {cat.category}
                      </span>
                      <span className="text-muted-foreground">
                        {cat.answered} / {cat.total} answered
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${
                            cat.total > 0
                              ? Math.round((cat.answered / cat.total) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Active Contributors */}
            <Card className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold">
                  {t("community.topContributors")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-0 pt-2">
                {community.topContributors.map((user, idx) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {user.questionsCount} questions · {user.answersCount}{" "}
                          answers
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {t("community.score", { score: user.score })}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: Mentors Analytics */}
      {activeTab === "mentors" && mentors && (
        <div className="space-y-6">
          {/* Mentors KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">
                {t("mentors.totalRequests")}
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {mentors.totalRequests}
              </div>
            </Card>

            <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t("mentors.acceptanceRate")}
              </span>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {mentors.acceptanceRate}%
              </div>
            </Card>

            <Card className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {t("mentors.rejectionRate")}
              </span>
              <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                {mentors.rejectionRate}%
              </div>
            </Card>

            <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {t("mentors.satisfaction")}
                </span>
                <Star className="size-4 fill-amber-500 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {mentors.avgSatisfaction} / 5.0
              </div>
            </Card>
          </div>

          {/* Top Mentors Table/Cards */}
          <Card className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base font-bold sm:text-lg">
                {t("mentors.topMentors")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-0 pt-2 sm:grid-cols-2 lg:grid-cols-3">
              {mentors.topMentors.map((m) => (
                <div
                  key={m.id}
                  className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{m.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {t("mentors.sessions", { count: m.sessionsCount })}
                      </p>
                    </div>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Star className="size-3 fill-amber-500 text-amber-500" />
                      <span>{m.rating}</span>
                    </Badge>
                  </div>

                  {m.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.expertise.slice(0, 3).map((e, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2">
                    <span>{t("mentors.acceptanceRate")}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {m.acceptanceRate}%
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: Judges Performance */}
      {activeTab === "judges" && judges && (
        <div className="space-y-6">
          {/* Judges KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">
                {t("judges.totalAssignments")}
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {judges.totalAssignments}
              </div>
            </Card>

            <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t("judges.completed")}
              </span>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {judges.completedCount}
              </div>
            </Card>

            <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {t("judges.pending")}
              </span>
              <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {judges.pendingCount}
              </div>
            </Card>

            <Card className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-xs">
              <span className="text-xs font-medium text-primary">
                {t("judges.overallAvgScore")}
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {judges.averageScoreOverall !== null
                  ? `${judges.averageScoreOverall} / 100`
                  : "—"}
              </div>
            </Card>
          </div>

          {/* Judges Detailed Scorecard Table */}
          <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <CardHeader className="border-b border-border/60 p-5">
              <CardTitle className="text-base font-bold sm:text-lg">
                {t("judges.judgeScorecard")}
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs sm:text-sm">
                <thead className="border-b border-border/80 bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5 text-start">{t("judges.judgeName")}</th>
                    <th className="px-4 py-3.5 text-start">{t("judges.assigned")}</th>
                    <th className="px-4 py-3.5 text-start">{t("judges.completed")}</th>
                    <th className="px-4 py-3.5 text-start">{t("judges.pending")}</th>
                    <th className="px-4 py-3.5 text-start">{t("judges.status")}</th>
                    <th className="px-5 py-3.5 text-end">{t("judges.avgScore")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {judges.judgePerformance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No judging assignments recorded yet
                      </td>
                    </tr>
                  ) : (
                    judges.judgePerformance.map((j) => (
                      <tr
                        key={j.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          {j.name}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {j.assignedCount}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-emerald-600 dark:text-emerald-400">
                          {j.completedCount}
                        </td>
                        <td className="px-4 py-3.5 text-amber-600 dark:text-amber-400">
                          {j.pendingCount}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${j.completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {j.completionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-end font-bold text-foreground">
                          {j.averageScore !== null ? `${j.averageScore}` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
