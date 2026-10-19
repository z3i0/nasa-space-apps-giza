"use client"
import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Bookmark, ArrowUpRight, Compass } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Button, buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  challengesApi,
  challengeError,
  localizedChallenge,
  type ChallengeCard,
  type ChallengeList,
} from "@/lib/challenges"
import s from "./challenges.module.css"

type Viewer = "participant" | "mentor" | "judge" | "organizer"
export function ChallengeExplorer({ role = "participant" }: { role?: Viewer }) {
  const t = useTranslations("Challenges"),
    locale = useLocale()
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState({
    search: "",
    category: "",
    difficulty: "",
    year: "",
    view: "all",
    page: 1,
  })
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{
    key: string
    data?: ChallengeList
    error?: string
  } | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const key = JSON.stringify([query, revision])
  const data = state?.key === key ? state.data : undefined
  const loading = state?.key !== key
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setQuery((previous) =>
          previous.search === search
            ? previous
            : { ...previous, search, page: 1 }
        ),
      300
    )
    return () => window.clearTimeout(timer)
  }, [search])
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    for (const [name, value] of Object.entries(query))
      if (value !== "") params.set(name, String(value))
    challengesApi<ChallengeList>(`?${params}`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, data: result })
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setState({ key, error: challengeError(cause) })
      })
    return () => controller.abort()
  }, [key, query])
  async function action(run: () => Promise<unknown>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError("")
    try {
      await run()
      setRevision((current) => current + 1)
    } catch (cause) {
      setError(challengeError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  function filter(name: string, value: string) {
    setQuery((previous) => ({ ...previous, [name]: value, page: 1 }))
  }
  const cards = data?.items || []
  return (
    <div className={s.page}>
      <PageHeader icon={Compass} title={t("title")} subtitle={t("subtitle")} />
      {error && (
        <p role="alert" className={`${s.banner} ${s.error}`}>
          {t(error)}
        </p>
      )}
      <section className={s.panel} aria-label={t("search")}>
        <div className={s.toolbar}>
          <label className={s.field}>
            {t("search")}
            <input
              type="search"
              className={s.control}
              value={search}
              placeholder={t("searchPlaceholder")}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className={s.field}>
            {t("category")}
            <select
              className={s.control}
              value={query.category}
              onChange={(e) => filter("category", e.target.value)}
            >
              <option value="">{t("all")}</option>
              {data?.categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className={s.field}>
            {t("difficulty")}
            <select
              className={s.control}
              value={query.difficulty}
              onChange={(e) => filter("difficulty", e.target.value)}
            >
              <option value="">{t("all")}</option>
              {(["beginner", "intermediate", "advanced"] as const).map(
                (difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {t(difficulty)}
                  </option>
                )
              )}
            </select>
          </label>
          <label className={s.field}>
            {t("year")}
            <select
              className={s.control}
              value={query.year}
              onChange={(e) => filter("year", e.target.value)}
            >
              <option value="">{t("all")}</option>
              {data?.years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={`${s.tabs} mt-4`}>
          {(["all", "saved"] as const).map((view) => (
            <Button
              key={view}
              variant="secondary"
              aria-pressed={query.view === view}
              onClick={() => filter("view", view)}
            >
              {view === "saved" && <Bookmark size={14} />}
              {t(view === "all" ? "allChallenges" : "savedChallenges")}
            </Button>
          ))}
        </div>
      </section>
      {loading ? (
        <p role="status" className={s.muted}>
          {t("loading")}
        </p>
      ) : state?.error ? (
        <div className={s.banner} role="alert">
          {t(state.error)}{" "}
          <Button
            variant="secondary"
            onClick={() => setRevision((current) => current + 1)}
          >
            {t("retry")}
          </Button>
        </div>
      ) : (
        <>
          <p className={s.muted}>{t("count", { count: data?.total || 0 })}</p>
          <div className={s.grid}>
            {cards.map((challenge: ChallengeCard) => {
              const content = localizedChallenge(challenge, locale)
              return (
                <article key={challenge.id} className={s.card}>
                  <div className={s.chips}>
                    <span>{challenge.year}</span>
                    <span>{challenge.category}</span>
                    <span>{t(challenge.difficulty)}</span>
                  </div>
                  <h2>{content.title}</h2>
                  <p className={s.muted}>{content.summary}</p>
                  <div className={s.chips}>
                    {challenge.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className={s.actions}>
                    <Link
                      className={buttonVariants({ variant: "default" })}
                      href={`/dashboard/${role}/challenges/${challenge.slug}`}
                    >
                      {t("view")}
                      <ArrowUpRight size={15} />
                    </Link>
                    <Button
                      disabled={busy}
                      variant="secondary"
                      aria-label={t(challenge.saved ? "unsave" : "save")}
                      aria-pressed={challenge.saved}
                      onClick={() =>
                        void action(() =>
                          challengesApi(`/${challenge.id}/favorite`, {
                            method: "PUT",
                            body: { saved: !challenge.saved },
                          })
                        )
                      }
                    >
                      <Bookmark
                        size={16}
                        fill={challenge.saved ? "currentColor" : "none"}
                      />
                      {t(challenge.saved ? "saved" : "save")}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
          {!cards.length && (
            <div className={s.panel}>
              <p className={s.muted}>
                {t(
                  query.search ||
                    query.category ||
                    query.difficulty ||
                    query.year ||
                    query.view === "saved"
                    ? "noResults"
                    : "empty"
                )}
              </p>
              <Button
                className="mt-3"
                variant="secondary"
                onClick={() => {
                  setSearch("")
                  setQuery({
                    search: "",
                    category: "",
                    difficulty: "",
                    year: "",
                    view: "all",
                    page: 1,
                  })
                }}
              >
                {t("reset")}
              </Button>
            </div>
          )}
          {!!data?.totalPages && (
            <div className={s.pagination}>
              <Button
                disabled={query.page <= 1}
                variant="secondary"
                onClick={() => setQuery({ ...query, page: query.page - 1 })}
              >
                {t("previous")}
              </Button>
              <span className={s.muted}>
                {t("page", { page: data.page, total: data.totalPages })}
              </span>
              <Button
                disabled={query.page >= data.totalPages}
                variant="secondary"
                onClick={() => setQuery({ ...query, page: query.page + 1 })}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
