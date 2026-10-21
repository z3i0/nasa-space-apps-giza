"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Compass,
  ExternalLink,
  Eye,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  Timer,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  accountApi,
  type RequestsTrackingResponse,
  type UnifiedRequestItem,
} from "@/lib/account"
import { cn } from "@/lib/utils"

export function RequestsTrackingConsole() {
  const t = useTranslations("Dashboard.requestsTracking")
  const locale = useLocale()
  const isRtl = locale === "ar"

  const [data, setData] = useState<RequestsTrackingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [activeSearch, setActiveSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<UnifiedRequestItem | null>(
    null
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const fetchLock = useRef(false)

  const fetchTracking = useCallback(
    async (isBackground = false) => {
      if (fetchLock.current) return
      fetchLock.current = true
      if (!isBackground) setLoading(true)
      else setIsRefreshing(true)
      setError("")

      try {
        const queryParams = new URLSearchParams()
        if (typeFilter !== "all") queryParams.set("type", typeFilter)
        if (statusFilter !== "all") queryParams.set("status", statusFilter)
        if (activeSearch.trim()) queryParams.set("search", activeSearch.trim())
        queryParams.set("page", String(page))
        queryParams.set("limit", "25")

        const res = await accountApi<RequestsTrackingResponse>(
          `/requests-tracking?${queryParams.toString()}`
        )
        setData(res)
      } catch (err) {
        if (!isBackground) {
          setError(
            err instanceof Error ? err.message : "Failed to load tracking data"
          )
        }
      } finally {
        fetchLock.current = false
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [typeFilter, statusFilter, activeSearch, page]
  )

  useEffect(() => {
    void fetchTracking()
  }, [fetchTracking])

  // Live polling every 12 seconds when document is visible
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchTracking(true)
      }
    }, 12000)
    return () => clearInterval(timer)
  }, [fetchTracking])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setActiveSearch(search)
  }

  function handleResetFilters() {
    setTypeFilter("all")
    setStatusFilter("all")
    setSearch("")
    setActiveSearch("")
    setPage(1)
  }

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—"
    const date = new Date(iso)
    if (isNaN(date.getTime())) return "—"
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return "—"
    if (minutes < 1) return t("justNow")

    const isAr = locale === "ar"

    const formatHoursUnit = (h: number, standalone = false) => {
      if (!isAr) return h === 1 ? "1 hr" : `${h} hrs`
      if (h === 1) return standalone ? "ساعة واحدة" : "ساعة"
      if (h === 2) return "ساعتان"
      const rem100 = h % 100
      if (rem100 >= 3 && rem100 <= 10) return `${h} ساعات`
      return `${h} ساعة`
    }

    const formatMinutesUnit = (m: number, standalone = false) => {
      if (!isAr) return m === 1 ? "1 min" : `${m} mins`
      if (m === 1) return standalone ? "دقيقة واحدة" : "دقيقة"
      if (m === 2) return "دقيقتان"
      const rem100 = m % 100
      if (rem100 >= 3 && rem100 <= 10) return `${m} دقائق`
      return `${m} دقيقة`
    }

    if (minutes < 60) {
      return formatMinutesUnit(minutes, true)
    }

    const hours = Math.floor(minutes / 60)
    const remMinutes = minutes % 60

    if (remMinutes === 0) {
      return formatHoursUnit(hours, true)
    }

    return isAr
      ? `${formatHoursUnit(hours, false)} و ${formatMinutesUnit(remMinutes, false)}`
      : `${formatHoursUnit(hours, false)} ${formatMinutesUnit(remMinutes, false)}`
  }

  const getTypeBadge = (type: UnifiedRequestItem["type"]) => {
    switch (type) {
      case "mentorship":
        return {
          icon: Compass,
          label: t("types.mentorship"),
          className:
            "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        }
      case "team_join":
        return {
          icon: UserPlus,
          label: t("types.teamJoin"),
          className:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        }
      case "team_invitation":
        return {
          icon: Users,
          label: t("types.teamInvitation"),
          className:
            "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
        }
      case "role_application":
        return {
          icon: Shield,
          label: t("types.roleApplication"),
          className:
            "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        }
    }
  }

  const getStatusBadge = (status: UnifiedRequestItem["status"]) => {
    switch (status) {
      case "pending":
        return {
          icon: Clock3,
          label: t("statuses.pending"),
          className:
            "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400",
        }
      case "accepted":
        return {
          icon: CheckCircle2,
          label: t("statuses.accepted"),
          className:
            "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        }
      case "rejected":
        return {
          icon: XCircle,
          label: t("statuses.rejected"),
          className:
            "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400",
        }
      case "completed":
        return {
          icon: UserCheck,
          label: t("statuses.completed"),
          className:
            "border-blue-500/30 bg-blue-500/15 text-blue-600 dark:text-blue-400",
        }
      case "canceled":
        return {
          icon: X,
          label: t("statuses.canceled"),
          className:
            "border-zinc-500/30 bg-zinc-500/15 text-zinc-500 dark:text-zinc-400",
        }
    }
  }

  const stats = data?.stats

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Activity className="size-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("title")}
              </h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchTracking()}
              disabled={loading || isRefreshing}
              className="h-10 gap-2 rounded-xl text-xs font-semibold"
            >
              <RefreshCw
                className={cn(
                  "size-3.5",
                  (loading || isRefreshing) && "animate-spin"
                )}
              />
              <span>{t("refresh")}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-0">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {t("metrics.totalRequests")}
              </span>
              <Activity className="size-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {stats ? stats.totalRequests : "—"}
            </div>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {t("metrics.allTypesCombined")}
            </span>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {t("metrics.pendingRequests")}
              </span>
              <Clock3 className="size-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {stats ? stats.pendingCount : "—"}
            </div>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {t("metrics.awaitingAction")}
            </span>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t("metrics.acceptedRequests")}
              </span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {stats ? stats.acceptedCount : "—"}
            </div>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {t("metrics.approvedAndAccepted")}
            </span>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {t("metrics.rejectedRequests")}
              </span>
              <XCircle className="size-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {stats ? stats.rejectedCount : "—"}
            </div>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {t("metrics.declinedOrRejected")}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 rounded-xl ps-9 text-xs sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("")
                    setActiveSearch("")
                    setPage(1)
                  }}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="h-10 shrink-0 rounded-xl px-4 text-xs font-semibold"
            >
              {t("searchBtn")}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                if (val) {
                  setTypeFilter(val)
                  setPage(1)
                }
              }}
            >
              <SelectTrigger className="h-10 w-[160px] rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder={t("filters.allTypes")}>
                  {(value) => {
                    switch (value) {
                      case "all":
                        return t("filters.allTypes")
                      case "mentorship":
                        return t("types.mentorship")
                      case "team_join":
                        return t("types.teamJoin")
                      case "team_invitation":
                        return t("types.teamInvitation")
                      case "role_application":
                        return t("types.roleApplication")
                      default:
                        return t("filters.allTypes")
                    }
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                <SelectItem value="mentorship">
                  {t("types.mentorship")} ({stats?.breakdown.mentorship ?? 0})
                </SelectItem>
                <SelectItem value="team_join">
                  {t("types.teamJoin")} ({stats?.breakdown.team_join ?? 0})
                </SelectItem>
                <SelectItem value="team_invitation">
                  {t("types.teamInvitation")} (
                  {stats?.breakdown.team_invitation ?? 0})
                </SelectItem>
                <SelectItem value="role_application">
                  {t("types.roleApplication")} (
                  {stats?.breakdown.role_application ?? 0})
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                if (val) {
                  setStatusFilter(val)
                  setPage(1)
                }
              }}
            >
              <SelectTrigger className="h-10 w-[140px] rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder={t("filters.allStatuses")}>
                  {(value) => {
                    switch (value) {
                      case "all":
                        return t("filters.allStatuses")
                      case "pending":
                        return t("statuses.pending")
                      case "accepted":
                        return t("statuses.accepted")
                      case "rejected":
                        return t("statuses.rejected")
                      case "completed":
                        return t("statuses.completed")
                      case "canceled":
                        return t("statuses.canceled")
                      default:
                        return t("filters.allStatuses")
                    }
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                <SelectItem value="pending">{t("statuses.pending")}</SelectItem>
                <SelectItem value="accepted">
                  {t("statuses.accepted")}
                </SelectItem>
                <SelectItem value="rejected">
                  {t("statuses.rejected")}
                </SelectItem>
                <SelectItem value="completed">
                  {t("statuses.completed")}
                </SelectItem>
                <SelectItem value="canceled">
                  {t("statuses.canceled")}
                </SelectItem>
              </SelectContent>
            </Select>

            {(typeFilter !== "all" ||
              statusFilter !== "all" ||
              activeSearch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="me-1 size-3.5" />
                <span>{t("resetFilters")}</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Table / Content */}
      <Card className="p-0">
        {loading && !data ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8">
            <RefreshCw className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchTracking()}
              className="mt-2 rounded-xl"
            >
              {t("retry")}
            </Button>
          </div>
        ) : !data?.items.length ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 p-8 text-center">
            <Filter className="size-8 text-muted-foreground/60" />
            <h3 className="text-base font-semibold">{t("noRequestsFound")}</h3>
            <p className="max-w-md text-xs text-muted-foreground">
              {t("noRequestsHint")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 text-start font-semibold">
                    {t("table.type")}
                  </th>
                  <th className="px-4 py-3.5 text-start font-semibold">
                    {t("table.requester")}
                  </th>
                  <th className="px-4 py-3.5 text-start font-semibold">
                    {t("table.responder")}
                  </th>
                  <th className="hidden px-4 py-3.5 text-start font-semibold md:table-cell">
                    {t("table.submittedAt")}
                  </th>
                  <th className="hidden px-4 py-3.5 text-start font-semibold lg:table-cell">
                    {t("table.turnaround")}
                  </th>
                  <th className="px-4 py-3.5 text-start font-semibold">
                    {t("table.status")}
                  </th>
                  <th className="px-4 py-3.5 text-end font-semibold">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.items.map((item) => {
                  const typeBadge = getTypeBadge(item.type)
                  const statusBadge = getStatusBadge(item.status)
                  const TypeIcon = typeBadge.icon
                  const StatusIcon = statusBadge.icon

                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      onClick={() => setSelectedItem(item)}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                    >
                      {/* Type and Summary */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "shrink-0 gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-2xs",
                              typeBadge.className
                            )}
                          >
                            <TypeIcon className="size-3" />
                            <span className="hidden sm:inline">
                              {typeBadge.label}
                            </span>
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">
                              {item.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.summary}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Requester */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">
                            {item.requester.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.requester.teamName
                              ? `${t("team")}: ${item.requester.teamName}`
                              : item.requester.email || "—"}
                          </p>
                        </div>
                      </td>

                      {/* Responder */}
                      <td className="px-4 py-3.5">
                        {item.responder ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">
                              {item.responder.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.responder.role ||
                                item.responder.email ||
                                "—"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {t("notAssignedYet")}
                          </span>
                        )}
                      </td>

                      {/* Submitted At */}
                      <td className="hidden px-4 py-3.5 text-xs text-muted-foreground md:table-cell">
                        {formatDateTime(item.createdAt)}
                      </td>

                      {/* Turnaround / Response Time */}
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        {item.durationMinutes !== null ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400"
                          >
                            <Timer className="me-1 size-3" />
                            <span>{formatDuration(item.durationMinutes)}</span>
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("awaitingResponse")}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                            statusBadge.className
                          )}
                        >
                          <StatusIcon className="size-3" />
                          <span>{statusBadge.label}</span>
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedItem(item)
                          }}
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                          title={t("viewDetails")}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
            <div>
              {t("showingResults", {
                from: (data.page - 1) * data.limit + 1,
                to: Math.min(data.page * data.limit, data.total),
                total: data.total,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="h-8 rounded-lg px-3 text-xs"
              >
                {t("previousPage")}
              </Button>
              <span className="font-semibold text-foreground">
                {data.page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="h-8 rounded-lg px-3 text-xs"
              >
                {t("nextPage")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent className="max-w-xl rounded-2xl p-5 sm:p-6">
          {selectedItem && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      getTypeBadge(selectedItem.type).className
                    )}
                  >
                    {getTypeBadge(selectedItem.type).label}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      getStatusBadge(selectedItem.status).className
                    )}
                  >
                    {getStatusBadge(selectedItem.status).label}
                  </Badge>
                </div>
                <DialogTitle className="mt-2 text-xl font-bold">
                  {selectedItem.title}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedItem.summary}
                </DialogDescription>
              </DialogHeader>

              <Separator />

              {/* Requester & Responder Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                    {t("dialog.requesterDetails")}
                  </p>
                  <p className="mt-1.5 font-semibold text-foreground">
                    {selectedItem.requester.name}
                  </p>
                  {selectedItem.requester.email && (
                    <p className="text-xs text-muted-foreground">
                      {selectedItem.requester.email}
                    </p>
                  )}
                  {selectedItem.requester.teamName && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {t("team")}: {selectedItem.requester.teamName}
                    </Badge>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                    {t("dialog.responderDetails")}
                  </p>
                  {selectedItem.responder ? (
                    <>
                      <p className="mt-1.5 font-semibold text-foreground">
                        {selectedItem.responder.name}
                      </p>
                      {selectedItem.responder.email && (
                        <p className="text-xs text-muted-foreground">
                          {selectedItem.responder.email}
                        </p>
                      )}
                      {selectedItem.responder.role && (
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          {selectedItem.responder.role}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      {t("awaitingResponse")}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes / Message */}
              {selectedItem.notes && (
                <div className="space-y-1.5 rounded-xl border border-border bg-card p-3.5">
                  <p className="text-xs font-semibold text-foreground">
                    {t("dialog.notesOrTopic")}
                  </p>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {selectedItem.notes}
                  </p>
                </div>
              )}

              {/* Timeline details */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/80 bg-muted/30 p-3.5 text-xs sm:grid-cols-3">
                <div>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("table.submittedAt")}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatDateTime(selectedItem.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("table.respondedAt")}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatDateTime(selectedItem.respondedAt)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted-foreground">
                    {t("table.turnaround")}
                  </span>
                  <span className="font-semibold text-primary">
                    {formatDuration(selectedItem.durationMinutes)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-xl px-5"
                >
                  {t("dialog.close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
