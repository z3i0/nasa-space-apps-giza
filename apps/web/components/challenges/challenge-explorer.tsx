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
  type Challenge,
  type ChallengeCard,
  type ChallengeDraft,
  type ChallengeList,
  type LegacyChoices,
} from "@/lib/challenges"
import { ChallengeEditor } from "./challenge-editor"
import s from "./challenges.module.css"

type Viewer = "participant" | "mentor" | "judge"
export function ChallengeExplorer({
  management = false,
  role = "participant",
}: {
  management?: boolean
  role?: Viewer
}) {
  const t = useTranslations("Challenges"),
    locale = useLocale()
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState({
    search: "",
    category: "",
    difficulty: "",
    year: "",
    view: "all",
    status: "all",
    page: 1,
  })
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{
    key: string
    data?: ChallengeList
    error?: string
  } | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [editor, setEditor] = useState<Challenge | null | undefined>(undefined)
  const editorHeading = useRef<HTMLDivElement>(null)
  const key = JSON.stringify([query, revision, management])
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
      if (value !== "" && !(name === "status" && !management))
        params.set(name, String(value))
    challengesApi<ChallengeList>(`${management ? "/manage" : ""}?${params}`, {
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
  }, [key, query, management])
  useEffect(() => {
    if (editor !== undefined) editorHeading.current?.focus()
  }, [editor])
  async function action(
    run: () => Promise<unknown>,
    success?: string,
    after?: () => void
  ) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await run()
      after?.()
      if (success) setNotice(success)
      setRevision((current) => current + 1)
    } catch (cause) {
      setError(challengeError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function edit(id: string) {
    await action(async () =>
      setEditor(await challengesApi<Challenge>(`/manage/${id}`))
    )
  }
  async function save(draft: ChallengeDraft) {
    await action(
      () =>
        challengesApi(editor ? `/manage/${editor.id}` : "/manage", {
          method: editor ? "PUT" : "POST",
          body: draft,
        }),
      t("challengeSaved"),
      () => setEditor(undefined)
    )
  }
  function filter(name: string, value: string) {
    setQuery((previous) => ({ ...previous, [name]: value, page: 1 }))
  }
  const cards = data?.items || []
  return (
    <div className={s.page}>
      <PageHeader
        icon={Compass}
        title={t(management ? "manageTitle" : "title")}
        subtitle={t(management ? "manageSubtitle" : "subtitle")}
        actions={
          management && (
            <Button
              onClick={() => {
                setEditor(null)
                setError("")
                setNotice("")
              }}
            >
              {t("new")}
            </Button>
          )
        }
      />
      {error && (
        <p role="alert" className={`${s.banner} ${s.error}`}>
          {t(error)}
        </p>
      )}
      {notice && (
        <p role="status" className={s.banner}>
          {notice}
        </p>
      )}
      {management && editor !== undefined && (
        <div ref={editorHeading} tabIndex={-1}>
          <ChallengeEditor
            key={editor ? `${editor.id}:${editor.version}` : "new"}
            initial={editor}
            busy={busy}
            onSave={save}
            onCancel={() => setEditor(undefined)}
          />
        </div>
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
          {management && (
            <label className={s.field}>
              {t("status")}
              <select
                className={s.control}
                value={query.status}
                onChange={(e) => filter("status", e.target.value)}
              >
                {["all", "published", "draft", "archived"].map((status) => (
                  <option key={status} value={status}>
                    {t(status)}
                  </option>
                ))}
              </select>
            </label>
          )}
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
                    {challenge.isDemo && <span>{t("demo")}</span>}
                    {management && (
                      <span>
                        {t(
                          challenge.isArchived
                            ? "archived"
                            : challenge.isPublished
                              ? "published"
                              : "draft"
                        )}
                      </span>
                    )}
                  </div>
                  <h2>{content.title}</h2>
                  <p className={s.muted}>{content.summary}</p>
                  <div className={s.chips}>
                    {challenge.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className={s.actions}>
                    {management ? (
                      <>
                        <Button
                          disabled={busy}
                          variant="secondary"
                          onClick={() => void edit(challenge.id)}
                        >
                          {t("edit")}
                        </Button>
                        {!challenge.isArchived && (
                          <Button
                            disabled={busy}
                            variant="secondary"
                            onClick={() =>
                              void action(
                                () =>
                                  challengesApi(`/manage/${challenge.id}`, {
                                    method: "DELETE",
                                    body: {
                                      expectedVersion: challenge.version,
                                    },
                                  }),
                                t("challengeArchived")
                              )
                            }
                          >
                            {t("archive")}
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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
                    status: "all",
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
      {management && (
        <LegacyReview
          revision={revision}
          onLinked={() => {
            setNotice(t("linked"))
            setRevision((current) => current + 1)
          }}
        />
      )}
    </div>
  )
}

function LegacyReview({
  revision,
  onLinked,
}: {
  revision: number
  onLinked: () => void
}) {
  const t = useTranslations("Challenges"),
    locale = useLocale()
  const [page, setPage] = useState(1),
    [state, setState] = useState<{
      key: string
      data?: LegacyChoices
      options?: ChallengeCard[]
      error?: string
    } | null>(null)
  const [choices, setChoices] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const key = JSON.stringify([page, revision])
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      challengesApi<LegacyChoices>(
        `/manage/legacy-teams?page=${page}&limit=20`,
        { signal: controller.signal }
      ),
      challengesApi<ChallengeList>("?limit=100", { signal: controller.signal }),
    ])
      .then(([data, options]) => {
        if (!controller.signal.aborted)
          setState({ key, data, options: options.items })
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setState({ key, error: challengeError(cause) })
      })
    return () => controller.abort()
  }, [key, page, revision])
  async function link(teamId: string) {
    setBusy(true)
    setError("")
    try {
      await challengesApi(`/manage/${choices[teamId]}/teams/${teamId}`, {
        method: "POST",
      })
      onLinked()
    } catch (cause) {
      setError(challengeError(cause))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={s.panel}>
      <h2 className={s.sectionTitle}>{t("legacyTitle")}</h2>
      <p className={s.muted}>{t("legacyHint")}</p>
      {error && (
        <p role="alert" className={s.error}>
          {t(error)}
        </p>
      )}
      {state?.key !== key ? (
        <p className={s.muted}>{t("loading")}</p>
      ) : state.error ? (
        <p role="alert">{t(state.error)}</p>
      ) : (
        <>
          {state.data?.items.length ? (
            state.data.items.map((team) => (
              <div key={team.id} className={s.legacy}>
                <div>
                  <h3 className="font-semibold">{team.name}</h3>
                  <p className={s.muted}>
                    {t("legacyChoice", { title: team.challenge })}
                  </p>
                </div>
                <select
                  aria-label={`${t("chooseOption")}: ${team.name}`}
                  className={s.control}
                  value={choices[team.id] || ""}
                  onChange={(e) =>
                    setChoices({ ...choices, [team.id]: e.target.value })
                  }
                >
                  <option value="">{t("chooseOption")}</option>
                  {state.options?.map((option) => (
                    <option key={option.id} value={option.id}>
                      {localizedChallenge(option, locale).title}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={busy || !choices[team.id]}
                  onClick={() => void link(team.id)}
                >
                  {t("linkChoice")}
                </Button>
              </div>
            ))
          ) : (
            <p className={`${s.muted} mt-4`}>{t("legacyEmpty")}</p>
          )}
          {(state.data?.totalPages || 0) > 1 && (
            <div className={s.pagination}>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t("previous")}
              </Button>
              <span>{t("page", { page, total: state.data!.totalPages })}</span>
              <Button
                variant="secondary"
                disabled={page >= state.data!.totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
