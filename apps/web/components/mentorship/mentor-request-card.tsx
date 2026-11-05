"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { CalendarDays, Maximize2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MentorshipChat } from "./mentorship-chat"
import type { MentorshipRequest } from "@/lib/mentorship"
import styles from "./mentor-workspace.module.css"

export type MentorMutation = (
  path: string,
  method: string,
  body?: unknown
) => Promise<boolean>

export function MentorRequestCard({
  request,
  userId,
  busy,
  mutate,
  notesOnly = false,
  initiallyOpen = false,
  onOpenWorkspace,
}: {
  request: MentorshipRequest
  userId?: string
  busy: boolean
  mutate: MentorMutation
  notesOnly?: boolean
  initiallyOpen?: boolean
  onOpenWorkspace?: (requestId: string) => void
}) {
  const t = useTranslations("Mentorship")
  const w = useTranslations("Mentorship.workspace")
  const locale = useLocale()
  const [chatOpen, setChatOpen] = useState(initiallyOpen)
  const [notes, setNotes] = useState(request.sessionNotes || "")
  const [saved, setSaved] = useState(false)
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))
  const tones = {
    pending: "bg-orange/15 text-orange",
    accepted: "bg-success/15 text-success",
    completed: "bg-primary/15 text-primary",
    declined: "bg-chart-5/15 text-chart-5",
    canceled: "bg-secondary text-muted-foreground",
  }
  return (
    <article
      id={`mentorship-request-${request.id}`}
      aria-label={request.team.name}
      className={`${styles.panel} scroll-mt-24`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold [overflow-wrap:anywhere]">
            {request.team.name}
          </h2>
          <p
            className={`mt-2 [overflow-wrap:anywhere] whitespace-pre-wrap ${styles.muted}`}
          >
            {request.topic}
          </p>
        </div>
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${tones[request.status]}`}
        >
          {t(request.status)}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {w("requestedOn", { date: time(request.createdAt) })}
      </p>
      {request.slot ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-primary">
          <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {time(request.slot.startTime)} – {time(request.slot.endTime)}
        </p>
      ) : (
        request.status === "accepted" && (
          <p className="mt-3 text-sm text-orange">{w("awaitingBooking")}</p>
        )
      )}
      {notesOnly ? (
        <form
          className="mt-5"
          onSubmit={async (event) => {
            event.preventDefault()
            if (
              await mutate(`/requests/${request.id}/notes`, "PUT", {
                content: notes,
              })
            )
              setSaved(true)
          }}
        >
          <label className="text-sm font-medium">
            {t("notes")}
            <textarea
              maxLength={2000}
              rows={4}
              className={styles.field}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value)
                setSaved(false)
              }}
            />
          </label>
          <div className="mt-3 flex items-center gap-3">
            <Button disabled={busy || saved} type="submit">
              {t("saveNotes")}
            </Button>
            {saved && (
              <p role="status" className="text-sm text-success">
                {t("notesSaved")}
              </p>
            )}
          </div>
        </form>
      ) : (
        <>
          {request.status === "completed" && request.sessionNotes && (
            <div className="mt-4 rounded-xl bg-background p-4">
              <h3 className="text-sm font-medium">{t("notes")}</h3>
              <p
                className={`mt-2 [overflow-wrap:anywhere] whitespace-pre-wrap ${styles.muted}`}
              >
                {request.sessionNotes}
              </p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {request.status === "pending" && (
              <>
                <Button
                  disabled={busy}
                  onClick={() =>
                    void mutate(`/requests/${request.id}`, "PATCH", {
                      status: "accepted",
                    })
                  }
                >
                  {t("accept")}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void mutate(`/requests/${request.id}`, "PATCH", {
                      status: "declined",
                    })
                  }
                >
                  {t("decline")}
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              aria-expanded={chatOpen}
              aria-controls={`mentor-chat-${request.id}`}
              onClick={() => setChatOpen((value) => !value)}
            >
              <MessageCircle aria-hidden="true" />
              {t(chatOpen ? "closeChat" : "openChat")}
            </Button>
            {onOpenWorkspace && (
              <Button
                variant="outline"
                onClick={() => onOpenWorkspace(request.id)}
                className="gap-1.5"
              >
                <Maximize2 className="size-4" aria-hidden="true" />
                {t("fullPageChat")}
              </Button>
            )}
            {request.status === "accepted" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void mutate(`/requests/${request.id}`, "PATCH", {
                    status: "completed",
                  })
                }
              >
                {t("complete")}
              </Button>
            )}
          </div>
          {chatOpen && (
            <div id={`mentor-chat-${request.id}`}>
              <MentorshipChat
                requestId={request.id}
                status={request.status}
                userId={userId}
                partnerName={request.team.name}
                partnerRole="Team"
                topic={request.topic}
              />
            </div>
          )}
        </>
      )}
    </article>
  )
}
