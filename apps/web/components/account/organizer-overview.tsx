"use client"
import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
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
      <nav aria-label={t("actions")} className="flex flex-wrap gap-3">
        {[
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
