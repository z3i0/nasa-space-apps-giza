"use client"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { accountApi } from "@/lib/account"
interface Row {
  id: string
  name: string
  email?: string
  isActive?: boolean
  institution?: string | null
  skills?: string[]
  team?: { id: string; name: string } | null
  challenge?: string | null
  maxMembers?: number
  members?: { userId: string; role: string; user: { name: string } }[]
  submission?: { title: string; status: string; version: number } | null
}
interface Result {
  items: Row[]
  total: number
  page: number
  totalPages: number
}
export function OrganizerDirectory({
  kind,
}: {
  kind: "participants" | "teams"
}) {
  const t = useTranslations("Operations")
  const [query, setQuery] = useState({ search: "", page: 1 }),
    [search, setSearch] = useState(""),
    [data, setData] = useState<Result | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const c = new AbortController()
    accountApi<Result>(
      `/directory?kind=${kind}&search=${encodeURIComponent(query.search)}&page=${query.page}`,
      undefined,
      c.signal
    )
      .then((result) => {
        if (!c.signal.aborted) {
          setData(result)
          setError(false)
        }
      })
      .catch(() => {
        if (!c.signal.aborted) setError(true)
      })
    return () => c.abort()
  }, [kind, query, attempt])
  const card = "rounded-2xl border border-border bg-card p-6"
  function navigate(page: number) {
    setData(null)
    setQuery((old) => ({ ...old, page }))
  }
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <header className={card}>
        <h1 className="text-3xl font-semibold">{t(kind)}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("directoryHelp")}
        </p>
      </header>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setData(null)
          setQuery({ search: search.trim(), page: 1 })
        }}
      >
        <label className="grow">
          <span className="sr-only">{t("search")}</span>
          <input
            className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm"
            maxLength={120}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
          />
        </label>
        <Button type="submit">{t("search")}</Button>
      </form>
      {error ? (
        <p role="alert" className={card}>
          {t("error")}{" "}
          <Button onClick={() => setAttempt((n) => n + 1)}>{t("retry")}</Button>
        </p>
      ) : !data ? (
        <p role="status">{t("loading")}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("total", { count: data.total })}
          </p>
          {data.items.length ? (
            data.items.map((row) => (
              <article className={card} key={row.id}>
                <h2 className="text-xl font-semibold">{row.name}</h2>
                {kind === "participants" ? (
                  <>
                    <p className="mt-2 text-sm break-all text-muted-foreground">
                      {row.email}
                    </p>
                    <p className="mt-2 text-sm">
                      {t(row.isActive ? "active" : "inactive")} ·{" "}
                      {row.institution || t("notSet")}
                    </p>
                    <p className="mt-2 text-sm">
                      {t("team")}: {row.team?.name || t("noTeam")}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {row.skills?.join(" · ") || t("noSkills")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm">
                      {t("challenge")}: {row.challenge || t("notSet")}
                    </p>
                    <p className="mt-2 text-sm">
                      {t("members")}: {row.members?.length || 0} /{" "}
                      {row.maxMembers}
                    </p>
                    <p className="mt-2 text-sm">
                      {t("submission")}:{" "}
                      {row.submission
                        ? t(row.submission.status)
                        : t("not_started")}
                    </p>
                    {row.submission && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {row.submission.title} · v{row.submission.version}
                      </p>
                    )}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-primary">
                        {t("viewMembers")}
                      </summary>
                      <ul className="mt-3 grid gap-2 text-sm">
                        {row.members?.map((member) => (
                          <li key={member.userId}>
                            {member.user.name} · {t(member.role)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </>
                )}
              </article>
            ))
          ) : (
            <p className={card}>{t("empty")}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={data.page <= 1}
              onClick={() => navigate(data.page - 1)}
            >
              {t("previous")}
            </Button>
            <span className="text-sm">
              {data.page} / {Math.max(1, data.totalPages)}
            </span>
            <Button
              variant="outline"
              disabled={data.page >= data.totalPages}
              onClick={() => navigate(data.page + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
