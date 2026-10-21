"use client"

import { useEffect, useState, useCallback } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Bell,
  Check,
  CheckCheck,
  Compass,
  ExternalLink,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import { Link, useRouter } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  accountApi,
  type NotificationItem,
  type NotificationsResponse,
} from "@/lib/account"
import { cn } from "@/lib/utils"

export function NotificationsCenter() {
  const t = useTranslations("Dashboard.notificationsCenter")
  const locale = useLocale()
  const router = useRouter()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [error, setError] = useState("")

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await accountApi<NotificationsResponse>("/notifications")
      setNotifications(res.notifications || [])
      setUnreadCount(res.unreadCount || 0)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const handleMarkAllRead = async () => {
    try {
      await accountApi("/notifications/mark-read", {})
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // ignore
    }
  }

  const handleMarkSingleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await accountApi("/notifications/mark-read", { id })
      setUnreadCount((c) => Math.max(0, c - 1))
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await accountApi(`/notifications/${id}`, undefined)
      const target = notifications.find((n) => n.id === id)
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1))
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch {
      // ignore
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mentorship":
        return <Compass className="size-4 text-sky-500" />
      case "team_join":
        return <UserPlus className="size-4 text-emerald-500" />
      case "team_invite":
        return <Users className="size-4 text-purple-500" />
      case "role_application":
        return <Shield className="size-4 text-amber-500" />
      default:
        return <Bell className="size-4 text-primary" />
    }
  }

  const filtered = notifications.filter((item) =>
    filter === "unread" ? !item.isRead : true
  )

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Page Header */}
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("title")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadNotifications()}
              disabled={loading}
              className="h-9 gap-1.5 rounded-xl text-xs"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              <span>{t("refresh")}</span>
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleMarkAllRead()}
                className="h-9 gap-1.5 rounded-xl text-xs font-semibold"
              >
                <CheckCheck className="size-3.5" />
                <span>{t("markAllAsRead")}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className="h-9 rounded-xl px-4 text-xs font-semibold"
        >
          {t("all")} ({notifications.length})
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
          className="h-9 rounded-xl px-4 text-xs font-semibold"
        >
          {t("unread")} ({unreadCount})
        </Button>
      </div>

      {/* Content Card */}
      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading && !notifications.length ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8">
            <RefreshCw className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadNotifications()}
              className="mt-2 rounded-xl"
            >
              {t("retry")}
            </Button>
          </div>
        ) : !filtered.length ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center">
            <Bell className="size-8 text-muted-foreground/50" />
            <h3 className="text-base font-semibold">{t("emptyTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("emptyDesc")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((item) => {
              const title =
                locale === "ar" && item.titleAr ? item.titleAr : item.title
              const message =
                locale === "ar" && item.messageAr
                  ? item.messageAr
                  : item.message

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) {
                      void accountApi("/notifications/mark-read", {
                        id: item.id,
                      })
                      setUnreadCount((c) => Math.max(0, c - 1))
                      setNotifications((prev) =>
                        prev.map((n) =>
                          n.id === item.id ? { ...n, isRead: true } : n
                        )
                      )
                    }
                    if (item.link) {
                      router.push(item.link)
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-start justify-between gap-4 p-4 transition-colors hover:bg-muted/30 sm:p-5",
                    !item.isRead && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                      {getTypeIcon(item.type)}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          {title}
                        </h4>
                        {!item.isRead && (
                          <span className="size-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {message}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                        <span>
                          {new Date(item.createdAt).toLocaleString(
                            locale === "ar" ? "ar-EG" : "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                        {item.link && (
                          <span className="inline-flex items-center gap-1 font-medium text-primary">
                            <span>{t("viewAction")}</span>
                            <ExternalLink className="size-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!item.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => void handleMarkSingleRead(item.id, e)}
                        title={t("markRead")}
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Check className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => void handleDelete(item.id, e)}
                      title={t("delete")}
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
