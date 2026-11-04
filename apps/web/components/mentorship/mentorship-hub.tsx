"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuthUser } from "@/lib/auth"
import {
  MentorshipApiError,
  mentorshipApi,
  type Mentor,
  type MentorshipRequest,
} from "@/lib/mentorship"
import { MentorshipChat } from "./mentorship-chat"
import { MentorDirectory } from "./mentor-directory"
const card = "rounded-2xl border border-border bg-card p-5"
const secondary =
  "rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground hover:border-primary disabled:opacity-50"
export function MentorshipHub() {
  const t = useTranslations("Mentorship")
  const locale = useLocale()
  const user = useAuthUser()
  const userId = user?.id
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [requests, setRequests] = useState<MentorshipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const mutationLock = useRef(false)
  const [error, setError] = useState("")
  const [openRequest, setOpenRequest] = useState<string | null>(null)
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [mentorList, requestList] = await Promise.all([
          mentorshipApi<Mentor[]>("/mentors", { signal }),
          mentorshipApi<MentorshipRequest[]>("/requests", { signal }),
        ])
        if (!signal?.aborted) {
          setMentors(mentorList)
          setRequests(requestList)
          setError("")
        }
      } catch {
        if (!signal?.aborted) setError(t("error"))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [t]
  )
  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => refresh(controller.signal))
    return () => controller.abort()
  }, [refresh])
  async function act(action: () => Promise<unknown>, teamRequest = false) {
    if (mutationLock.current) return false
    mutationLock.current = true
    setBusy(true)
    setError("")
    try {
      await action()
      await refresh()
      return true
    } catch (cause) {
      setError(
        teamRequest &&
          cause instanceof MentorshipApiError &&
          cause.status === 400
          ? t("noTeam")
          : t("requestFailed")
      )
      return false
    } finally {
      mutationLock.current = false
      setBusy(false)
    }
  }
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t("participantTitle")}
        subtitle={t("participantSubtitle")}
      />
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          {error}{" "}
          <button className="ms-3 underline" onClick={() => void refresh()}>
            {t("retry")}
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : (
        <>
          <MentorDirectory
            mentors={mentors}
            requests={requests}
            busy={busy}
            requestError={error}
            onRequest={(mentorId, message) =>
              act(
                () =>
                  mentorshipApi("/requests", {
                    method: "POST",
                    body: { mentorId, message },
                  }),
                true
              )
            }
          />
          <section id="mentorship-requests" className="scroll-mt-24">
            <h2 className="mb-3 text-xl font-semibold">{t("requests")}</h2>
            <div className="grid gap-4">
              {requests.length ? (
                requests.map((request) => (
                  <article
                    key={request.id}
                    id={`mentorship-request-${request.id}`}
                    className={`${card} scroll-mt-24`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{request.mentor.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.topic}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {time(request.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-primary">
                        {t(request.status)}
                      </span>
                    </div>
                    {request.slot && (
                      <p className="mt-3 text-sm text-primary">
                        {time(request.slot.startTime)}
                      </p>
                    )}
                    {["accepted", "completed"].includes(request.status) && (
                      <div className="mt-4 rounded-xl border border-border bg-background p-4">
                        <h4 className="text-sm font-semibold">{t("notes")}</h4>
                        {
                          <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
                            {request.sessionNotes || t("noNotes")}
                          </p>
                        }
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {["pending", "accepted"].includes(request.status) && (
                        <button
                          disabled={busy}
                          className={secondary}
                          onClick={() =>
                            void act(() =>
                              mentorshipApi(`/requests/${request.id}`, {
                                method: "PATCH",
                                body: { status: "canceled" },
                              })
                            )
                          }
                        >
                          {t("cancel")}
                        </button>
                      )}

                      <button
                        className={secondary}
                        onClick={() => {
                          setOpenRequest(
                            openRequest === request.id ? null : request.id
                          )
                        }}
                      >
                        {t(
                          openRequest === request.id ? "closeChat" : "openChat"
                        )}
                      </button>
                    </div>
                    {request.status === "accepted" &&
                      !request.slot &&
                      !!request.mentor.mentorSlots.length && (
                        <div className="mt-4 border-t border-border pt-4">
                          <h4 className="text-sm font-semibold">
                            {t("slots")}
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {request.mentor.mentorSlots.map((item) => (
                              <button
                                key={item.id}
                                disabled={busy}
                                className={secondary}
                                onClick={() =>
                                  void act(() =>
                                    mentorshipApi(`/slots/${item.id}/book`, {
                                      method: "POST",
                                      body: { requestId: request.id },
                                    })
                                  )
                                }
                              >
                                {t("book")}: {time(item.startTime)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    {openRequest === request.id && (
                      <MentorshipChat
                        key={request.id}
                        requestId={request.id}
                        status={request.status}
                        userId={userId}
                      />
                    )}
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-border p-5 text-sm text-muted-foreground">
                  {t("noRequests")}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
