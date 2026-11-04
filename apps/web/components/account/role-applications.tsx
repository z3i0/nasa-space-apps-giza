"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Award, Compass, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { accountApi, type RoleApplication } from "@/lib/account"
import {
  ContactEmail,
  DirectoryPagination,
  DirectoryDetails,
  directoryCard,
  directoryField,
  directoryGrid,
  directoryItem,
  directoryTags,
  normalizeDirectoryText as normalize,
} from "./admin-directory-ui"

export function RoleApplications({
  initialRole = "mentor",
}: {
  initialRole?: "mentor" | "judge"
}) {
  const t = useTranslations("Account")
  const a = useTranslations("Operations.admin")
  const r = useTranslations("Operations.requests")
  const [items, setItems] = useState<RoleApplication[] | null>(null)
  const [error, setError] = useState("")
  const [loadError, setLoadError] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [attempt, setAttempt] = useState(0)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [role, setRole] = useState<"mentor" | "judge">(initialRole)
  const [status, setStatus] = useState("pending")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const locked = useRef(false)
  const resultsRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (busy) return
    const controller = new AbortController()
    let active = false
    async function refresh() {
      if (active || controller.signal.aborted) return
      active = true
      try {
        const data = await accountApi<RoleApplication[]>(
          "/role-applications",
          undefined,
          controller.signal
        )
        if (!controller.signal.aborted) {
          setItems(data)
          setLoadError("")
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setLoadError(error instanceof Error ? error.message : t("error"))
      } finally {
        active = false
      }
    }
    void refresh()
    const timer = setInterval(() => {
      if (!document.hidden) void refresh()
    }, 15000)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [attempt, busy, t])

  async function review(
    item: RoleApplication,
    decision: "approved" | "rejected"
  ) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const updated = await accountApi<RoleApplication>(
        `/role-applications/${item.id}/review`,
        {
          decision,
          reason: reasons[item.id] ?? item.reason ?? "",
          expectedStatus: item.status,
        }
      )
      setItems(
        (old) =>
          old?.map((current) =>
            current.id === item.id
              ? { ...current, ...updated, user: current.user }
              : current
          ) ?? null
      )
      setReasons((old) => {
        const next = { ...old }
        delete next[item.id]
        return next
      })
      setNotice(
        r("decisionSaved", {
          name: item.user?.name || a("unnamed"),
          status: t(`label_${decision}`),
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : t("error"))
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  const terms = normalize(search).split(/\s+/).filter(Boolean)
  const filtered = (items ?? [])
    .filter(
      (item) =>
        item.role === role &&
        (!status || item.status === status) &&
        terms.every((term) =>
          normalize([item.user?.name, item.user?.email].join(" ")).includes(
            term
          )
        )
    )
    .sort(
      (a, b) =>
        Number(b.status === "pending") - Number(a.status === "pending") ||
        (a.createdAt ?? "").localeCompare(b.createdAt ?? "")
    )
  const pages = Math.max(1, Math.ceil(filtered.length / 6))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * 6, currentPage * 6)

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 sm:gap-5">
      <PageHeader title={t("applicationsTitle")} subtitle={r("hint")} />
      <div
        role="group"
        aria-label={r("requestType")}
        className="grid grid-cols-2 gap-3"
      >
        {(["mentor", "judge"] as const).map((value) => {
          const Icon = value === "mentor" ? Compass : Award
          const count = items?.filter(
            (item) => item.role === value && item.status === "pending"
          ).length
          return (
            <button
              key={value}
              aria-pressed={role === value}
              onClick={() => {
                setRole(value)
                setPage(1)
              }}
              className={`flex min-w-0 items-center gap-2 rounded-xl border p-3 text-start sm:gap-3 sm:p-4 ${role === value ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}
            >
              <Icon
                className={`size-5 shrink-0 ${value === "mentor" ? "text-success" : "text-orange"}`}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{r(value)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {r("pendingCount", { count: count ?? "—" })}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <section
        aria-label={r("filters")}
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <label className="min-w-0 text-xs font-medium">
          {r("search")}
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-[18px] size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              className={`${directoryField} ps-9`}
              maxLength={150}
              placeholder={r("searchHint")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </label>
        <label className="min-w-0 text-xs font-medium">
          {r("status")}
          <select
            value={status}
            className={directoryField}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="pending">{t("label_pending")}</option>
            <option value="approved">{t("label_approved")}</option>
            <option value="rejected">{t("label_rejected")}</option>
            <option value="">{r("allStatuses")}</option>
          </select>
        </label>
      </section>
      {(error || loadError) && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 p-4 text-sm"
        >
          {error || loadError}
          <Button
            variant="outline"
            onClick={() => {
              setError("")
              setAttempt((value) => value + 1)
            }}
            disabled={busy}
          >
            {t("retry")}
          </Button>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-success/25 bg-success/10 p-3 text-sm text-success"
        >
          {notice}
        </p>
      )}
      {!items ? (
        !error &&
        !loadError && (
          <p role="status" className="py-4 text-sm text-muted-foreground">
            {t("loading")}
          </p>
        )
      ) : (
        <>
          <p
            ref={resultsRef}
            tabIndex={-1}
            role="status"
            className="text-xs text-muted-foreground"
          >
            {a("showing", {
              start: filtered.length ? (currentPage - 1) * 6 + 1 : 0,
              end: Math.min(currentPage * 6, filtered.length),
              total: filtered.length,
            })}
          </p>
          {visible.length ? (
            <section aria-label={r(role)} className={directoryGrid}>
              {visible.map((item) => (
                <ApplicationCard
                  key={item.id}
                  item={item}
                  busy={busy}
                  note={reasons[item.id] ?? item.reason ?? ""}
                  onNote={(note) =>
                    setReasons((old) => ({ ...old, [item.id]: note }))
                  }
                  onReview={(decision) => void review(item, decision)}
                />
              ))}
            </section>
          ) : (
            <div className={`${directoryCard} py-8 text-center`}>
              <h2 className="font-semibold">
                {r(status === "pending" && !search ? "noPending" : "noMatches")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {r("emptyHint")}
              </p>
              {(search || status) && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearch("")
                    setStatus("")
                    setPage(1)
                  }}
                >
                  {r("showAll")}
                </Button>
              )}
            </div>
          )}
          <DirectoryPagination
            page={currentPage}
            pages={pages}
            onChange={(next) => {
              setPage(next)
              resultsRef.current?.focus()
            }}
          />
        </>
      )}
    </div>
  )
}

function ApplicationCard({
  item,
  busy,
  note,
  onNote,
  onReview,
}: {
  item: RoleApplication
  busy: boolean
  note: string
  onNote: (note: string) => void
  onReview: (decision: "approved" | "rejected") => void
}) {
  const t = useTranslations("Account")
  const a = useTranslations("Operations.admin")
  const r = useTranslations("Operations.requests")
  const locale = useLocale()
  const name = item.user?.name || a("unnamed")
  const date = item.createdAt ? new Date(item.createdAt) : null
  const tone =
    item.status === "pending"
      ? "text-orange bg-orange/10"
      : item.status === "approved"
        ? "text-success bg-success/10"
        : "text-muted-foreground bg-secondary"

  return (
    <article
      aria-label={name}
      className={`${directoryItem} ${item.role === "mentor" ? "min-h-[28rem]" : "min-h-72"}`}
    >
      <div className="flex min-h-12 items-start justify-between gap-2">
        <h2
          title={name}
          className="line-clamp-2 min-w-0 flex-1 text-base font-semibold [overflow-wrap:anywhere]"
        >
          {name}
        </h2>
        <span className={`shrink-0 rounded-md px-2 py-1 text-xs ${tone}`}>
          {t(`label_${item.status}`)}
        </span>
      </div>
      <ContactEmail email={item.user?.email} compact />
      {date && !Number.isNaN(date.getTime()) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {r("applied")}{" "}
          <time dateTime={item.createdAt}>
            {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
              dateStyle: "medium",
              timeZone: "Africa/Cairo",
            }).format(date)}
          </time>
        </p>
      )}
      {item.role === "mentor" && (
        <ApplicantMentoringProfile userId={item.user?.id} name={name} />
      )}
      <div className="mt-auto pt-4" data-card-footer>
        <div className="border-t border-border pt-3">
          <DirectoryDetails
            title={name}
            description={t("reviewReason")}
            trigger={t("reviewReason")}
          >
            <ContactEmail email={item.user?.email} />
            <textarea
              aria-label={t("reviewReason")}
              rows={4}
              maxLength={1000}
              disabled={busy}
              value={note}
              onChange={(event) => onNote(event.target.value)}
              aria-describedby={`note-help-${item.id}`}
              placeholder={r("notePlaceholder")}
              className="mt-2 block min-h-16 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal"
            />
            <p
              id={`note-help-${item.id}`}
              className="mt-1.5 text-xs leading-relaxed text-muted-foreground"
            >
              {r("noteHint")}
            </p>
          </DirectoryDetails>
          <p className="mt-2 line-clamp-1 text-xs [overflow-wrap:anywhere] text-muted-foreground">
            {note || r("notePlaceholder")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              className="flex-1"
              disabled={busy || item.status === "approved"}
              onClick={() => onReview("approved")}
            >
              {t("approve")}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              disabled={busy || item.status === "rejected"}
              onClick={() => onReview("rejected")}
            >
              {t("reject")}
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function ApplicantMentoringProfile({
  userId,
  name,
}: {
  userId?: string
  name: string
}) {
  const r = useTranslations("Operations.requests")
  const a = useTranslations("Operations.admin")
  const [profile, setProfile] = useState<{
    bio: string | null
    skills: string[]
  } | null>(null)
  const [loading, setLoading] = useState(!!userId)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    void fetch(`/api/profiles/${encodeURIComponent(userId)}`, {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (response) => {
        if (response.status === 404) return null
        if (!response.ok) throw new Error()
        return response.json() as Promise<{
          bio: string | null
          skills: string[]
        }>
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setProfile(data)
          setFailed(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [userId, attempt])
  const topics = [
    ...new Set(profile?.skills.filter((topic) => topic.trim()) ?? []),
  ]
  return (
    <div className="mt-4 flex flex-1 flex-col gap-3">
      {loading ? (
        <p role="status" className="text-xs text-muted-foreground">
          {r("loadingProfile")}
        </p>
      ) : failed ? (
        <p role="alert" className="text-xs text-muted-foreground">
          {r("profileError")}{" "}
          <button
            onClick={() => setAttempt((value) => value + 1)}
            className="text-primary underline"
          >
            {a("retryProfile")}
          </button>
        </p>
      ) : (
        <>
          <div>
            <h3 className="mb-2 text-xs font-semibold text-success">
              {r("mentoringTopics")}
            </h3>
            <div className={directoryTags}>
              {topics.length ? (
                topics.slice(0, 6).map((topic) => (
                  <span
                    key={topic}
                    className="max-w-full truncate rounded-md bg-success/10 px-2 py-1 text-xs text-success"
                  >
                    {topic}
                  </span>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">{a("noTopics")}</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-1.5 text-xs font-semibold">{a("about")}</h3>
            <p className="line-clamp-3 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
              {profile?.bio || a("noBio")}
            </p>
          </div>
          <div className="mt-auto">
            <DirectoryDetails
              title={name}
              description={a("mentorDetails")}
              trigger={r("fullDetails")}
            >
              <section>
                <h3 className="mb-2 text-sm font-semibold">
                  {r("mentoringTopics")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topics.length ? (
                    topics.map((topic) => (
                      <span
                        key={topic}
                        className="max-w-full rounded-md bg-success/10 px-2 py-1 text-xs [overflow-wrap:anywhere] text-success"
                      >
                        {topic}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {a("noTopics")}
                    </p>
                  )}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">{a("about")}</h3>
                <p className="text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
                  {profile?.bio || a("noBio")}
                </p>
              </section>
            </DirectoryDetails>
          </div>
        </>
      )}
    </div>
  )
}
