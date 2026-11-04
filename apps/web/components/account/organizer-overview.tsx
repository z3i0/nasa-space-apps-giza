"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Compass,
  Inbox,
  Users,
  UserRound,
} from "lucide-react"
import { Link } from "@/i18n/routing"
import { Button, buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { accountApi, type RoleApplication } from "@/lib/account"

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

const panel = "min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5"
const textLink =
  "inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"

export function OrganizerOverview() {
  const t = useTranslations("Operations")
  const a = useTranslations("Operations.admin")
  const account = useTranslations("Account")
  const locale = useLocale()
  const [data, setData] = useState<Summary | null>(null)
  const [applications, setApplications] = useState<RoleApplication[] | null>(
    null
  )
  const [error, setError] = useState(false)
  const [applicationError, setApplicationError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = false
    async function load() {
      if (active || controller.signal.aborted) return
      active = true
      const [summary, approvals] = await Promise.allSettled([
        accountApi<Summary>("/organizer-summary", undefined, controller.signal),
        accountApi<RoleApplication[]>(
          "/role-applications",
          undefined,
          controller.signal
        ),
      ])
      if (!controller.signal.aborted) {
        if (summary.status === "fulfilled") setData(summary.value)
        if (approvals.status === "fulfilled") setApplications(approvals.value)
        setError(summary.status === "rejected")
        setApplicationError(approvals.status === "rejected")
      }
      active = false
    }
    void load()
    const timer = setInterval(() => {
      if (!document.hidden) void load()
    }, 15000)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [attempt])

  const pending = (applications ?? [])
    .filter((item) => item.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const metrics = [
    {
      key: "participants",
      Icon: UserRound,
      tone: "bg-primary/10 text-primary",
    },
    { key: "teams", Icon: Users, tone: "bg-chart-4/10 text-chart-4" },
    { key: "mentors", Icon: Compass, tone: "bg-success/10 text-success" },
    { key: "judges", Icon: Award, tone: "bg-orange/10 text-orange" },
  ] as const

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 sm:gap-5">
      <PageHeader
        title={t("overview")}
        subtitle={a("overviewHint")}
        actions={
          <Link
            href="/dashboard/organizer/analytics"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <BarChart3 aria-hidden="true" />
            {a("analytics")}
          </Link>
        }
      />
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          {t("error")}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("retry")}
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ key, Icon, tone }) => (
          <Link
            key={key}
            href={`/dashboard/organizer/${key}`}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary sm:p-4"
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground sm:text-sm">
                {t(key)}
              </p>
              <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">
                {data ? data[key].toLocaleString(locale) : "—"}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <section aria-labelledby="admin-attention" className={panel}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2
              id="admin-attention"
              className="flex items-center gap-2 font-semibold"
            >
              <Inbox className="size-4 text-orange" aria-hidden="true" />
              {a("attention")}
            </h2>
            <span className="rounded-md bg-orange/10 px-2 py-1 text-xs font-semibold text-orange">
              {applications ? pending.length : (data?.pending ?? "—")}
            </span>
          </div>
          {applicationError ? (
            <p role="alert" className="text-sm text-muted-foreground">
              {a("approvalsError")}{" "}
              <button
                className={textLink}
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t("retry")}
              </button>
            </p>
          ) : !applications ? (
            <p role="status" className="py-3 text-sm text-muted-foreground">
              {t("loading")}
            </p>
          ) : pending.length ? (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                {a("approvalHint")}
              </p>
              <ul className="divide-y divide-border">
                {pending.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/dashboard/organizer/role-requests?role=${item.role === "judge" ? "judge" : "mentor"}`}
                      className="flex items-center justify-between gap-3 rounded-lg py-3 hover:bg-secondary/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.user?.name || a("unnamed")}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {account(item.role === "judge" ? "judge" : "mentor")}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-primary">
                        {a("review")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex items-start gap-3 py-5">
              <CheckCircle2
                className="size-5 shrink-0 text-success"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium">{a("allReviewed")}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {a("allReviewedHint")}
                </p>
              </div>
            </div>
          )}
          <Link
            href="/dashboard/organizer/role-requests"
            className={`mt-4 border-t border-border pt-3 ${textLink}`}
          >
            {a("allApprovals")}
            <ArrowRight
              className="size-3.5 rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>
        </section>
        <section aria-labelledby="admin-progress" className={panel}>
          <h2 id="admin-progress" className="mb-4 font-semibold">
            {t("eventProgress")}
          </h2>
          <div className="space-y-5">
            {[
              {
                key: "submitted",
                count: data?.submitted,
                total: data?.teams,
                hint: "submissionProgress",
                tone: "bg-success",
              },
              {
                key: "completed",
                count: data?.completed,
                total: data?.assigned,
                hint: "evaluationProgress",
                tone: "bg-primary",
              },
            ].map(({ key, count, total, hint, tone }) => (
              <div key={key}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>{t(key)}</span>
                  <strong className="shrink-0 font-semibold tabular-nums">
                    <bdi>
                      {count ?? "—"} / {total ?? "—"}
                    </bdi>
                  </strong>
                </div>
                <div
                  role={data ? "progressbar" : undefined}
                  aria-label={t(key)}
                  aria-valuenow={
                    data
                      ? Math.min(
                          100,
                          total ? Math.round((count! / total) * 100) : 0
                        )
                      : undefined
                  }
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
                >
                  <div
                    className={`h-full rounded-full ${tone}`}
                    style={{
                      width: `${total ? Math.min(100, (count! / total) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {a(hint)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">{t("deadline")}</p>
            <p className="mt-1 text-sm">
              {data?.deadline
                ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Cairo",
                  }).format(new Date(data.deadline))
                : t(data ? "deadlineMissing" : "loading")}
            </p>
          </div>
        </section>
      </div>
      <nav
        aria-label={t("actions")}
        className="flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-4"
      >
        <Link
          href="/dashboard/organizer/requests-tracking"
          className={textLink}
        >
          {a("trackRequests")}
        </Link>
        <Link href="/dashboard/organizer/scores" className={textLink}>
          {a("manageJudging")}
        </Link>
        <Link href="/dashboard/organizer/challenges" className={textLink}>
          {a("browseChallenges")}
        </Link>
      </nav>
    </div>
  )
}
