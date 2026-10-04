"use client"

import { useTranslations } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import {
  Award,
  FileCheck,
  Scale,
  CheckCheck,
  Trophy,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuthUser } from "@/lib/auth"

export default function JudgeDashboard() {
  const t = useTranslations("Dashboard")
  const user = useAuthUser()
  const displayName = user?.name || user?.fullName
  const welcomeTitle = displayName
    ? t("welcomeTitle", { name: displayName })
    : t("welcomeFallback")

  const stats = [
    {
      title: t("judge.stats.assigned"),
      value: "12",
      subtext: t("judge.stats.assignedSub"),
      icon: FileCheck,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: t("judge.stats.evaluated"),
      value: "6",
      subtext: t("judge.stats.evaluatedSub"),
      icon: CheckCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: t("judge.stats.remaining"),
      value: "6",
      subtext: t("judge.stats.remainingSub"),
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: t("judge.stats.progress"),
      value: "50%",
      subtext: t("judge.stats.progressSub"),
      icon: Scale,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
  ]

  const projectQueue = [
    {
      name: t("judge.queue.p1Name"),
      track: t("judge.queue.p1Track"),
      status: "pending",
    },
    {
      name: t("judge.queue.p2Name"),
      track: t("judge.queue.p2Track"),
      status: "pending",
    },
    {
      name: t("judge.queue.p3Name"),
      track: t("judge.queue.p3Track"),
      status: "completed",
      score: "94/100",
    },
    {
      name: t("judge.queue.p4Name"),
      track: t("judge.queue.p4Track"),
      status: "completed",
      score: "88/100",
    },
  ]

  const criteriaList = [
    { criterion: t("judge.criteria.c1"), weight: "25%" },
    { criterion: t("judge.criteria.c2"), weight: "25%" },
    { criterion: t("judge.criteria.c3"), weight: "20%" },
    { criterion: t("judge.criteria.c4"), weight: "20%" },
    { criterion: t("judge.criteria.c5"), weight: "10%" },
  ]

  return (
    <RoleGuard allowedRoles={["judge"]}>
      <div className="w-full flex flex-col gap-4 lg:gap-6">
        {/* Page Header */}
        <PageHeader
          icon={Award}
          iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          title={welcomeTitle}
          subtitle={t("judge.description")}
          actions={
            <Link
              href="/dashboard/judge/projects"
              className={cn(
                buttonVariants(),
                "gap-2 rounded-xl shadow-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm h-9 px-3.5 cursor-pointer"
              )}
            >
              <FileCheck className="size-4" />
              <span>{t("judge.startEvaluation", { count: 6 })}</span>
            </Link>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card/60 p-5 shadow-xs backdrop-blur-xs flex items-center justify-between hover:border-border transition-all"
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
            </div>
          ))}
        </div>

        {/* Evaluation Queue & Criteria */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/40 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Scale className="size-4 text-purple-500" />
                <h2 className="font-semibold text-base text-foreground">
                  {t("judge.queue.title")}
                </h2>
              </div>
              <Badge variant="outline" className="text-xs text-purple-600 dark:text-purple-400 border-purple-500/30">
                {t("judge.queue.badge")}
              </Badge>
            </div>

            <div className="space-y-3">
              {projectQueue.map((proj, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-background/60 border border-border/40 gap-3"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-sm text-foreground">{proj.name}</span>
                    <p className="text-xs text-muted-foreground">{proj.track}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {proj.status === "completed" ? (
                      <Badge variant="secondary" className="gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                        <CheckCircle2 className="size-3" />
                        <span>{t("judge.queue.scored", { score: proj.score || "" })}</span>
                      </Badge>
                    ) : (
                      <Button size="sm" className="h-8 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium">
                        {t("judge.queue.evaluateNow")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NASA Judging Criteria Card */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <Trophy className="size-4 text-purple-500" />
              <h2 className="font-semibold text-base text-foreground">
                {t("judge.criteria.title")}
              </h2>
            </div>

            <div className="space-y-2.5 text-xs">
              {criteriaList.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-background/40"
                >
                  <span className="text-foreground font-medium">{c.criterion}</span>
                  <Badge variant="outline" className="text-[10px]">{c.weight}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
