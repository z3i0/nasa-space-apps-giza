"use client"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  Users,
  Target,
  Compass,
  CheckCircle2,
  UserRound,
  ArrowUpRight,
} from "lucide-react"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { accountApi, type AccountOverview } from "@/lib/account"
import { useAuthUser } from "@/lib/auth"

export function ParticipantOverview() {
  const t = useTranslations("Account"),
    user = useAuthUser()
  const [data, setData] = useState<AccountOverview | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const c = new AbortController()
    accountApi<AccountOverview>("/overview", undefined, c.signal)
      .then((value) => {
        if (!c.signal.aborted) setData(value)
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : t("error"))
      })
    return () => c.abort()
  }, [attempt, t])
  const panel = "rounded-2xl border border-border bg-card p-6"
  if (error)
    return (
      <div role="alert" className={panel}>
        {error}{" "}
        <Button
          onClick={() => {
            setError("")
            setAttempt((n) => n + 1)
          }}
        >
          {t("retry")}
        </Button>
      </div>
    )
  if (!data)
    return (
      <p role="status" className={panel}>
        {t("loading")}
      </p>
    )
  const steps = [
    { key: "profileStep", done: data.profileComplete, path: "profile" },
    { key: "challengeStep", done: !!data.challenge, path: "challenges" },
    { key: "teamStep", done: !!data.team, path: "team" },
    { key: "submissionStep", done: data.submitted, path: "submit" },
  ]
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <header
        className={`${panel} bg-linear-to-br from-emerald-500/10 to-transparent`}
      >
        <p className="mb-3 text-xs tracking-widest text-emerald-300 uppercase">
          NASA SPACE APPS · GIZA
        </p>
        <h1 className="text-3xl font-semibold">
          {t("welcome", { name: user?.name || t("participant") })}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("overviewHelp")}
        </p>
      </header>
      {data.applications.map((a) => (
        <section key={a.id} className={panel}>
          <h2 className="font-semibold">
            {t("applicationTitle", { role: t(a.role) })}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(`status_${a.status}`)}
          </p>
          {a.reason && <p className="mt-2 text-sm">{a.reason}</p>}
          {a.status === "approved" && (
            <Link
              href="/login"
              className="mt-3 inline-block text-primary underline"
            >
              {t("signInRole")}
            </Link>
          )}
        </section>
      ))}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Users,
            label: "teamMembers",
            value: data.team
              ? `${data.team.members.length} / ${data.team.maxMembers}`
              : "0",
          },
          {
            icon: Target,
            label: "challenge",
            value: data.challenge || t("notSelected"),
          },
          {
            icon: Compass,
            label: "mentorRequests",
            value: String(data.mentorshipCount),
          },
          {
            icon: CheckCircle2,
            label: "completedSteps",
            value: `${steps.filter((s) => s.done).length} / 4`,
          },
        ].map((item) => (
          <section className={panel} key={item.label}>
            <item.icon size={22} className="mb-4 text-emerald-300" />
            <p className="text-sm text-muted-foreground">{t(item.label)}</p>
            <strong className="mt-2 block text-xl break-words">
              {item.value}
            </strong>
          </section>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-4 text-xl font-semibold">{t("gettingStarted")}</h2>
          <div className="grid gap-3">
            {steps.map((step) => (
              <Link
                key={step.key}
                href={`/dashboard/participant/${step.path}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 text-sm"
              >
                <span className="flex items-center gap-3">
                  <CheckCircle2
                    size={18}
                    className={
                      step.done ? "text-emerald-300" : "text-muted-foreground"
                    }
                  />
                  {t(step.key)}
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
        <section className={panel}>
          <div className="mb-4 flex items-center gap-2">
            <UserRound size={20} />
            <h2 className="text-xl font-semibold">{t("mySkills")}</h2>
          </div>
          {data.skills.length ? (
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <span
                  className="rounded-full border border-border px-3 py-1 text-sm"
                  key={skill}
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("emptySkills")}</p>
          )}
          <Link
            href="/dashboard/participant/profile"
            className="mt-5 inline-block text-sm text-primary underline"
          >
            {t("editProfile")}
          </Link>
        </section>
      </div>
      <section className={panel}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {data.team?.name || t("myTeam")}
          </h2>
          <Link
            href="/dashboard/participant/team"
            className="text-sm text-primary underline"
          >
            {t(data.team ? "manageTeam" : "createTeam")}
          </Link>
        </div>
        {data.team ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.team.members.map((member) => (
              <li
                className="rounded-xl border border-border p-4 text-sm"
                key={member.id}
              >
                {member.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("emptyTeam")}
          </p>
        )}
      </section>
    </div>
  )
}
