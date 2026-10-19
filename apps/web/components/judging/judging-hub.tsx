"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Clock3,
  TrendingUp,
} from "lucide-react"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import {
  judgingApi,
  evaluationScore,
  type Assignment,
  type Management,
  type Publication,
  type Ranking,
} from "@/lib/judging"
import s from "./judging.module.css"

async function readWorkspace(organizer: boolean, signal?: AbortSignal) {
  if (organizer) {
    const management = await judgingApi<Management>(
      "/manage",
      "GET",
      undefined,
      signal
    )
    return {
      management,
      assignments: management.assignments,
      publication: management.publication,
    }
  }
  const [assignments, publication] = await Promise.all([
    judgingApi<Assignment[]>("/assignments", "GET", undefined, signal),
    judgingApi<Publication | null>("/results", "GET", undefined, signal),
  ])
  return { management: null, assignments, publication }
}

export function JudgingHub({
  organizer = false,
  view = "overview",
  assignmentId,
}: {
  organizer?: boolean
  view?: string
  assignmentId?: string
}) {
  const t = useTranslations("Judging")
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [management, setManagement] = useState<Management | null>(null)
  const [publication, setPublication] = useState<Publication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  async function load(signal?: AbortSignal) {
    const data = await readWorkspace(organizer, signal)
    if (signal?.aborted) return
    setManagement(data.management)
    setAssignments(data.assignments)
    setPublication(data.publication)
  }
  useEffect(() => {
    const controller = new AbortController()
    readWorkspace(organizer, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setManagement(data.management)
        setAssignments(data.assignments)
        setPublication(data.publication)
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : t("error"))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
    // Role is fixed by the route. Translation changes remount the locale route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizer])
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await judgingApi(path, method, body)
      await load()
      setNotice(t("saved"))
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"))
      return false
    } finally {
      setBusy(false)
    }
  }
  const done = assignments.filter((a) => a.completed).length
  const percent = assignments.length
    ? Math.round((done / assignments.length) * 100)
    : 0
  const current = assignments.find((a) => a.id === assignmentId)
  const criteria = [
    ...new Map(assignments.map((a) => [a.rubric.id, a.rubric])).values(),
  ]
  return (
    <div className={s.hub}>
      <header className={s.hero}>
        <div className={s.eyebrow}>
          <Award size={16} />
          {t("eyebrow")}
        </div>
        <h1>{t(organizer ? "organizerTitle" : "title")}</h1>
        <p className={s.muted}>
          {t(organizer ? "organizerDescription" : "description")}
        </p>
      </header>
      {!organizer && (
        <nav className={s.nav} aria-label={t("navigation")}>
          {["overview", "projects", "progress", "criteria", "leaderboard"].map(
            (v) => (
              <Link
                key={v}
                href={
                  v === "overview"
                    ? "/dashboard/judge"
                    : `/dashboard/judge/${v}`
                }
                aria-current={view === v ? "page" : undefined}
              >
                {t(v)}
              </Link>
            )
          )}
        </nav>
      )}
      {error && (
        <div role="alert" className={s.error}>
          {error}{" "}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setLoading(true)
              load()
                .then(() => setError(""))
                .catch((e) => setError(String(e.message)))
                .finally(() => setLoading(false))
            }}
          >
            {t("retry")}
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className={s.empty}>
          {t("loading")}
        </p>
      ) : (
        <>
          <div className={s.stats}>
            {[
              [ClipboardList, "assigned", assignments.length],
              [CheckCircle2, "completed", done],
              [Clock3, "remaining", assignments.length - done],
              [TrendingUp, "progress", `${percent}%`],
            ].map(([Icon, key, value]) => {
              const StatIcon = Icon as typeof Award
              return (
                <section className={s.stat} key={String(key)}>
                  <StatIcon size={20} />
                  <strong>{String(value)}</strong>
                  <span className={s.muted}>{t(String(key))}</span>
                </section>
              )
            })}
          </div>
          {organizer && management ? (
            <OrganizerTools data={management} busy={busy} mutate={mutate} />
          ) : assignmentId ? (
            current ? (
              <Evaluation
                key={`${current.id}:${current.version}`}
                assignment={current}
                busy={busy}
                locked={!!publication}
                onSave={(dto) =>
                  mutate(`/assignments/${current.id}`, "PUT", dto)
                }
              />
            ) : (
              <p className={s.empty}>{t("notFound")}</p>
            )
          ) : view === "leaderboard" ? (
            <section className={s.panel}>
              <h2>{t("leaderboard")}</h2>
              {publication ? (
                <>
                  <p className={s.muted}>{t("published")}</p>
                  <Rankings rows={publication.results} />
                </>
              ) : (
                <p className={s.empty}>{t("unpublished")}</p>
              )}
            </section>
          ) : view === "criteria" ? (
            <section className={s.panel}>
              <h2>{t("criteria")}</h2>
              <p className={s.muted}>{t("rubricHelp")}</p>
              {criteria.length ? (
                criteria.map((r) => (
                  <div className={s.project} key={r.id}>
                    <h3>{r.name}</h3>
                    {r.criteria.map((c, i) => (
                      <div className={s.row} key={i}>
                        <span>{c.name}</span>
                        <span className={s.badge}>{c.weight}%</span>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <p className={s.empty}>{t("empty")}</p>
              )}
            </section>
          ) : (
            <div className={s.grid}>
              <section className={s.panel}>
                <div className={s.row}>
                  <h2>{t(view === "progress" ? "progress" : "projects")}</h2>
                  <span className={s.badge}>{assignments.length}</span>
                </div>
                <div className={s.list}>
                  {assignments.length ? (
                    assignments.map((a) => (
                      <article className={s.project} key={a.id}>
                        <div className={s.row}>
                          <span
                            className={`${s.badge} ${a.completed ? s.done : ""}`}
                          >
                            {t(
                              a.completed
                                ? "finalized"
                                : Object.keys(a.scores).length
                                  ? "draft"
                                  : "pending"
                            )}
                          </span>
                          <span className={s.muted}>
                            {t("version", { version: a.submissionVersion })}
                          </span>
                        </div>
                        <h3>{a.snapshot.title}</h3>
                        <p className={s.muted}>
                          {a.snapshot.teamName} · {a.snapshot.challenge}
                        </p>
                        <div className={s.row}>
                          <span className={s.muted}>
                            {a.completed
                              ? `${evaluationScore(a).toFixed(1)} / 100`
                              : t("privateScores")}
                          </span>
                          <Link
                            className="text-sm text-purple-300 underline underline-offset-4"
                            href={`/dashboard/judge/projects/${a.id}`}
                          >
                            {t(a.completed ? "review" : "evaluate")}
                          </Link>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className={s.empty}>{t("empty")}</p>
                  )}
                </div>
              </section>
              <aside className={s.list}>
                <section className={s.panel}>
                  <h2>{t("progress")}</h2>
                  <div className={s.row}>
                    <strong className="text-3xl">{percent}%</strong>
                    <span className={s.muted}>
                      {done} / {assignments.length}
                    </span>
                  </div>
                  <progress
                    className={s.progress}
                    max={100}
                    value={percent}
                    aria-label={t("progress")}
                  />
                  <p className={s.muted}>{t("progressHelp")}</p>
                </section>
                <section className={s.panel}>
                  <h2>{t("guidelines")}</h2>
                  <p className={s.muted}>{t("guidelinesText")}</p>
                </section>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Evaluation({
  assignment: a,
  busy,
  locked,
  onSave,
}: {
  assignment: Assignment
  busy: boolean
  locked: boolean
  onSave: (body: unknown) => Promise<boolean>
}) {
  const t = useTranslations("Judging")
  const [scores, setScores] = useState(a.scores)
  const [feedback, setFeedback] = useState(a.feedback)
  const disabled = busy || a.completed || locked
  const total = evaluationScore({ ...a, scores })
  return (
    <div className={s.grid}>
      <section className={s.panel}>
        <span className={s.badge}>
          {t("version", { version: a.submissionVersion })}
        </span>
        <h2 className="mt-4">{a.snapshot.title}</h2>
        <p className={s.muted}>
          {a.snapshot.teamName} · {a.snapshot.challenge}
        </p>
        <p className={s.summary}>{a.snapshot.summary}</p>
        <div className={`${s.links} ${s.actions}`}>
          {(["projectUrl", "repositoryUrl", "demoUrl"] as const).map((key) =>
            /^https?:\/\//i.test(a.snapshot[key]) ? (
              <a
                key={key}
                href={a.snapshot[key]}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(key)} ↗
              </a>
            ) : null
          )}
        </div>
        <p className={`${s.muted} mt-6`}>{t("snapshotHelp")}</p>
      </section>
      <form
        className={`${s.panel} ${s.form}`}
        onSubmit={(e) => {
          e.preventDefault()
          void onSave({ scores, feedback, completed: true, version: a.version })
        }}
      >
        <div className={s.row}>
          <h2>{t("evaluation")}</h2>
          <span className={s.badge}>{a.rubric.name}</span>
        </div>
        <p className={s.muted}>{t("scoringHelp")}</p>
        <fieldset disabled={disabled}>
          {a.rubric.criteria.map((c, i) => (
            <label className={s.criterion} key={i}>
              <span>
                {c.name}
                <small className={`${s.muted} block`}>
                  {t("weight", { weight: c.weight })}
                </small>
              </span>
              <input
                aria-label={c.name}
                type="number"
                min={1}
                max={10}
                step={1}
                required
                value={scores[String(i)] ?? ""}
                onChange={(e) =>
                  setScores((old) => {
                    const next = { ...old }
                    if (e.target.value === "") delete next[String(i)]
                    else next[String(i)] = Number(e.target.value)
                    return next
                  })
                }
              />
            </label>
          ))}
        </fieldset>
        <div className={s.row}>
          <span>{t("weightedTotal")}</span>
          <strong className="text-2xl text-purple-300">
            {total.toFixed(1)} / 100
          </strong>
        </div>
        <label>
          {t("feedback")}
          <textarea
            required
            maxLength={10000}
            disabled={disabled}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </label>
        {a.completed ? (
          <p className={s.notice}>{t("finalizedHelp")}</p>
        ) : (
          <>
            <p className={s.muted}>{t("finalWarning")}</p>
            <div className={s.actions}>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() =>
                  void onSave({
                    scores,
                    feedback,
                    completed: false,
                    version: a.version,
                  })
                }
              >
                {t("saveDraft")}
              </Button>
              <Button type="submit" disabled={disabled}>
                {t("finalize")}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

function Rankings({ rows }: { rows: Ranking[] }) {
  const t = useTranslations("Judging")
  return rows.length ? (
    <ol className={s.ranking}>
      {rows.map((r) => (
        <li key={r.teamId}>
          <strong>#{r.rank}</strong>
          <div>
            {r.teamName}
            <p className={s.muted}>
              {t("evaluations", { count: r.evaluations })}
            </p>
          </div>
          <span>{r.score.toFixed(2)} / 100</span>
        </li>
      ))}
    </ol>
  ) : (
    <p className={s.empty}>{t("noScores")}</p>
  )
}

function OrganizerTools({
  data,
  busy,
  mutate,
}: {
  data: Management
  busy: boolean
  mutate: (path: string, method: string, body?: unknown) => Promise<boolean>
}) {
  const t = useTranslations("Judging")
  const [rubricName, setRubricName] = useState("")
  const [criteria, setCriteria] = useState([{ name: "", weight: 100 }])
  const [judgeId, setJudgeId] = useState("")
  const [teamId, setTeamId] = useState("")
  const [rubricId, setRubricId] = useState("")
  const locked = busy || !!data.publication
  function exportCsv() {
    const quote = (value: string | number) =>
      `"${String(value)
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""')}"`
    const csv = [
      ["Rank", "Team", "Score / 100", "Completed evaluations", "Assignments"],
      ...data.rankings.map((r) => [
        r.rank,
        r.teamName,
        r.score,
        r.evaluations,
        r.assigned,
      ]),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n")
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "judging-results.csv"
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <>
      <div className={s.grid}>
        <form
          className={`${s.panel} ${s.form}`}
          onSubmit={async (e) => {
            e.preventDefault()
            if (
              await mutate("/rubrics", "POST", { name: rubricName, criteria })
            ) {
              setRubricName("")
              setCriteria([{ name: "", weight: 100 }])
            }
          }}
        >
          <h2>{t("createRubric")}</h2>
          <p className={s.muted}>{t("rubricHelp")}</p>
          <fieldset disabled={locked} className={s.form}>
            <label>
              {t("rubricName")}
              <input
                required
                maxLength={100}
                value={rubricName}
                onChange={(e) => setRubricName(e.target.value)}
              />
            </label>
            {criteria.map((c, i) => (
              <div key={i} className={s.criterion}>
                <label>
                  {t("criterion", { number: i + 1 })}
                  <input
                    required
                    maxLength={100}
                    value={c.name}
                    onChange={(e) =>
                      setCriteria((old) =>
                        old.map((v, n) =>
                          n === i ? { ...v, name: e.target.value } : v
                        )
                      )
                    }
                  />
                </label>
                <label>
                  {t("weightLabel")}
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={c.weight}
                    onChange={(e) =>
                      setCriteria((old) =>
                        old.map((v, n) =>
                          n === i ? { ...v, weight: Number(e.target.value) } : v
                        )
                      )
                    }
                  />
                </label>
              </div>
            ))}
            <div className={s.actions}>
              <Button
                type="button"
                variant="outline"
                disabled={criteria.length >= 20}
                onClick={() =>
                  setCriteria((old) => [...old, { name: "", weight: 1 }])
                }
              >
                {t("addCriterion")}
              </Button>
              {criteria.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCriteria((old) => old.slice(0, -1))}
                >
                  {t("removeCriterion")}
                </Button>
              )}
            </div>
            <p className={s.muted}>
              {t("weightTotal", {
                total: criteria.reduce((sum, c) => sum + c.weight, 0),
              })}
            </p>
            <Button
              type="submit"
              disabled={criteria.reduce((sum, c) => sum + c.weight, 0) !== 100}
            >
              {t("createRubric")}
            </Button>
          </fieldset>
          {data.rubrics.map((r) => (
            <div key={r.id} className={s.project}>
              <h3>{r.name}</h3>
              <p className={s.muted}>
                {r.criteria.map((c) => `${c.name} ${c.weight}%`).join(" · ")}
              </p>
            </div>
          ))}
        </form>
        <div className={s.list}>
          <form
            className={`${s.panel} ${s.form}`}
            onSubmit={(e) => {
              e.preventDefault()
              void mutate("/assignments", "POST", { judgeId, teamId, rubricId })
            }}
          >
            <h2>{t("assignJudge")}</h2>
            <p className={s.muted}>{t("assignmentHelp")}</p>
            <fieldset className={s.form} disabled={locked}>
              <label>
                {t("judge")}
                <select
                  required
                  value={judgeId}
                  onChange={(e) => setJudgeId(e.target.value)}
                >
                  <option value="">{t("choose")}</option>
                  {data.judges.map((j) => (
                    <option value={j.id} key={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("submittedTeam")}
                <select
                  required
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">{t("choose")}</option>
                  {data.teams.map((team) => (
                    <option value={team.id} key={team.id}>
                      {team.name} · v{team.submission.version}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("rubric")}
                <select
                  required
                  value={rubricId}
                  onChange={(e) => setRubricId(e.target.value)}
                >
                  <option value="">{t("choose")}</option>
                  {data.rubrics.map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit">{t("assignJudge")}</Button>
            </fieldset>
          </form>
          <section className={s.panel}>
            <h2>{t("publication")}</h2>
            <p className={s.muted}>{t("publicationHelp")}</p>
            <div className={`${s.actions} mt-4`}>
              <Button
                disabled={busy}
                onClick={() =>
                  void mutate(
                    "/publication",
                    data.publication ? "DELETE" : "POST"
                  )
                }
              >
                {t(data.publication ? "unpublish" : "publish")}
              </Button>
              <Button
                variant="outline"
                disabled={!data.rankings.length}
                onClick={exportCsv}
              >
                {t("export")}
              </Button>
            </div>
            {data.publication && (
              <p className={`${s.notice} mt-4`}>{t("published")}</p>
            )}
          </section>
        </div>
      </div>
      <section className={s.panel}>
        <h2>{t("assignments")}</h2>
        <div className={s.list}>
          {data.assignments.length ? (
            data.assignments.map((a) => (
              <article className={s.project} key={a.id}>
                <div className={s.row}>
                  <h3>{a.snapshot.teamName}</h3>
                  <span className={`${s.badge} ${a.completed ? s.done : ""}`}>
                    {t(
                      a.completed
                        ? "finalized"
                        : Object.keys(a.scores).length
                          ? "draft"
                          : "pending"
                    )}
                  </span>
                </div>
                <p className={s.muted}>
                  {a.judge?.name} · {a.rubric.name} ·{" "}
                  {t("version", { version: a.submissionVersion })}
                </p>
                {a.version === 1 && !a.completed && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={locked}
                    onClick={() =>
                      void mutate(`/assignments/${a.id}`, "DELETE")
                    }
                  >
                    {t("unassign")}
                  </Button>
                )}
                {a.completed && (
                  <>
                    <strong>{evaluationScore(a).toFixed(1)} / 100</strong>
                    <p className={s.summary}>{a.feedback}</p>
                  </>
                )}
              </article>
            ))
          ) : (
            <p className={s.empty}>{t("emptyAssignments")}</p>
          )}
        </div>
      </section>
      <section className={s.panel}>
        <h2>{t("resultsPreview")}</h2>
        <p className={s.muted}>{t("previewHelp")}</p>
        <Rankings rows={data.rankings} />
      </section>
    </>
  )
}
