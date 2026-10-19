"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  requestTeams,
  TeamRequestError,
  type SubmissionDraft,
  type SubmissionState,
} from "@/lib/teams"
import { useTeamWork } from "./use-team-work"
import { WorkShell } from "./work-shell"
import styles from "./team-workspace.module.css"
import { ChallengeSelect } from "@/components/profile/challenge-select"

const emptyDraft: SubmissionDraft = {
  title: "",
  summary: "",
  challenge: "",
  projectUrl: "",
  repositoryUrl: "",
  demoUrl: "",
}
const fields = [
  "title",
  "summary",
  "challenge",
  "projectUrl",
  "repositoryUrl",
  "demoUrl",
] as const

function SubmissionEditor({ teamId }: { teamId: string }) {
  const t = useTranslations("TeamWork")
  const locale = useLocale()
  const [state, setState] = useState<SubmissionState | null>(null)
  const [draft, setDraft] = useState<SubmissionDraft>(emptyDraft)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState("")
  const [now, setNow] = useState(() => Date.now())
  const lock = useRef(false)
  const apply = useCallback((data: SubmissionState) => {
    setState(data)
    setDraft(
      data.submission
        ? (Object.fromEntries(
            fields.map((key) => [key, data.submission![key]])
          ) as unknown as SubmissionDraft)
        : emptyDraft
    )
    setDirty(false)
  }, [])
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await requestTeams<SubmissionState>(
          `/${teamId}/submission`,
          { signal }
        )
        if (!signal?.aborted) {
          apply(data)
          setError("")
        }
      } catch {
        if (!signal?.aborted) setError("loadError")
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [teamId, apply]
  )
  useEffect(() => {
    const controller = new AbortController()
    requestTeams<SubmissionState>(`/${teamId}/submission`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) apply(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("loadError")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [teamId, apply])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  const closed = !!state?.deadline && now >= Date.parse(state.deadline)
  const editable = !!state?.canEdit && !closed
  const complete = !!(
    draft.title.trim() &&
    draft.summary.trim() &&
    draft.challenge.trim() &&
    draft.projectUrl.trim()
  )
  const submitted = state?.submission?.status === "submitted"
  async function save(status: "draft" | "submitted") {
    if (!state || lock.current || !editable) return
    if (
      status === "submitted" &&
      !submitted &&
      !window.confirm(t("submitConfirm"))
    )
      return
    lock.current = true
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const data = await requestTeams<SubmissionState>(
        `/${teamId}/submission`,
        {
          method: "PUT",
          body: { ...draft, status, version: state.submission?.version ?? 0 },
        }
      )
      apply(data)
      setNotice(
        data.submission?.status === "submitted"
          ? "submissionSaved"
          : "draftSaved"
      )
    } catch (e) {
      const codes: Record<string, string> = {
        SUBMISSION_CLOSED: "deadlinePassed",
        SUBMISSION_NOT_OPEN: "notOpen",
        SUBMISSION_INCOMPLETE: "incomplete",
        SUBMISSION_CONFLICT: "submissionConflict",
      }
      setError(
        e instanceof TeamRequestError
          ? codes[e.code || ""] ||
              (e.status === 403 ? "permissionChanged" : "saveError")
          : "saveError"
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute(
      "value"
    )
    void save(action === "submitted" || submitted ? "submitted" : "draft")
  }
  return (
    <>
      {error && (
        <div role="alert" className={styles.error}>
          <p>{t(error)}</p>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              if (!dirty || window.confirm(t("reloadConfirm"))) {
                setNotice("")
                void load()
              }
            }}
          >
            {t("reload")}
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {t(notice)}
        </p>
      )}
      {loading ? (
        <p role="status">{t("loading")}</p>
      ) : (
        state && (
          <>
            <section className={styles.card}>
              <div className={styles.row}>
                <h2>{t("projectDetails")}</h2>
                <span className={styles.badge}>
                  {t(
                    submitted
                      ? "submitted"
                      : state.submission
                        ? "draft"
                        : "not_started"
                  )}
                </span>
              </div>
              <p className={styles.muted}>
                {state.deadline
                  ? t("deadline", {
                      date: new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Africa/Cairo",
                      }).format(new Date(state.deadline)),
                    })
                  : t("notOpen")}
              </p>
              {closed && <p className={styles.notice}>{t("deadlinePassed")}</p>}
              {!state.canEdit && !closed && (
                <p className={styles.muted}>{t("leaderOnly")}</p>
              )}
              {state.submission?.submittedAt && (
                <p className={styles.muted}>
                  {t("submittedAt", {
                    date: new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Africa/Cairo",
                    }).format(new Date(state.submission.submittedAt)),
                  })}
                </p>
              )}
              <p className={styles.muted}>{t("submissionHint")}</p>
              <form onSubmit={onSubmit} className={styles.stack}>
                <fieldset
                  disabled={busy || !editable}
                  className={styles.fields}
                >
                  {fields.map((key) => (
                    <div key={key} className={styles.field}>
                      <label htmlFor={`submission-${key}`}>{t(key)}</label>
                      {key === "summary" ? (
                        <textarea
                          id={`submission-${key}`}
                          className={styles.control}
                          maxLength={5000}
                          value={draft[key]}
                          onChange={(e) => {
                            setDraft({ ...draft, [key]: e.target.value })
                            setDirty(true)
                            setNotice("")
                          }}
                        />
                      ) : key === "challenge" ? (
                        <ChallengeSelect
                          id="submission-challenge"
                          value={draft.challenge}
                          className={styles.control}
                          onChange={(challenge) => {
                            setDraft({ ...draft, challenge })
                            setDirty(true)
                            setNotice("")
                          }}
                        />
                      ) : (
                        <input
                          id={`submission-${key}`}
                          className={styles.control}
                          type={key.endsWith("Url") ? "url" : "text"}
                          maxLength={
                            key.endsWith("Url")
                              ? 2000
                              : key === "title"
                                ? 100
                                : 200
                          }
                          value={draft[key]}
                          onChange={(e) => {
                            setDraft({ ...draft, [key]: e.target.value })
                            setDirty(true)
                            setNotice("")
                          }}
                        />
                      )}
                    </div>
                  ))}
                  {editable && (
                    <div className={styles.actions}>
                      <Button
                        type="submit"
                        value="draft"
                        variant="secondary"
                        disabled={!dirty || (submitted && !complete)}
                      >
                        {t(
                          busy
                            ? "saving"
                            : submitted
                              ? "saveChanges"
                              : "saveDraft"
                        )}
                      </Button>
                      {!submitted && (
                        <Button
                          type="submit"
                          value="submitted"
                          disabled={!state.deadline || !complete}
                        >
                          {t("submitProject")}
                        </Button>
                      )}
                    </div>
                  )}
                </fieldset>
                {dirty && (
                  <p role="status" className={styles.muted}>
                    {t("unsaved")}
                  </p>
                )}
              </form>
            </section>
          </>
        )
      )}
    </>
  )
}

export function TeamSubmission() {
  const t = useTranslations("TeamWork")
  const work = useTeamWork()
  return (
    <WorkShell
      {...work}
      title={t("submissionTitle")}
      subtitle={t("submissionSubtitle")}
    >
      {work.team && (
        <SubmissionEditor key={work.team.id} teamId={work.team.id} />
      )}
    </WorkShell>
  )
}
