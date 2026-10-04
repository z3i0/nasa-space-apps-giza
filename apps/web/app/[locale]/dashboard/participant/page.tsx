"use client"

import { useTranslations } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import {
  Rocket,
  Users,
  Compass,
  UploadCloud,
  CheckCircle2,
  Clock,
  Globe,
  Sparkles,
  ArrowUpRight,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuthUser } from "@/lib/auth"

export default function ParticipantDashboard() {
  const t = useTranslations("Dashboard")
  const user = useAuthUser()
  const displayName = user?.name || user?.fullName
  const welcomeTitle = displayName
    ? t("welcomeTitle", { name: displayName })
    : t("welcomeFallback")

  const stats = [
    {
      title: t("participant.stats.teamMembers"),
      value: "5 / 5",
      subtext: t("participant.stats.teamMembersSub"),
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: t("participant.stats.challenge"),
      value: "Earth Science",
      subtext: t("participant.stats.challengeSub"),
      icon: Globe,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      title: t("participant.stats.mentorSessions"),
      value: "2",
      subtext: t("participant.stats.mentorSessionsSub"),
      icon: Compass,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: t("participant.stats.timeRemaining"),
      value: "28:45:10",
      subtext: t("participant.stats.timeRemainingSub"),
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ]

  const checklistItems = [
    { title: t("participant.checklist.item1"), done: true },
    { title: t("participant.checklist.item2"), done: true },
    { title: t("participant.checklist.item3"), done: false, urgent: true },
    { title: t("participant.checklist.item4"), done: false, urgent: true },
  ]

  return (
    <RoleGuard allowedRoles={["participant"]}>
      <div className="w-full flex flex-col gap-4 lg:gap-6">
        {/* Page Header */}
        <PageHeader
          icon={Rocket}
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          title={welcomeTitle}
          subtitle={t("participant.description")}
          actions={
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Link
                href="/dashboard/participant/submit"
                className={cn(
                  buttonVariants(),
                  "gap-2 rounded-xl shadow-xs bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold text-xs sm:text-sm h-9 px-3.5 cursor-pointer"
                )}
              >
                <UploadCloud className="size-4" />
                <span>{t("participant.submitFinal")}</span>
              </Link>
              <Link
                href="/dashboard/participant/mentorship"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-2 rounded-xl text-xs sm:text-sm h-9 px-3.5 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer shadow-xs"
                )}
              >
                <Compass className="size-4 text-emerald-500" />
                <span>{t("participant.requestMentorship")}</span>
              </Link>
            </div>
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
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
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

        {/* Project Checklist & Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submission Checklist */}
          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/40 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <h2 className="font-semibold text-base text-foreground">
                  {t("participant.checklist.title")}
                </h2>
              </div>
              <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                {t("participant.checklist.progress")}
              </Badge>
            </div>

            <div className="space-y-3">
              {checklistItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-background/60 border border-border/40 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
                        item.done
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {item.done ? "✓" : (i + 1)}
                    </span>
                    <span className={item.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}>
                      {item.title}
                    </span>
                  </div>
                  {item.urgent && !item.done && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">
                      {t("participant.checklist.required")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Resources Card */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border/40">
              <Sparkles className="size-4 text-emerald-500" />
              <h2 className="font-semibold text-base text-foreground">
                {t("participant.resources.title")}
              </h2>
            </div>

            <div className="space-y-2.5 text-xs">
              <a
                href="https://data.nasa.gov"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background/60 hover:border-primary/40 transition-colors group"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t("participant.resources.r1Title")}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {t("participant.resources.r1Desc")}
                  </p>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>

              <a
                href="https://earthdata.nasa.gov"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background/60 hover:border-primary/40 transition-colors group"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t("participant.resources.r2Title")}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {t("participant.resources.r2Desc")}
                  </p>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
