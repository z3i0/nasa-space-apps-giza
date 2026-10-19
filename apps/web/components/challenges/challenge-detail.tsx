"use client"
import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Bookmark, ExternalLink } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  challengesApi,
  challengeError,
  localizedChallenge,
  type Challenge,
  type ChallengeSelection,
} from "@/lib/challenges"
import s from "./challenges.module.css"

export function ChallengeDetail({
  challengeKey,
  role,
}: {
  challengeKey: string
  role: "participant" | "mentor" | "judge" | "organizer"
}) {
  const t = useTranslations("Challenges"),
    locale = useLocale()
  const [record, setRecord] = useState<Challenge | null>(null),
    [selection, setSelection] = useState<ChallengeSelection>({ team: null })
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false)
  const lock = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      challengesApi<Challenge>(`/${encodeURIComponent(challengeKey)}`, {
        signal: controller.signal,
      }),
      role === "participant"
        ? challengesApi<ChallengeSelection>("/selection", {
            signal: controller.signal,
          })
        : Promise.resolve({ team: null }),
    ])
      .then(([challenge, choice]) => {
        if (!controller.signal.aborted) {
          setRecord(challenge)
          setSelection(choice)
          setLoading(false)
          setError("")
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(challengeError(cause))
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [challengeKey, role, revision])
  async function favorite() {
    if (!record || lock.current) return
    lock.current = true
    setBusy(true)
    try {
      await challengesApi(`/${record.id}/favorite`, {
        method: "PUT",
        body: { saved: !record.saved },
      })
      setRecord({ ...record, saved: !record.saved })
      setError("")
    } catch (cause) {
      setError(challengeError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function select() {
    if (!record || lock.current) return
    lock.current = true
    setBusy(true)
    try {
      await challengesApi(`/${record.id}/select`, { method: "POST" })
      setNotice(t("selectionSaved"))
      setRevision((value) => value + 1)
    } catch (cause) {
      setError(challengeError(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  if (loading)
    return (
      <p role="status" className={s.muted}>
        {t("loading")}
      </p>
    )
  const content = record ? localizedChallenge(record, locale) : null
  return (
    <div className={s.page}>
      <Link className={s.resource} href={`/dashboard/${role}/challenges`}>
        {t("back")}
      </Link>
      {error && (
        <div role="alert" className={`${s.banner} ${s.error}`}>
          {t(error)}{" "}
          <Button
            variant="secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            {t("retry")}
          </Button>
        </div>
      )}
      {record && content && (
        <>
          <PageHeader
            title={content.title}
            subtitle={content.summary}
            actions={
              <Button
                disabled={busy || (!record.saved && record.isArchived)}
                variant="secondary"
                aria-pressed={record.saved}
                onClick={() => void favorite()}
              >
                <Bookmark
                  size={16}
                  fill={record.saved ? "currentColor" : "none"}
                />
                {t(record.saved ? "unsave" : "save")}
              </Button>
            }
          />
          <div className={s.chips}>
            <span>{record.year}</span>
            <span>{record.category}</span>
            <span>{t(record.difficulty)}</span>
            {record.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          {notice && (
            <p role="status" className={s.banner}>
              {notice}
            </p>
          )}
          <section className={s.panel}>
            <h2 className={s.sectionTitle}>{t("about")}</h2>
            <p className={s.text}>
              {locale === "ar" && record.descriptionAr
                ? record.descriptionAr
                : record.description}
            </p>
            {record.sourceUrl && (
              <a
                className={`${s.resource} mt-5 inline-flex items-center gap-2`}
                href={record.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("officialSource")}
                <ExternalLink size={14} />
              </a>
            )}
          </section>
          <section className={s.panel}>
            <h2 className={s.sectionTitle}>{t("resources")}</h2>
            {record.resources.length ? (
              <ul className="space-y-3">
                {record.resources.map((resource, index) => (
                  <li key={resource.id || index}>
                    <a
                      className={s.resource}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {resource.label}{" "}
                      <ExternalLink className="inline" size={13} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.muted}>{t("noResources")}</p>
            )}
          </section>
          {role === "participant" && (
            <section className={s.panel}>
              {selection.team ? (
                <>
                  <h2 className={s.sectionTitle}>
                    {t("yourTeam", { name: selection.team.name })}
                  </h2>
                  <p className={s.muted}>
                    {selection.team.challenge
                      ? t("currentChoice", { title: selection.team.challenge })
                      : t("noChoice")}
                  </p>
                  <p className={`${s.muted} my-3`}>{t("submissionNote")}</p>
                  {selection.team.canSelect ? (
                    <Button
                      disabled={
                        busy ||
                        record.isArchived ||
                        selection.team.challengeId === record.id
                      }
                      onClick={() => void select()}
                    >
                      {t(
                        selection.team.challengeId === record.id
                          ? "selected"
                          : "select"
                      )}
                    </Button>
                  ) : (
                    <p className={s.muted}>{t("leaderOnly")}</p>
                  )}
                </>
              ) : (
                <>
                  <p className={s.muted}>{t("noTeam")}</p>
                  <Link
                    className={`${s.resource} mt-3 inline-block`}
                    href="/dashboard/participant/find-team"
                  >
                    {t("findTeam")}
                  </Link>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
