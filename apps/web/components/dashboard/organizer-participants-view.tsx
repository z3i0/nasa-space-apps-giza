"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from "swr"
import { useTranslations } from "next-intl"
import {
  UserRound,
  Users,
  Search,
  Download,
  RefreshCw,
  UserCheck,
  UserPlus,
  Activity,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  X,
  Mail,
  Building,
  Sparkles,
  Crown,
  Calendar,
  MoreHorizontal,
  Pencil,
  Shield,
  KeyRound,
  UserX,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  EditUserModal,
  ChangeRoleModal,
  ResetPasswordModal,
  ToggleStatusModal,
  DeleteUserModal,
  type AdminUserTarget,
} from "@/components/dashboard/organizer-admin-dialogs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/dashboard/page-header"
import { OrganizerKpiCard } from "@/components/dashboard/organizer-kpi-card"
import {
  accountApi,
  type DirectoryParticipant,
  type DirectoryResponse,
} from "@/lib/account"
import { cn } from "@/lib/utils"

export function OrganizerParticipantsView() {
  const t = useTranslations("Operations")

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [teamStatusFilter, setTeamStatusFilter] = useState<"all" | "in_team" | "solo">("all")
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [selectedParticipant, setSelectedParticipant] = useState<DirectoryParticipant | null>(null)
  const [editingUser, setEditingUser] = useState<AdminUserTarget | null>(null)
  const [roleTargetUser, setRoleTargetUser] = useState<AdminUserTarget | null>(null)
  const [passwordTargetUser, setPasswordTargetUser] = useState<AdminUserTarget | null>(null)
  const [statusTargetUser, setStatusTargetUser] = useState<AdminUserTarget | null>(null)
  const [deleteTargetUser, setDeleteTargetUser] = useState<AdminUserTarget | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const swrKey = `/directory?kind=participants&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=20`
  const {
    data,
    error: isSwrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DirectoryResponse<DirectoryParticipant>>(swrKey, {
    keepPreviousData: true,
  })

  const loading = isLoading && !data
  const error = Boolean(isSwrError)
  const isRefreshing = isValidating && !isLoading

  const fetchParticipants = useCallback((_isSilent?: boolean) => {
    return mutate()
  }, [mutate])

  // Filter participants client-side
  const filteredParticipants = useMemo(() => {
    if (!data?.items) return []
    return data.items.filter((p) => {
      // Team filter
      if (teamStatusFilter === "in_team" && !p.team) return false
      if (teamStatusFilter === "solo" && p.team) return false

      // Activity filter
      if (activityFilter === "active" && !p.isActive) return false
      if (activityFilter === "inactive" && p.isActive) return false

      return true
    })
  }, [data?.items, teamStatusFilter, activityFilter])

  // Calculate local KPI aggregates
  const kpis = useMemo(() => {
    const total = data?.total ?? 0
    const items = data?.items ?? []
    const inTeams = items.filter((i) => !!i.team).length
    const solo = items.filter((i) => !i.team).length
    const active = items.filter((i) => i.isActive).length
    const activeRate = items.length ? Math.round((active / items.length) * 100) : 0

    return { total, inTeams, solo, active, activeRate }
  }, [data])

  function exportCsv() {
    if (!data?.items?.length) return
    const quote = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`
    const headers = ["ID", "Name", "Email", "Institution", "Team Name", "Team Role", "Skills", "Active"]
    const rows = filteredParticipants.map((p) => [
      p.id,
      p.name,
      p.email,
      p.institution || "N/A",
      p.team?.name || "No Team",
      p.team?.role || "N/A",
      (p.skills || []).join(", "),
      p.isActive ? "Active" : "Inactive",
    ])
    const csvContent = "\uFEFF" + [headers.map(quote).join(","), ...rows.map((r) => r.map(quote).join(","))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `participants-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title={t("participantsTitle")}
        subtitle={t("participantsDescription")}
        icon={UserRound}
        iconClassName="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchParticipants(true)}
              disabled={isRefreshing || loading}
              className="gap-1.5"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              <span>{t("refresh")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={!filteredParticipants.length}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
              <span>{t("exportCsv")}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OrganizerKpiCard
          title={t("totalParticipants")}
          value={kpis.total}
          icon={UserRound}
          iconColorClass="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
          subtitle={t("total", { count: kpis.total })}
        />
        <OrganizerKpiCard
          title={t("participantsInTeams")}
          value={kpis.inTeams}
          icon={Users}
          iconColorClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          badgeText={data?.items?.length ? `${Math.round((kpis.inTeams / (data.items.length || 1)) * 100)}%` : undefined}
          badgeVariant="default"
        />
        <OrganizerKpiCard
          title={t("participantsSolo")}
          value={kpis.solo}
          icon={UserPlus}
          iconColorClass="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        />
        <OrganizerKpiCard
          title={t("activeParticipants")}
          value={kpis.active}
          icon={Activity}
          iconColorClass="bg-blue-500/15 text-blue-600 dark:text-blue-400"
          badgeText={`${kpis.activeRate}%`}
          badgeVariant="secondary"
        />
      </div>

      {/* Filter and Search Controls Toolbar */}
      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchParticipantsPlaceholder")}
                className="ps-9 h-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("table")}
                title={t("tableView")}
              >
                <List className="size-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("grid")}
                title={t("gridView")}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
            <span className="text-muted-foreground font-medium me-1">{t("team")}:</span>
            {(
              [
                { id: "all", label: t("all") },
                { id: "in_team", label: t("participantsInTeams") },
                { id: "solo", label: t("participantsSolo") },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTeamStatusFilter(filter.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors font-medium cursor-pointer",
                  teamStatusFilter === filter.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {filter.label}
              </button>
            ))}

            <div className="h-4 w-px bg-border mx-1" />

            <span className="text-muted-foreground font-medium me-1">{t("status")}:</span>
            {(
              [
                { id: "all", label: t("all") },
                { id: "active", label: t("active") },
                { id: "inactive", label: t("inactive") },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActivityFilter(filter.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors font-medium cursor-pointer",
                  activityFilter === filter.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 p-8 text-center flex flex-col items-center">
          <AlertCircle className="size-8 text-destructive mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">{t("error")}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t("participantsErrorDesc")}</p>
          <Button onClick={() => void fetchParticipants()} variant="outline">
            {t("retry")}
          </Button>
        </Card>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredParticipants.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 flex flex-col items-center">
          <UserRound className="size-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">{t("empty")}</h3>
          <p className="text-sm text-muted-foreground">{t("participantsEmptyDesc")}</p>
        </Card>
      ) : viewMode === "table" ? (
        /* Table View */
        <Card className="border-border/60 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">{t("participants")}</TableHead>
                  <TableHead className="font-semibold">{t("team")}</TableHead>
                  <TableHead className="font-semibold">{t("expertise")}</TableHead>
                  <TableHead className="font-semibold">{t("status")}</TableHead>
                  <TableHead className="text-end font-semibold">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((participant) => (
                  <TableRow key={participant.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarImage src={participant.avatar || undefined} />
                          <AvatarFallback className="text-xs font-semibold">
                            {participant.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-0.5">
                          <p className="font-semibold text-foreground">{participant.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="size-3 shrink-0" />
                            <span>{participant.email}</span>
                          </p>
                          {participant.institution && (
                            <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                              <Building className="size-2.5 shrink-0" />
                              <span>{participant.institution}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {participant.team ? (
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="secondary" className="gap-1 text-xs font-medium">
                            <Users className="size-3 text-primary" />
                            <span>{participant.team.name}</span>
                          </Badge>
                          {participant.team.role === "leader" && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] py-0 px-1">
                              <Crown className="size-2.5 me-0.5" />
                              {t("leader")}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground border-border/80">
                          {t("noTeam")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px] items-center">
                        {participant.skills?.length ? (
                          participant.skills.slice(0, 3).map((skill, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[11px] py-0 px-1.5 font-normal max-w-[100px]"
                              title={skill}
                            >
                              <span className="truncate">{skill}</span>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("noSkills")}</span>
                        )}
                        {participant.skills && participant.skills.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1 text-muted-foreground font-normal shrink-0"
                            title={participant.skills.slice(3).join(", ")}
                          >
                            +{participant.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {participant.isActive ? (
                        <Badge variant="default" className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30 text-xs">
                          {t("active")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs">
                          {t("inactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedParticipant(participant)}
                          className="gap-1 text-xs"
                        >
                          <span>{t("viewDetails")}</span>
                          <ChevronRight className="size-3 rtl:rotate-180" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                aria-label={t("actions")}
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setEditingUser(participant)}>
                              <Pencil className="size-3.5 me-2" />
                              <span>{t("edit")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRoleTargetUser(participant)}>
                              <Shield className="size-3.5 me-2" />
                              <span>{t("changeRole")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPasswordTargetUser(participant)}>
                              <KeyRound className="size-3.5 me-2" />
                              <span>{t("resetPassword")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusTargetUser(participant)}>
                              {participant.isActive ? (
                                <>
                                  <UserX className="size-3.5 me-2 text-amber-500" />
                                  <span>{t("deactivateAccount")}</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="size-3.5 me-2 text-emerald-500" />
                                  <span>{t("activateAccount")}</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTargetUser(participant)}
                            >
                              <Trash2 className="size-3.5 me-2" />
                              <span>{t("deleteAccount")}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredParticipants.map((participant) => (
            <Card key={participant.id} className="border-border/60 flex flex-col justify-between hover:border-border transition-all">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={participant.avatar || undefined} />
                      <AvatarFallback className="text-xs font-semibold">
                        {participant.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <CardTitle className="text-base font-semibold truncate" title={participant.name}>
                        {participant.name}
                      </CardTitle>
                      <CardDescription className="text-xs truncate break-all">
                        {participant.email}
                      </CardDescription>
                    </div>
                  </div>
                  {participant.isActive ? (
                    <Badge variant="default" className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30 text-[10px] px-1.5">
                      {t("active")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5">
                      {t("inactive")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0 flex flex-col gap-4">
                {participant.institution && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building className="size-3 shrink-0" />
                    <span className="truncate">{participant.institution}</span>
                  </p>
                )}

                {/* Team Info */}
                <div className="flex items-center justify-between text-xs rounded-lg bg-muted/40 p-2.5">
                  <span className="text-muted-foreground">{t("team")}:</span>
                  {participant.team ? (
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      {participant.team.role === "leader" && (
                        <Crown className="size-3 text-amber-500" />
                      )}
                      {participant.team.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t("noTeam")}</span>
                  )}
                </div>

                {/* Skills Chips */}
                <div className="flex flex-wrap gap-1 min-h-[1.5rem] items-center">
                  {participant.skills?.slice(0, 3).map((skill, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-[10px] py-0 px-1.5 font-normal max-w-[100px]"
                      title={skill}
                    >
                      <span className="truncate">{skill}</span>
                    </Badge>
                  ))}
                  {participant.skills && participant.skills.length > 3 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1 text-muted-foreground font-normal shrink-0"
                      title={participant.skills.slice(3).join(", ")}
                    >
                      +{participant.skills.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-between text-xs"
                    onClick={() => setSelectedParticipant(participant)}
                  >
                    <span>{t("viewDetails")}</span>
                    <ChevronRight className="size-3 rtl:rotate-180" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label={t("actions")}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setEditingUser(participant)}>
                        <Pencil className="size-3.5 me-2" />
                        <span>{t("edit")}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRoleTargetUser(participant)}>
                        <Shield className="size-3.5 me-2" />
                        <span>{t("changeRole")}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPasswordTargetUser(participant)}>
                        <KeyRound className="size-3.5 me-2" />
                        <span>{t("resetPassword")}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusTargetUser(participant)}>
                        {participant.isActive ? (
                          <>
                            <UserX className="size-3.5 me-2 text-amber-500" />
                            <span>{t("deactivateAccount")}</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="size-3.5 me-2 text-emerald-500" />
                            <span>{t("activateAccount")}</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTargetUser(participant)}
                      >
                        <Trash2 className="size-3.5 me-2" />
                        <span>{t("deleteAccount")}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {t("total", { count: data.total })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="size-3.5 rtl:rotate-180" />
              <span>{t("previous")}</span>
            </Button>
            <span className="text-xs font-medium text-muted-foreground px-2">
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1 text-xs"
            >
              <span>{t("next")}</span>
              <ChevronRight className="size-3.5 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}

      {/* Participant Details Dialog */}
      <Dialog open={!!selectedParticipant} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedParticipant && (
            <div className="flex flex-col gap-6">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={selectedParticipant.avatar || undefined} />
                    <AvatarFallback className="text-sm font-semibold">
                      {selectedParticipant.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <DialogTitle className="text-lg font-bold">{selectedParticipant.name}</DialogTitle>
                    <DialogDescription className="break-all">{selectedParticipant.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Bio & Overview */}
              {selectedParticipant.bio && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-card p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("personalBio")}
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedParticipant.bio}
                  </p>
                </div>
              )}

              {/* Institution & Details */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Building className="size-4 text-primary" />
                    <span>{t("institutionLabel")}:</span>
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedParticipant.institution || t("notSet")}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Activity className="size-4 text-primary" />
                    <span>{t("status")}:</span>
                  </span>
                  {selectedParticipant.isActive ? (
                    <Badge variant="default" className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30 text-xs">
                      {t("active")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-xs">
                      {t("inactive")}
                    </Badge>
                  )}
                </div>
                {selectedParticipant.createdAt && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="size-4 text-primary" />
                        <span>{t("registrationDate")}:</span>
                      </span>
                      <span className="font-medium text-foreground text-xs">
                        {new Date(selectedParticipant.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Team Information */}
              <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Users className="size-4 text-primary" />
                  <span>{t("team")}</span>
                </h4>
                {selectedParticipant.team ? (
                  <div className="flex flex-col gap-2 pt-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{selectedParticipant.team.name}</span>
                      {selectedParticipant.team.role === "leader" && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs">
                          <Crown className="size-3 me-1" />
                          {t("leader")}
                        </Badge>
                      )}
                    </div>
                    {selectedParticipant.team.challenge && (
                      <p className="text-xs text-muted-foreground">
                        {t("challengePrefix", { challenge: selectedParticipant.team.challenge })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pt-1">
                    {t("participantNoTeamDesc")}
                  </p>
                )}
              </div>

              {/* Skills Tags */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Sparkles className="size-4 text-indigo-500" />
                    <span>{t("expertise")}</span>
                  </h4>
                  {selectedParticipant.skills && selectedParticipant.skills.length > 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">
                      {selectedParticipant.skills.length}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg border border-border/50 bg-muted/20">
                  {selectedParticipant.skills?.length ? (
                    selectedParticipant.skills.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs max-w-[180px] shrink-0"
                        title={skill}
                      >
                        <span className="truncate">{skill}</span>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("noSkills")}</p>
                  )}
                </div>
              </div>

              {/* Quick Admin Actions */}
              <div className="border-t border-border/50 pt-4 flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setEditingUser(selectedParticipant)}
                >
                  <Pencil className="size-3.5 text-primary" />
                  <span>{t("edit")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setRoleTargetUser(selectedParticipant)}
                >
                  <Shield className="size-3.5 text-indigo-500" />
                  <span>{t("changeRole")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setPasswordTargetUser(selectedParticipant)}
                >
                  <KeyRound className="size-3.5 text-amber-500" />
                  <span>{t("resetPassword")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setStatusTargetUser(selectedParticipant)}
                >
                  {selectedParticipant.isActive ? (
                    <>
                      <UserX className="size-3.5 text-amber-500" />
                      <span>{t("deactivateAccount")}</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="size-3.5 text-emerald-500" />
                      <span>{t("activateAccount")}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Action Modals */}
      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onSuccess={() => {
          fetchParticipants(true)
          if (selectedParticipant && editingUser && selectedParticipant.id === editingUser.id) {
            setSelectedParticipant(null)
          }
        }}
      />
      <ChangeRoleModal
        isOpen={!!roleTargetUser}
        onClose={() => setRoleTargetUser(null)}
        user={roleTargetUser}
        onSuccess={() => {
          fetchParticipants(true)
          if (selectedParticipant && roleTargetUser && selectedParticipant.id === roleTargetUser.id) {
            setSelectedParticipant(null)
          }
        }}
      />
      <ResetPasswordModal
        isOpen={!!passwordTargetUser}
        onClose={() => setPasswordTargetUser(null)}
        user={passwordTargetUser}
        onSuccess={() => fetchParticipants(true)}
      />
      <ToggleStatusModal
        isOpen={!!statusTargetUser}
        onClose={() => setStatusTargetUser(null)}
        user={statusTargetUser}
        onSuccess={() => {
          fetchParticipants(true)
          if (selectedParticipant && statusTargetUser && selectedParticipant.id === statusTargetUser.id) {
            setSelectedParticipant((prev) => prev ? { ...prev, isActive: !prev.isActive } : null)
          }
        }}
      />
      <DeleteUserModal
        isOpen={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        user={deleteTargetUser}
        onSuccess={() => {
          setSelectedParticipant(null)
          fetchParticipants(true)
        }}
      />
    </div>
  )
}

