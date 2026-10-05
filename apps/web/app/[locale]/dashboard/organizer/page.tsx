"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import {
  Megaphone,
  Activity,
  Calendar,
  Users,
  UserRound,
  Compass,
  FolderGit2,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Radio,
  Check,
  ChevronRight,
  Flame,
  Layers,
  MapPin,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuthUser } from "@/lib/auth"

export default function OrganizerDashboard() {
  const t = useTranslations("Dashboard")
  const user = useAuthUser()
  const displayName = user?.name || user?.fullName
  const welcomeTitle = displayName
    ? t("welcomeTitle", { name: displayName })
    : t("welcomeFallback")

  // Countdown Timer State (Simulated live deadline ticker: 4h 32m 15s)
  const [timeLeft, setTimeLeft] = React.useState({
    hours: 4,
    minutes: 32,
    seconds: 15,
  })

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        }
        if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        }
        if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Action Center active tab
  const [actionTab, setActionTab] = React.useState<"mentors" | "matching" | "support">("mentors")

  // State to simulate dispatching mentors
  const [dispatchedRequests, setDispatchedRequests] = React.useState<Record<number, boolean>>({})

  const handleDispatch = (idx: number) => {
    setDispatchedRequests((prev) => ({ ...prev, [idx]: true }))
  }

  // Activity Feed Items from translations
  const activityItems = [
    {
      time: t("organizer.activityFeed.item1Time"),
      text: t("organizer.activityFeed.item1Text"),
      icon: FolderGit2,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      time: t("organizer.activityFeed.item2Time"),
      text: t("organizer.activityFeed.item2Text"),
      icon: Compass,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      time: t("organizer.activityFeed.item3Time"),
      text: t("organizer.activityFeed.item3Text"),
      icon: Award,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      time: t("organizer.activityFeed.item4Time"),
      text: t("organizer.activityFeed.item4Text"),
      icon: Megaphone,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
  ]

  // Challenge tracks data
  const tracks = [
    {
      name: t("organizer.overview.distribution.tracks.0.name"),
      count: 14,
      percentage: 29,
      color: "bg-blue-500",
    },
    {
      name: t("organizer.overview.distribution.tracks.1.name"),
      count: 11,
      percentage: 23,
      color: "bg-amber-500",
    },
    {
      name: t("organizer.overview.distribution.tracks.2.name"),
      count: 9,
      percentage: 19,
      color: "bg-emerald-500",
    },
    {
      name: t("organizer.overview.distribution.tracks.3.name"),
      count: 8,
      percentage: 17,
      color: "bg-violet-500",
    },
    {
      name: t("organizer.overview.distribution.tracks.4.name"),
      count: 6,
      percentage: 12,
      color: "bg-rose-500",
    },
  ]

  // Deliverables readiness data
  const deliverables = [
    {
      label: t("organizer.overview.readiness.deliverables.0.label"),
      completed: 44,
      total: 48,
      percentage: 92,
      color: "bg-emerald-500",
    },
    {
      label: t("organizer.overview.readiness.deliverables.1.label"),
      completed: 38,
      total: 48,
      percentage: 79,
      color: "bg-blue-500",
    },
    {
      label: t("organizer.overview.readiness.deliverables.2.label"),
      completed: 26,
      total: 48,
      percentage: 54,
      color: "bg-amber-500",
    },
    {
      label: t("organizer.overview.readiness.deliverables.3.label"),
      completed: 19,
      total: 48,
      percentage: 39,
      color: "bg-purple-500",
    },
  ]

  // Mentor urgent requests list
  const mentorRequests = [
    {
      team: t("organizer.overview.urgentActions.requestsList.0.team"),
      track: t("organizer.overview.urgentActions.requestsList.0.track"),
      type: "offline" as const,
      room: "Room 104",
      waiting: "22m",
      topic: t("organizer.overview.urgentActions.requestsList.0.topic"),
    },
    {
      team: t("organizer.overview.urgentActions.requestsList.1.team"),
      track: t("organizer.overview.urgentActions.requestsList.1.track"),
      type: "online" as const,
      room: "Discord #mentor-3",
      waiting: "14m",
      topic: t("organizer.overview.urgentActions.requestsList.1.topic"),
    },
    {
      team: t("organizer.overview.urgentActions.requestsList.2.team"),
      track: t("organizer.overview.urgentActions.requestsList.2.track"),
      type: "offline" as const,
      room: "Lab 2",
      waiting: "8m",
      topic: t("organizer.overview.urgentActions.requestsList.2.topic"),
    },
  ]

  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <div className="w-full flex flex-col gap-6">
        {/* Page Header with Action Shortcuts */}
        <PageHeader
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          title={welcomeTitle}
          subtitle={t("organizer.description")}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
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
            </div>
          }
        />

        {/* 1. Mission Control Banner: Timeline & Real-Time Countdown */}

        {/* 2. Top KPI Metric Cards (5 Core Pillars) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Participants */}
          <Link href="/dashboard/organizer/participants" className="group">
            <Card className="p-0 cursor-pointer">
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("organizer.overview.metrics.participants.title")}
                  </span>
                  <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <UserRound className="size-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground tracking-tight">
                    {t("organizer.overview.metrics.participants.value")}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {t("organizer.overview.metrics.participants.sub")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Teams */}
          <Link href="/dashboard/organizer/teams" className="group">
            <Card className="p-0 cursor-pointer">
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("organizer.overview.metrics.teams.title")}
                  </span>
                  <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Users className="size-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground tracking-tight">
                    {t("organizer.overview.metrics.teams.value")}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                    {t("organizer.overview.metrics.teams.sub")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Mentorship Requests */}
          <Link href="/dashboard/organizer/requests-tracking" className="group">
            <Card className="p-0 cursor-pointer">
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("organizer.overview.metrics.mentorship.title")}
                  </span>
                  <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Compass className="size-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-foreground tracking-tight">
                      {t("organizer.overview.metrics.mentorship.value")}
                    </span>
                    <Badge variant="destructive" className="text-[10px] h-4 px-1.5 font-bold">
                      {t("organizer.overview.urgentActions.badge")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                    {t("organizer.overview.metrics.mentorship.sub")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Submissions */}
          <Link href="/dashboard/organizer/submissions" className="group">
            <Card className="p-0 cursor-pointer">
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("organizer.overview.metrics.submissions.title")}
                  </span>
                  <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <FolderGit2 className="size-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground tracking-tight">
                    {t("organizer.overview.metrics.submissions.value")}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={64.5} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                      64%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Judging */}
          <Link href="/dashboard/organizer/scores" className="group">
            <Card className="p-0 cursor-pointer">
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("organizer.overview.metrics.judging.title")}
                  </span>
                  <div className="size-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Award className="size-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground tracking-tight">
                    {t("organizer.overview.metrics.judging.value")}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={37.5} className="h-1.5 flex-1" indicatorClassName="bg-rose-500" />
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      38%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 3. Action Center: Needs Immediate Attention */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {t("organizer.overview.urgentActions.title")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("organizer.overview.urgentActions.subtitle")}
                </CardDescription>
              </div>
            </div>

            <CardAction>
              <div className="inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/50 text-xs">
                <button
                  type="button"
                  onClick={() => setActionTab("mentors")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                    actionTab === "mentors"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("organizer.overview.urgentActions.tabMentors", { count: 3 })}
                </button>
                <button
                  type="button"
                  onClick={() => setActionTab("matching")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                    actionTab === "matching"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("organizer.overview.urgentActions.tabMatching", { count: 14 })}
                </button>
                <button
                  type="button"
                  onClick={() => setActionTab("support")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                    actionTab === "support"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("organizer.overview.urgentActions.tabSupport", { count: 4 })}
                </button>
              </div>
            </CardAction>
          </CardHeader>

          <CardContent className="pt-4">
            {actionTab === "mentors" && (
              <div className="space-y-3">
                {mentorRequests.map((req, idx) => {
                  const isDispatched = dispatchedRequests[idx]
                  return (
                    <Card
                      key={idx}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/50 transition-colors gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{req.team}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {req.track}
                          </Badge>
                          {req.type === "offline" ? (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px]">
                              <MapPin className="size-2.5 me-1" />
                              {t("organizer.overview.urgentActions.offlineTag", { room: req.room })}
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px]">
                              {t("organizer.overview.urgentActions.onlineTag")}
                            </Badge>
                          )}
                          <span className="text-[11px] font-semibold text-rose-500">
                            {t("organizer.overview.urgentActions.waiting", { time: req.waiting })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{req.topic}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant={isDispatched ? "outline" : "default"}
                          disabled={isDispatched}
                          onClick={() => handleDispatch(idx)}
                          className={cn(
                            "rounded-xl text-xs h-8 cursor-pointer font-semibold",
                            isDispatched
                              ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          {isDispatched ? (
                            <>
                              <Check className="size-3.5 me-1" />
                              {t("organizer.overview.urgentActions.dispatched")}
                            </>
                          ) : (
                            <>
                              <Compass className="size-3.5 me-1" />
                              {t("organizer.overview.urgentActions.dispatchBtn")}
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {actionTab === "matching" && (
              <Card className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-1 text-center sm:text-start">
                  <p className="text-sm font-semibold text-foreground">
                    {t("organizer.overview.urgentActions.unmatchedNotice")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("organizer.overview.metrics.participants.sub")}
                  </p>
                </div>
                <Link
                  href="/dashboard/organizer/participants"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                  )}
                >
                  <UserRound className="size-3.5 me-1.5" />
                  {t("organizer.overview.urgentActions.launchMatchingBtn")}
                </Link>
              </Card>
            )}

            {actionTab === "support" && (
              <Card className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl gap-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-1 text-center sm:text-start">
                  <p className="text-sm font-semibold text-foreground">
                    {t("organizer.overview.urgentActions.supportNotice")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Questions on satellite data API keys & judging score criteria
                  </p>
                </div>
                <Link
                  href="/dashboard/organizer/community"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                  )}
                >
                  <HelpCircle className="size-3.5 me-1.5" />
                  {t("organizer.overview.urgentActions.openCommunityBtn")}
                </Link>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* 4. Analytics & Progress Grid: Challenge Distribution & Submission Readiness */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Challenge Track Distribution */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <CardTitle className="text-base">
                  {t("organizer.overview.distribution.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {t("organizer.overview.distribution.subtitle")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {tracks.map((track, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{track.name}</span>
                    <span className="font-medium text-muted-foreground">
                      {t("organizer.overview.distribution.teamsCount", { count: track.count })} (
                      {track.percentage}%)
                    </span>
                  </div>
                  <Progress
                    value={track.percentage}
                    className="h-2"
                    indicatorClassName={track.color}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submission Readiness Checklist Tracker */}
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <CardTitle className="text-base">
                  {t("organizer.overview.readiness.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {t("organizer.overview.readiness.subtitle")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {deliverables.map((item, i) => (
                <div key={i} className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{item.label}</span>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {item.completed} / {item.total} ({item.percentage}%)
                    </Badge>
                  </div>
                  <Progress
                    value={item.percentage}
                    className="h-2"
                    indicatorClassName={item.color}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 5. Agenda & Live Activity Feed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workshops & Live Agenda */}
          <Card className="lg:col-span-1">
            <CardHeader className="border-b border-border/60 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-amber-500" />
                <CardTitle className="text-base">
                  {t("organizer.overview.agenda.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {t("organizer.overview.agenda.subtitle")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500 text-emerald-950 font-bold text-[10px]">
                    {t("organizer.overview.agenda.statusLabels.inProgress")}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-medium">14:00 - 15:30</span>
                </div>
                <h4 className="font-semibold text-xs text-foreground">
                  {t("organizer.overview.agenda.sessions.0.title")}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>{t("organizer.overview.agenda.sessions.0.speaker")}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {t("organizer.overview.agenda.sessions.0.location")}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-muted/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    {t("organizer.overview.agenda.statusLabels.upcoming")}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-medium">16:00 - 17:00</span>
                </div>
                <h4 className="font-semibold text-xs text-foreground">
                  {t("organizer.overview.agenda.sessions.1.title")}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>{t("organizer.overview.agenda.sessions.1.speaker")}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {t("organizer.overview.agenda.sessions.1.location")}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-muted/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    {t("organizer.overview.agenda.statusLabels.upcoming")}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-medium">18:00 - 20:00</span>
                </div>
                <h4 className="font-semibold text-xs text-foreground">
                  {t("organizer.overview.agenda.sessions.2.title")}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>{t("organizer.overview.agenda.sessions.2.speaker")}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {t("organizer.overview.agenda.sessions.2.location")}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Link
                href="/dashboard/organizer/timeline"
                className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>{t("organizer.overview.agenda.viewFull")}</span>
                <ChevronRight className="size-3.5 rtl:rotate-180" />
              </Link>
            </CardFooter>
          </Card>

          {/* Real-time Activity Feed */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border/60 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <CardTitle className="text-base">{t("organizer.activityFeed.title")}</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {t("organizer.activityFeed.liveBadge")}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              {activityItems.map((item, i) => {
                const ItemIcon = item.icon
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/70 text-xs sm:text-sm hover:border-primary/40 hover:bg-muted/60 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "size-8 rounded-lg flex items-center justify-center border shrink-0",
                          item.color
                        )}
                      >
                        <ItemIcon className="size-4" />
                      </div>
                      <span className="text-foreground font-medium">{item.text}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 ps-3">
                      {item.time}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* 6. Operations Quick Access Shortcuts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {t("organizer.overview.quickLinks.title")}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link href="/dashboard/organizer/participants">
              <Card className="h-full hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer">
                <CardContent className="p-3.5 text-center flex flex-col items-center gap-2">
                  <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <UserRound className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {t("organizer.overview.quickLinks.participants")}
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/organizer/teams">
              <Card className="h-full hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer">
                <CardContent className="p-3.5 text-center flex flex-col items-center gap-2">
                  <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Users className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {t("organizer.overview.quickLinks.teams")}
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/organizer/requests-tracking">
              <Card className="h-full hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer">
                <CardContent className="p-3.5 text-center flex flex-col items-center gap-2">
                  <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Activity className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {t("organizer.overview.quickLinks.requests")}
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/organizer/analytics">
              <Card className="h-full hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer">
                <CardContent className="p-3.5 text-center flex flex-col items-center gap-2">
                  <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Flame className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {t("organizer.overview.quickLinks.analytics")}
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/organizer/scores">
              <Card className="h-full hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer">
                <CardContent className="p-3.5 text-center flex flex-col items-center gap-2">
                  <div className="size-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Award className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {t("organizer.overview.quickLinks.judges")}
                  </span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/organizer/mentors">
              <Card className="h-full hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer">
                <CardContent className="p-3.5 text-center flex flex-col items-center gap-2">
                  <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Compass className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {t("organizer.overview.quickLinks.mentors")}
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
