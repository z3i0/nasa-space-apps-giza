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
  AlertCircle,
  ArrowDown,
  Loader2,
  Maximize2,
  Minimize2,
  SendHorizontal,
  Sparkles,
} from "lucide-react"
import {
  mentorshipApi,
  type MentorshipMessage,
  type MentorshipRequest,
} from "@/lib/mentorship"
import { registerActiveChat } from "@/lib/active-chat"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

function getInitials(name?: string) {
  if (!name) return "U"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface MentorshipChatProps {
  requestId: string
  status: MentorshipRequest["status"]
  userId?: string
  partnerName?: string
  partnerAvatar?: string | null
  partnerRole?: string
  topic?: string
  fullHeight?: boolean
  showHeader?: boolean
  onClose?: () => void
}

// Mount one isolated component per request so late responses can never mix chats.
export function MentorshipChat({
  requestId,
  status,
  userId,
  partnerName,
  partnerAvatar,
  partnerRole,
  topic,
  fullHeight = false,
  showHeader = true,
  onClose,
}: MentorshipChatProps) {
  const t = useTranslations("Mentorship")
  const locale = useLocale()
  const [messages, setMessages] = useState<MentorshipMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)
  const [error, setError] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)

  const scroller = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)
  const prependHeight = useRef<number | null>(null)
  const initialized = useRef(false)
  const sendingLock = useRef(false)
  const olderLock = useRef(false)
  const lifetime = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    return registerActiveChat(requestId)
  }, [requestId])

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

    // Real-time live stream via Server-Sent Events (SSE)
    let es: EventSource | null = null
    try {
      es = new EventSource(`/api/mentorship/requests/${requestId}/stream`, {
        withCredentials: true,
      })

      es.addEventListener("message", (event) => {
        try {
          const incoming = JSON.parse(event.data) as MentorshipMessage
          if (incoming && incoming.id) {
            setMessages((previous) => mergeMessages(previous, [incoming]))
          }
        } catch {
          // Ignore parse errors or non-message events
        }
      })

      es.onerror = () => {
        // EventSource will automatically attempt to reconnect
      }
    } catch {
      // Fallback if EventSource fails to instantiate
    }

    // Refresh messages once when tab becomes visible in case connection was idle
    const onVisibility = () => {
      if (!document.hidden && !controller.signal.aborted) {
        void readLatest(controller.signal)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      controller.abort()
      document.removeEventListener("visibilitychange", onVisibility)
      if (es) {
        es.close()
      }
    }
  }, [readLatest, requestId])

  useLayoutEffect(() => {
    const node = scroller.current
    if (!node) return
    if (prependHeight.current !== null) {
      node.scrollTop += node.scrollHeight - prependHeight.current
      prependHeight.current = null
    } else if (pinned.current) {
      node.scrollTop = node.scrollHeight
    }
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

  async function send(event?: React.FormEvent) {
    if (event) event.preventDefault()
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
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    } catch {
      if (!signal.aborted) setError(t("requestFailed"))
    } finally {
      sendingLock.current = false
      if (!signal.aborted) setSending(false)
    }
  }

  const formatMessageTime = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))

  const formatMessageDate = (value: string) => {
    const date = new Date(value)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return t("today")
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return t("yesterday")
    }

    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      dateStyle: "medium",
      timeZone: "Africa/Cairo",
    }).format(date)
  }

  const scrollToBottom = () => {
    const node = scroller.current
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
      pinned.current = true
      setShowScrollBottom(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value)
    const target = e.target
    target.style.height = "auto"
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`
  }

  const chatContent = (
    <div
      className={cn(
        "flex flex-col min-w-0 w-full bg-background transition-all",
        fullHeight || isFullscreen
          ? "h-full flex-1 min-h-0"
          : "rounded-xl border border-border overflow-hidden"
      )}
    >
      {/* Chat Header */}
      {showHeader && (
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/60 px-4 py-3 backdrop-blur-xs">
          <div className="flex items-center gap-3 min-w-0">
            {partnerName ? (
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="size-9 border border-border shadow-xs">
                  {partnerAvatar && (
                    <AvatarImage src={partnerAvatar} alt={partnerName} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                    {getInitials(partnerName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate leading-tight">
                      {partnerName}
                    </h3>
                    {partnerRole && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {partnerRole}
                      </Badge>
                    )}
                  </div>
                  {topic && (
                    <p className="text-xs text-muted-foreground truncate max-w-xs md:max-w-md">
                      {topic}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="min-w-0">
                <h4 className="text-sm font-semibold">{t("conversation")}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {t("chatAccess")}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!fullHeight && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? t("collapseChat") : t("expandChat")}
                aria-label={isFullscreen ? t("collapseChat") : t("expandChat")}
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </Button>
            )}
            {onClose && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={onClose}
                aria-label={t("closeChat")}
              >
                &times;
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error alert if any */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive"
        >
          <AlertCircle className="size-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => lifetime.current && void readLatest(lifetime.current.signal)}
          >
            {t("retry")}
          </Button>
        </div>
      )}

      {/* Load Older Messages Banner */}
      {hasOlder && (
        <div className="flex justify-center border-b border-border/50 bg-secondary/30 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loadingOlder}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => void older()}
          >
            {loadingOlder && <Loader2 className="me-1.5 size-3 animate-spin" />}
            {t("older")}
          </Button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        className={cn(
          "relative min-w-0 w-full",
          fullHeight || isFullscreen
            ? "flex-1 min-h-0"
            : "h-[min(26rem,60vh)] min-h-[14rem]"
        )}
      >
        <div
          ref={scroller}
          role="log"
          aria-label={t("conversation")}
          aria-live="polite"
          aria-relevant="additions"
          tabIndex={0}
          onScroll={() => {
            const node = scroller.current
            if (node) {
              const distanceToBottom =
                node.scrollHeight - node.scrollTop - node.clientHeight
              pinned.current = distanceToBottom < 80
              setShowScrollBottom(distanceToBottom > 240)
            }
          }}
          className={cn(
            "overflow-x-hidden overflow-y-auto overscroll-contain p-4 md:p-5 flex flex-col gap-4 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-border",
            fullHeight || isFullscreen ? "absolute inset-0" : "h-full w-full"
          )}
        >
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm">{t("loading")}</p>
            </div>
          ) : messages.length ? (
            messages.map((item, index) => {
              const isMe = item.senderId === userId
              const prevItem = index > 0 ? messages[index - 1] : null
              const showDateHeader =
                !prevItem ||
                new Date(item.createdAt).toDateString() !==
                  new Date(prevItem.createdAt).toDateString()

              return (
                <div key={item.id} className="flex flex-col gap-3">
                  {showDateHeader && (
                    <div className="my-2 flex items-center justify-center">
                      <span className="rounded-full border border-border/60 bg-muted/60 px-3 py-0.5 text-[11px] font-medium text-muted-foreground shadow-2xs">
                        {formatMessageDate(item.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex gap-2.5 items-end max-w-[88%] md:max-w-[75%]",
                      isMe ? "ms-auto flex-row-reverse" : "me-auto"
                    )}
                  >
                    {!isMe && (
                      <Avatar className="size-7 shrink-0 border border-border shadow-2xs">
                        {item.sender.avatar && (
                          <AvatarImage
                            src={item.sender.avatar}
                            alt={item.sender.name}
                          />
                        )}
                        <AvatarFallback className="bg-secondary text-[10px] font-medium text-secondary-foreground">
                          {getInitials(item.sender.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="flex flex-col gap-1 min-w-0">
                      <div
                        className={cn(
                          "flex items-center gap-2 px-1 text-[11px] text-muted-foreground",
                          isMe ? "justify-end" : "justify-start"
                        )}
                      >
                        <span className="font-medium text-foreground/80">
                          {item.sender.name}
                        </span>
                        <span>·</span>
                        <span>{formatMessageTime(item.createdAt)}</span>
                      </div>

                      <div
                        className={cn(
                          "rounded-2xl p-3.5 text-sm leading-relaxed [overflow-wrap:anywhere] shadow-xs",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-ee-xs"
                            : "bg-card border border-border text-foreground rounded-es-xs"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{item.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-6" />
              </div>
              <div className="max-w-xs space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t("emptyMessages")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("chatAccess")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Jump to Bottom Button */}
        {showScrollBottom && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={scrollToBottom}
            className="absolute bottom-4 end-4 z-10 size-8 rounded-full border border-border p-0 shadow-md transition-all hover:scale-105"
            aria-label="Scroll to latest messages"
          >
            <ArrowDown className="size-4" />
          </Button>
        )}
      </div>

      {/* Message Composer */}
      {["pending", "accepted"].includes(status) && (
        <form
          className="shrink-0 border-t border-border bg-card p-2.5 sm:p-3 sticky bottom-0 z-20 shadow-xs"
          onSubmit={send}
        >
          <div className="relative flex items-end gap-2 rounded-xl border border-input/60 bg-background p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
            <textarea
              ref={textareaRef}
              required
              maxLength={2000}
              rows={1}
              value={draft}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              className="min-h-9 max-h-28 w-full resize-none border-0 bg-transparent px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none [field-sizing:content]"
              placeholder={t("writeMessage")}
              aria-label={t("writeMessage")}
            />
            <Button
              type="submit"
              size="sm"
              disabled={sending || !draft.trim()}
              className="h-9 shrink-0 gap-1.5 rounded-lg px-3.5 text-xs font-semibold"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
              <span>{t("send")}</span>
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground/80 hidden sm:block">
            {t("pressEnterToSend")}
          </p>
        </form>
      )}
    </div>
  )

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background/95 p-3 md:p-6 backdrop-blur-md animate-in fade-in-0 duration-150">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {chatContent}
        </div>
      </div>
    )
  }

  return (
    <section
      className={cn(
        "min-w-0",
        fullHeight
          ? "h-full flex flex-col flex-1 min-h-0"
          : "mt-4 border-t border-border pt-4"
      )}
      aria-label={t("conversation")}
    >
      {!fullHeight && !showHeader && (
        <div className="mb-3">
          <h4 className="font-semibold">{t("conversation")}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("chatAccess")}</p>
        </div>
      )}
      {chatContent}
    </section>
  )
}
