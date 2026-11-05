"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Clock3, MessageSquare, RefreshCw, Users } from "lucide-react"
import { Link } from "@/i18n/routing"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button, buttonVariants } from "@/components/ui/button"
import { useAuthUser } from "@/lib/auth"
import {
  MentorshipApiError,
  mentorshipApi,
  type Mentor,
  type MentorshipMessage,
  type MentorshipRequest,
} from "@/lib/mentorship"
import {
  MentorOverview,
  mentorRequestHref,
  type MentorMessagePreview,
} from "./mentor-overview"
import { MentorRequestCard, type MentorMutation } from "./mentor-request-card"
import { MentorProfileEditor, MentorOfficeHours } from "./mentor-editors"
import { MentorshipChatWorkspace } from "./mentorship-chat-workspace"
import styles from "./mentor-workspace.module.css"

type MentorView =
  | "overview"
  | "profile"
  | "requests"
  | "teams"
  | "sessions"
  | "history"
  | "office-hours"
  | "feedback"

export function MentorWorkspace({ view }: { view: MentorView }) {
  const t = useTranslations("Mentorship")
  const w = useTranslations("Mentorship.workspace")
  const user = useAuthUser()
  const userId = user?.id
  const [mentor, setMentor] = useState<Mentor>()
  const [requests, setRequests] = useState<MentorshipRequest[]>([])
  const [messages, setMessages] = useState<MentorMessagePreview[]>([])
  const [messagesLoading, setMessagesLoading] = useState(view === "overview")
  const [messagesError, setMessagesError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [conversation, setConversation] = useState<string | null>(null)
  const [historyFilter, setHistoryFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"cards" | "workspace">("cards")
  const lifetime = useRef<AbortController | null>(null)
  const mutationLock = useRef(false)
  const refreshVersion = useRef(0)

  const refresh = useCallback(
    async (signal: AbortSignal) => {
      if (!userId || signal.aborted) return
      const version = ++refreshVersion.current
      try {
        const [mentors, allRequests] = await Promise.all([
          mentorshipApi<Mentor[]>("/mentors", { signal }),
          mentorshipApi<MentorshipRequest[]>("/requests", { signal }),
        ])
        if (signal.aborted || version !== refreshVersion.current) return
        // The API also includes requests from any participant team the account joined.
        const ownRequests = allRequests.filter(
          (request) => request.mentorId === userId
        )
        setMentor(
          mentors.find((item) => item.id === userId) || ownRequests[0]?.mentor
        )
        setRequests(ownRequests)
        setNow(Date.now())
        setLoaded(true)
        setError("")
        setLoading(false)
        if (view === "overview") {
          const recent = ownRequests
            .filter((request) => request.status === "accepted")
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, 6)
          const results = await Promise.allSettled(
            recent.map(async (request) => {
              const thread = await mentorshipApi<MentorshipMessage[]>(
                `/requests/${request.id}/messages`,
                { signal }
              )
              const latest = [...thread].sort(
                (a, b) =>
                  b.createdAt.localeCompare(a.createdAt) ||
                  b.id.localeCompare(a.id)
              )[0]
              return latest && latest.senderId !== userId
                ? { request, message: latest }
                : null
            })
          )
          if (signal.aborted || version !== refreshVersion.current) return
          setMessages(
            results
              .flatMap((result) =>
                result.status === "fulfilled" && result.value
                  ? [result.value]
                  : []
              )
              .sort((a, b) =>
                b.message.createdAt.localeCompare(a.message.createdAt)
              )
          )
          setMessagesError(
            results.some((result) => result.status === "rejected")
          )
          setMessagesLoading(false)
        }
      } catch {
        if (!signal.aborted && version === refreshVersion.current)
          setError(t("error"))
      } finally {
        if (!signal.aborted && version === refreshVersion.current)
          setLoading(false)
      }
    },
    [userId, view, t]
  )

  useEffect(() => {
    const controller = new AbortController()
    lifetime.current = controller
    void Promise.resolve().then(() => refresh(controller.signal))
    const updateConversation = () => {
      const params = new URLSearchParams(window.location.search)
      const conv = params.get("conversation")
      if (conv) {
        setConversation(conv)
        if (params.get("workspace") === "true") {
          setViewMode("workspace")
        }
      }
    }
    updateConversation()
    window.addEventListener("popstate", updateConversation)
    const onOpenChat = (event: Event) => {
      const detail = (
        event as CustomEvent<{ requestId?: string; workspace?: boolean }>
      ).detail
      if (detail?.requestId) {
        setConversation(detail.requestId)
        if (detail.workspace !== false) {
          setViewMode("workspace")
        }
      }
    }
    window.addEventListener("open-mentorship-chat", onOpenChat)
    const timer =
      view === "overview"
        ? window.setInterval(() => {
            if (!document.hidden && !mutationLock.current)
              void refresh(controller.signal)
          }, 30000)
        : undefined
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener("popstate", updateConversation)
      window.removeEventListener("open-mentorship-chat", onOpenChat)
    }
  }, [refresh, view])

  useEffect(() => {
    if (conversation && !loading)
      document
        .getElementById(`mentorship-request-${conversation}`)
        ?.scrollIntoView({ block: "start" })
  }, [conversation, loading])

  const mutate: MentorMutation = async (path, method, body) => {
    const signal = lifetime.current?.signal
    if (!signal || mutationLock.current) return false
    mutationLock.current = true
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await mentorshipApi(path, { method, body, signal })
      if (signal.aborted) return false
      setNotice(w("changesSaved"))
      await refresh(signal)
      return true
    } catch (cause) {
      if (!signal.aborted)
        setError(
          cause instanceof MentorshipApiError && cause.status === 409
            ? w("conflict")
            : t("requestFailed")
        )
      return false
    } finally {
      mutationLock.current = false
      if (!signal.aborted) setBusy(false)
    }
  }
  const active = requests.filter((request) => request.status === "accepted")
  const filtered = requests
    .filter((request) => {
      if (view === "requests") return request.status === "pending"
      if (view === "sessions") return request.status === "accepted"
      if (view === "feedback")
        return ["accepted", "completed"].includes(request.status)
      return (
        ["completed", "declined", "canceled"].includes(request.status) &&
        (historyFilter === "all" || request.status === historyFilter)
      )
    })
    .sort((a, b) =>
      view === "sessions"
        ? (a.slot?.startTime || "9999").localeCompare(
            b.slot?.startTime || "9999"
          )
        : b.updatedAt.localeCompare(a.updatedAt)
    )
  const teams = [
    ...new Map(active.map((request) => [request.teamId, request])).values(),
  ]
  const name =
    mentor?.name || user?.name || user?.fullName || t("directory.mentorLabel")

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title={w(`pages.${view}.title`)}
        subtitle={w(`pages.${view}.description`)}
        actions={
          view === "overview" ? (
            <Link
              href="/dashboard/mentor/office-hours"
              className={buttonVariants({ variant: "outline" })}
            >
              <Clock3 aria-hidden="true" />
              {w("manageHours")}
            </Link>
          ) : view === "sessions" || view === "requests" ? (
            <Button
              variant={viewMode === "workspace" ? "default" : "outline"}
              onClick={() =>
                setViewMode(viewMode === "workspace" ? "cards" : "workspace")
              }
              className="gap-2"
            >
              <MessageSquare className="size-4" />
              {viewMode === "workspace" ? t("tabs.requests") : t("fullPageChat")}
            </Button>
          ) : undefined
        }
      />
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          <span>{error}</span>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              lifetime.current && void refresh(lifetime.current.signal)
            }
          >
            <RefreshCw aria-hidden="true" />
            {t("retry")}
          </Button>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className={styles.empty}>
          {t("loading")}
        </p>
      ) : (
        loaded && (
          <>
            {view === "overview" && (
              <MentorOverview
                now={now}
                mentor={mentor}
                name={name}
                requests={requests}
                messages={messages}
                messagesLoading={messagesLoading}
                messagesError={messagesError}
              />
            )}
            {view === "profile" &&
              (mentor ? (
                <MentorProfileEditor
                  key={mentor.id}
                  mentor={mentor}
                  busy={busy}
                  mutate={mutate}
                />
              ) : (
                <p className={styles.empty}>{w("profileUnavailable")}</p>
              ))}
            {view === "office-hours" &&
              (mentor ? (
                <MentorOfficeHours
                  now={now}
                  mentor={mentor}
                  busy={busy}
                  mutate={mutate}
                />
              ) : (
                <p className={styles.empty}>{w("profileUnavailable")}</p>
              ))}
            {view === "teams" && (
              <div className="grid gap-4 lg:grid-cols-2">
                {teams.length ? (
                  teams.map((request) => (
                    <article
                      key={request.teamId}
                      aria-label={request.team.name}
                      className={`${styles.panel} ${styles.mint}`}
                    >
                      <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-success/15 text-success">
                        <Users className="size-5" aria-hidden="true" />
                      </div>
                      <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">
                        {request.team.name}
                      </h2>
                      <p className={`mt-2 line-clamp-3 ${styles.muted}`}>
                        {request.topic}
                      </p>
                      <p className="mt-4 text-xs font-medium text-success">
                        {request.slot
                          ? w("sessionBooked")
                          : w("awaitingBooking")}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={mentorRequestHref(request)}
                          className={buttonVariants({ variant: "secondary" })}
                        >
                          {t("openChat")}
                        </Link>
                        <Link
                          href={`/dashboard/mentor/feedback#mentorship-request-${request.id}`}
                          className={styles.link}
                        >
                          {w("writeNotes")}
                        </Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className={`${styles.panel} ${styles.empty}`}>
                    {w("emptyTeams")}
                  </p>
                )}
              </div>
            )}
            {["requests", "sessions", "history", "feedback"].includes(view) && (
              <>
                {view === "history" && (
                  <label className="max-w-xs text-sm font-medium">
                    {w("filterHistory")}
                    <select
                      className={styles.field}
                      value={historyFilter}
                      onChange={(event) => setHistoryFilter(event.target.value)}
                    >
                      <option value="all">{w("allHistory")}</option>
                      {(["completed", "declined", "canceled"] as const).map(
                        (status) => (
                          <option key={status} value={status}>
                            {t(status)}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                )}
                {view === "sessions" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <p>{w("cairoTime")}</p>
                    <Link
                      href="/dashboard/mentor/office-hours"
                      className={styles.link}
                    >
                      {w("manageHours")}
                    </Link>
                  </div>
                )}
                {viewMode === "workspace" && (view === "sessions" || view === "requests") ? (
                  <MentorshipChatWorkspace
                    requests={requests}
                    userId={userId}
                    role="mentor"
                    selectedRequestId={conversation}
                    onSelectRequest={setConversation}
                  />
                ) : (
                  <div className="grid gap-4">
                    {filtered.length ? (
                      filtered.map((request) => (
                        <MentorRequestCard
                          key={`${request.id}-${conversation === request.id}`}
                          request={request}
                          userId={userId}
                          busy={busy}
                          mutate={mutate}
                          notesOnly={view === "feedback"}
                          initiallyOpen={conversation === request.id}
                          onOpenWorkspace={(id) => {
                            setConversation(id)
                            setViewMode("workspace")
                          }}
                        />
                      ))
                    ) : (
                      <div className={styles.panel}>
                        <p className={styles.empty}>{w(`empty.${view}`)}</p>
                        {view === "requests" && (
                          <Link
                            href="/dashboard/mentor/teams"
                            className={styles.link}
                          >
                            {w("viewTeams")}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )
      )}
    </div>
  )
}
