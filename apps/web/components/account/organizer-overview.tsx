"use client"
import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import { accountApi } from "@/lib/account"
import { RoleApplications } from "./role-applications"
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
  const t = useTranslations("Operations"),
    locale = useLocale()
  const [data, setData] = useState<Summary | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const c = new AbortController()
    let active = false
    async function load() {
      if (active) return
      active = true
      try {
        const result = await accountApi<Summary>(
          "/organizer-summary",
          undefined,
          c.signal
        )
        if (!c.signal.aborted) {
          setData(result)
          setError(false)
        }
      } catch {
        if (!c.signal.aborted) setError(true)
      } finally {
        active = false
      }
    }
    void load()
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load()
    }, 15000)
    return () => {
      c.abort()
      clearInterval(timer)
    }
  }, [attempt])
  const card = "rounded-2xl border border-border bg-card p-6"
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <header className={card}>
        <h1 className="text-3xl font-semibold">{t("overview")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("overviewHelp")}
        </p>
      </header>
      {error && (
        <p role="alert" className={card}>
          {t("error")}{" "}
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            {t("retry")}
          </Button>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["participants", "participants"],
            ["teams", "teams"],
            ["mentors", "mentors"],
            ["judges", "judges"],
          ] as const
        ).map(([key, path]) => (
          <Link
            href={`/dashboard/organizer/${path}`}
            key={key}
            className={`${card} hover:border-primary`}
          >
            <p className="text-sm text-muted-foreground">{t(key)}</p>
            <strong className="mt-2 block text-3xl">
              {data?.[key] ?? "—"}
            </strong>
          </Link>
        ))}
      </div>
      <RoleApplications embedded />
      <section className={card}>
        <h2 className="text-xl font-semibold">{t("eventProgress")}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {(["submitted", "pending", "completed"] as const).map((key) => (
            <div key={key}>
              <p className="text-sm text-muted-foreground">{t(key)}</p>
              <strong className="mt-2 block text-2xl">
                {data?.[key] ?? "—"}
                {key === "completed" && data ? ` / ${data.assigned}` : ""}
              </strong>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          {t("deadline")}:{" "}
          {data?.deadline
            ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: "Africa/Cairo",
              }).format(new Date(data.deadline))
            : t(data ? "deadlineMissing" : "loading")}
        </p>
      </section>

      <section className={`${card} border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                </span>
                Live
              </span>
              <h2 className="text-xl font-bold text-foreground">{t("analytics")}</h2>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t("analyticsBannerDesc")}
            </p>
          </div>
          <Link
            href="/dashboard/organizer/analytics"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:brightness-110 sm:text-sm"
          >
            <BarChart3 className="size-4" />
            <span>{t("viewAnalytics")}</span>
          </Link>
        </div>
      </section>

      <nav aria-label={t("actions")} className="flex flex-wrap gap-3">
        {[
          ["analytics", "analytics"],
          ["requests-tracking", "requestsTracking"],
          ["challenges", "challenges"],
          ["judges", "assignments"],
          ["scores", "results"],
          ["role-requests", "approvals"],
        ].map(([path, label]) => (
          <Link
            key={path}
            href={`/dashboard/organizer/${path}`}
            className="rounded-xl border border-border bg-card px-5 py-3 text-sm hover:border-primary"
          >
            {t(label)}
          </Link>
        ))}
      </nav>
    </div>
  )
}
