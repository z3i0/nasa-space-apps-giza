"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  mentorshipApi,
  type MentorshipMessage,
  type MentorshipRequest,
} from "@/lib/mentorship"

function mergeMessages(
  previous: MentorshipMessage[],
  incoming: MentorshipMessage[]
) {
  const byId = new Map(previous.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  )
}

// Mount one isolated component per request so late responses can never mix chats.
export function MentorshipChat({
  requestId,
  status,
  userId,
}: {
  requestId: string
  status: MentorshipRequest["status"]
  userId?: string
}) {
  const t = useTranslations("Mentorship")
  const locale = useLocale()
  const [messages, setMessages] = useState<MentorshipMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)
  const [error, setError] = useState("")
  const scroller = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)
  const prependHeight = useRef<number | null>(null)
  const initialized = useRef(false)
  const sendingLock = useRef(false)
  const olderLock = useRef(false)
  const lifetime = useRef<AbortController | null>(null)

  const readLatest = useCallback(
    async (signal: AbortSignal) => {
      try {
        const latest = await mentorshipApi<MentorshipMessage[]>(
          `/requests/${requestId}/messages`,
          { signal }
        )
        if (signal.aborted) return
        if (!initialized.current) {
          setHasOlder(latest.length === 50)
          initialized.current = true
        }
        setMessages((previous) => mergeMessages(previous, latest))
        setError("")
      } catch {
        if (!signal.aborted) setError(t("error"))
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [requestId, t]
  )

  useEffect(() => {
    const controller = new AbortController()
    lifetime.current = controller
    void Promise.resolve().then(() => readLatest(controller.signal))
    const timer = window.setInterval(() => {
      if (!document.hidden) void readLatest(controller.signal)
    }, 5000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [readLatest])

  useLayoutEffect(() => {
    const node = scroller.current
    if (!node) return
    if (prependHeight.current !== null) {
      node.scrollTop += node.scrollHeight - prependHeight.current
      prependHeight.current = null
    } else if (pinned.current) node.scrollTop = node.scrollHeight
  }, [messages])

  async function older() {
    const signal = lifetime.current?.signal
    if (!signal || !messages.length || olderLock.current) return
    olderLock.current = true
    setLoadingOlder(true)
    try {
      const items = await mentorshipApi<MentorshipMessage[]>(
        `/requests/${requestId}/messages?before=${encodeURIComponent(messages[0].id)}`,
        { signal }
      )
      if (signal.aborted) return
      prependHeight.current = scroller.current?.scrollHeight ?? null
      setMessages((previous) => mergeMessages(previous, items))
      setHasOlder(items.length === 50)
    } catch {
      if (!signal.aborted) setError(t("error"))
    } finally {
      olderLock.current = false
      if (!signal.aborted) setLoadingOlder(false)
    }
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const signal = lifetime.current?.signal
    if (!signal || !draft.trim() || sendingLock.current) return
    sendingLock.current = true
    setSending(true)
    setError("")
    try {
      const sent = await mentorshipApi<MentorshipMessage>(
        `/requests/${requestId}/messages`,
        { method: "POST", body: { content: draft.trim() }, signal }
      )
      if (signal.aborted) return
      pinned.current = true
      setMessages((previous) => mergeMessages(previous, [sent]))
      setDraft("")
    } catch {
      if (!signal.aborted) setError(t("requestFailed"))
    } finally {
      sendingLock.current = false
      if (!signal.aborted) setSending(false)
    }
  }

  const time = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))
  return (
    <section
      className="mt-4 min-w-0 border-t border-[#2a3950] pt-4"
      aria-label={t("conversation")}
    >
      <h4 className="font-semibold">{t("conversation")}</h4>
      <p className="mt-1 text-xs text-[#a8b5ca]">{t("chatAccess")}</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {hasOlder && (
        <button
          type="button"
          disabled={loadingOlder}
          className="mt-3 rounded-xl border border-[#2a3950] bg-[#172439] px-4 py-2 text-sm disabled:opacity-50"
          onClick={() => void older()}
        >
          {t("older")}
        </button>
      )}
      <div
        ref={scroller}
        role="log"
        aria-label={t("conversation")}
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        onScroll={() => {
          const node = scroller.current
          if (node)
            pinned.current =
              node.scrollHeight - node.scrollTop - node.clientHeight < 60
        }}
        className="mt-3 h-[min(26rem,60vh)] min-h-48 min-w-0 [scrollbar-gutter:stable] space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl bg-[#080d20] p-4"
      >
        {loading ? (
          <p className="text-sm text-[#a8b5ca]">{t("loading")}</p>
        ) : messages.length ? (
          messages.map((item) => (
            <div
              key={item.id}
              className={`w-fit max-w-[90%] rounded-xl p-3 text-sm [overflow-wrap:anywhere] ${item.senderId === userId ? "ms-auto bg-[#173c49]" : "bg-[#172439]"}`}
            >
              <p className="mb-1 text-xs font-semibold text-[#7df4ff]">
                {item.sender.name} · {time(item.createdAt)}
              </p>
              <p className="whitespace-pre-wrap">{item.content}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#a8b5ca]">{t("emptyMessages")}</p>
        )}
      </div>
      {["pending", "accepted"].includes(status) && (
        <form className="mt-3 flex min-w-0 gap-2" onSubmit={send}>
          <input
            required
            maxLength={2000}
            className="min-w-0 flex-1 rounded-xl border border-[#2a3950] bg-[#080d20] px-3 py-2 text-sm"
            placeholder={t("writeMessage")}
            aria-label={t("writeMessage")}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-xl bg-[#fb9746] px-4 py-2 text-sm font-semibold text-[#080d20] disabled:opacity-50"
          >
            {t("send")}
          </button>
        </form>
      )}
    </section>
  )
}
