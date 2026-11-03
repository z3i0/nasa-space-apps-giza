"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from "swr"
import { useTranslations } from "next-intl"
import {
  Users,
  Search,
  Download,
  RefreshCw,
  FolderCheck,
  FileEdit,
  Clock,
  UserCheck,
  ExternalLink,
  Code2,
  Globe,
  LayoutGrid,
  List,
  Crown,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  EditTeamModal,
  ManageTeamMembersModal,
  DeleteTeamModal,
  type AdminTeamTarget,
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
  type DirectoryTeam,
  type DirectoryResponse,
} from "@/lib/account"
import { cn } from "@/lib/utils"

export function OrganizerTeamsView() {
  const t = useTranslations("Operations")

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "draft" | "not_started">("all")
  const [selectedChallenge, setSelectedChallenge] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [selectedTeam, setSelectedTeam] = useState<DirectoryTeam | null>(null)
  const [editingTeam, setEditingTeam] = useState<AdminTeamTarget | null>(null)
  const [manageMembersTeam, setManageMembersTeam] = useState<AdminTeamTarget | null>(null)
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<AdminTeamTarget | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const swrKey = `/directory?kind=teams&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=20`
  const {
    data,
    error: isSwrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DirectoryResponse<DirectoryTeam>>(swrKey, {
    keepPreviousData: true,
  })

  const loading = isLoading && !data
  const error = Boolean(isSwrError)
  const isRefreshing = isValidating && !isLoading

  const fetchTeams = useCallback((_isSilent?: boolean) => {
    return mutate()
  }, [mutate])

  // Extract challenge list from loaded items for quick filter
  const challengeList = useMemo(() => {
    if (!data?.items) return []
    const set = new Set<string>()
    data.items.forEach((item) => {
      if (item.challenge) set.add(item.challenge)
    })
    return Array.from(set)
  }, [data?.items])

  // Client-side filtering by submission status and challenge
  const filteredTeams = useMemo(() => {
    if (!data?.items) return []
    return data.items.filter((team) => {
      // Status filter
      if (statusFilter === "submitted") {
        if (team.submission?.status !== "submitted") return false
      } else if (statusFilter === "draft") {
        if (!team.submission || team.submission.status === "not_started" || team.submission.status === "submitted")
          return false
      } else if (statusFilter === "not_started") {
        if (team.submission && team.submission.status !== "not_started") return false
      }

      // Challenge filter
      if (selectedChallenge !== "all" && team.challenge !== selectedChallenge) {
        return false
      }

      return true
    })
  }, [data?.items, statusFilter, selectedChallenge])

  // Calculate local KPI aggregates
  const kpis = useMemo(() => {
    const total = data?.total ?? 0
    const items = data?.items ?? []
    const submitted = items.filter((i) => i.submission?.status === "submitted").length
    const drafts = items.filter((i) => i.submission && i.submission.status !== "submitted" && i.submission.status !== "not_started").length
    const totalMembers = items.reduce((acc, curr) => acc + (curr.members?.length || 0), 0)
    const avgSize = items.length ? (totalMembers / items.length).toFixed(1) : "0"

    return { total, submitted, drafts, totalMembers, avgSize }
  }, [data])

  function exportCsv() {
    if (!data?.items?.length) return
    const quote = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`
    const headers = ["Team ID", "Team Name", "Challenge", "Members Count", "Max Members", "Submission Title", "Submission Status", "Version"]
    const rows = filteredTeams.map((t) => [
      t.id,
      t.name,
      t.challenge || "N/A",
      t.members?.length || 0,
      t.maxMembers,
      t.submission?.title || "N/A",
      t.submission?.status || "not_started",
      t.submission?.version || 1,
    ])
    const csvContent = "\uFEFF" + [headers.map(quote).join(","), ...rows.map((r) => r.map(quote).join(","))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `teams-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderSubmissionBadge = (status?: string | null) => {
    if (status === "submitted") {
      return (
        <Badge variant="default" className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30">
          <FolderCheck className="size-3 me-1" />
          {t("statusSubmitted")}
        </Badge>
      )
    }
    if (status === "draft" || status === "in_review") {
      return (
        <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
          <Clock className="size-3 me-1" />
          {t("statusDraft")}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-muted-foreground border-border/80">
        {t("statusNotStarted")}
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title={t("teamsTitle")}
        subtitle={t("teamsDescription")}
        icon={Users}
        iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchTeams(true)}
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
              disabled={!filteredTeams.length}
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
          title={t("totalTeams")}
          value={kpis.total}
          icon={Users}
          iconColorClass="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          subtitle={t("total", { count: kpis.total })}
        />
        <OrganizerKpiCard
          title={t("submittedTeams")}
          value={kpis.submitted}
          icon={FolderCheck}
          iconColorClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          badgeText={data?.items.length ? `${Math.round((kpis.submitted / (data.items.length || 1)) * 100)}%` : undefined}
          badgeVariant="default"
        />
        <OrganizerKpiCard
          title={t("draftTeams")}
          value={kpis.drafts}
          icon={FileEdit}
          iconColorClass="bg-blue-500/15 text-blue-600 dark:text-blue-400"
        />
        <OrganizerKpiCard
          title={t("totalMembers")}
          value={kpis.totalMembers}
          icon={UserCheck}
          iconColorClass="bg-purple-500/15 text-purple-600 dark:text-purple-400"
          subtitle={`${t("avgTeamSize")}: ${kpis.avgSize}`}
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
                placeholder={t("searchTeamsPlaceholder")}
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
            <span className="text-muted-foreground font-medium me-1">{t("submission")}:</span>
            {(
              [
                { id: "all", label: t("allStatuses") },
                { id: "submitted", label: t("statusSubmitted") },
                { id: "draft", label: t("statusDraft") },
                { id: "not_started", label: t("statusNotStarted") },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors font-medium",
                  statusFilter === filter.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {filter.label}
              </button>
            ))}

            {challengeList.length > 0 && (
              <>
                <div className="h-4 w-px bg-border mx-1" />
                <span className="text-muted-foreground font-medium me-1">{t("challenge")}:</span>
                <select
                  value={selectedChallenge}
                  onChange={(e) => setSelectedChallenge(e.target.value)}
                  className="h-7 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">{t("allChallenges")}</option>
                  {challengeList.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto size-8 text-destructive mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">{t("error")}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t("teamsErrorDesc")}</p>
          <Button onClick={() => void fetchTeams()} variant="outline">
            {t("retry")}
          </Button>
        </Card>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80">
          <Users className="mx-auto size-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">{t("empty")}</h3>
          <p className="text-sm text-muted-foreground">{t("teamsEmptyDesc")}</p>
        </Card>
      ) : viewMode === "table" ? (
        /* Table View */
        <Card className="border-border/60 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold">{t("team")}</TableHead>
                  <TableHead className="font-semibold">{t("challenge")}</TableHead>
                  <TableHead className="font-semibold">{t("members")}</TableHead>
                  <TableHead className="font-semibold">{t("submission")}</TableHead>
                  <TableHead className="text-end font-semibold">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => {
                  const leader = team.members?.find((m) => m.role === "leader")
                  return (
                    <TableRow key={team.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <p className="font-semibold text-foreground">{team.name}</p>
                          {leader && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Crown className="size-3 text-amber-500 shrink-0" />
                              <span>{leader.user.name}</span>
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]" title={team.challenge || ""}>
                          {team.challenge || t("notSet")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {team.members?.length || 0} / {team.maxMembers}
                          </Badge>
                          <div className="flex -space-x-1.5 rtl:space-x-reverse overflow-hidden">
                            {team.members?.slice(0, 3).map((m) => (
                              <Avatar key={m.userId} className="size-5 border border-background">
                                <AvatarImage src={m.user.avatar} />
                                <AvatarFallback className="text-[9px]">
                                  {m.user.name.slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {renderSubmissionBadge(team.submission?.status)}
                          {team.submission?.title && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={team.submission.title}>
                              {team.submission.title} · v{team.submission.version}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTeam(team)}
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
                              <DropdownMenuItem onClick={() => setEditingTeam(team)}>
                                <Pencil className="size-3.5 me-2" />
                                <span>{t("editTeam")}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setManageMembersTeam(team)}>
                                <Users className="size-3.5 me-2" />
                                <span>{t("manageMembers")}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTeamTarget(team)}
                              >
                                <Trash2 className="size-3.5 me-2" />
                                <span>{t("deleteTeam")}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => {
            const leader = team.members?.find((m) => m.role === "leader")
            return (
              <Card key={team.id} className="border-border/60 flex flex-col justify-between hover:border-border transition-all">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold line-clamp-1" title={team.name}>
                      {team.name}
                    </CardTitle>
                    {renderSubmissionBadge(team.submission?.status)}
                  </div>
                  <CardDescription className="text-xs line-clamp-1 mt-1">
                    {team.challenge ? `${t("challenge")}: ${team.challenge}` : t("notSet")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0 flex flex-col gap-4">
                  <div className="flex flex-col gap-2 text-xs">
                    {leader && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Crown className="size-3 text-amber-500" />
                          {t("leader")}:
                        </span>
                        <span className="font-medium text-foreground">{leader.user.name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t("members")}:</span>
                      <span className="font-medium text-foreground">
                        {team.members?.length || 0} / {team.maxMembers}
                      </span>
                    </div>
                    {team.submission?.title && (
                      <div className="rounded-lg bg-muted/40 p-2 text-xs flex flex-col gap-0.5">
                        <p className="font-medium text-foreground line-clamp-1">
                          {team.submission.title}
                        </p>
                        <p className="text-muted-foreground text-[11px]">v{team.submission.version}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-between text-xs"
                      onClick={() => setSelectedTeam(team)}
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
                        <DropdownMenuItem onClick={() => setEditingTeam(team)}>
                          <Pencil className="size-3.5 me-2" />
                          <span>{t("editTeam")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setManageMembersTeam(team)}>
                          <Users className="size-3.5 me-2" />
                          <span>{t("manageMembers")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTeamTarget(team)}
                        >
                          <Trash2 className="size-3.5 me-2" />
                          <span>{t("deleteTeam")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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

      {/* Team Details Dialog */}
      <Dialog open={!!selectedTeam} onOpenChange={(open) => !open && setSelectedTeam(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTeam && (
            <div className="flex flex-col gap-6">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold">{selectedTeam.name}</DialogTitle>
                  {renderSubmissionBadge(selectedTeam.submission?.status)}
                </div>
                <DialogDescription>
                  {selectedTeam.challenge ? `${t("challenge")}: ${selectedTeam.challenge}` : t("notSet")}
                </DialogDescription>
              </DialogHeader>

              {/* Submission Information */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <FolderCheck className="size-4 text-primary" />
                  <span>{t("submissionInfo")}</span>
                </h4>
                {selectedTeam.submission ? (
                  <div className="flex flex-col gap-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{selectedTeam.submission.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("versionPrefix", { version: selectedTeam.submission.version })} · {t("statusPrefix", { status: t(selectedTeam.submission.status) })}
                      </p>
                    </div>

                    {selectedTeam.submission.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-lg">
                        {selectedTeam.submission.summary}
                      </p>
                    )}

                    {/* Links */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedTeam.submission.projectUrl && (
                        <a
                          href={selectedTeam.submission.projectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
                        >
                          <Globe className="size-3 text-primary" />
                          <span>{t("openProject")}</span>
                          <ExternalLink className="size-2.5 text-muted-foreground" />
                        </a>
                      )}
                      {selectedTeam.submission.demoUrl && (
                        <a
                          href={selectedTeam.submission.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
                        >
                          <Globe className="size-3 text-emerald-500" />
                          <span>{t("openDemo")}</span>
                          <ExternalLink className="size-2.5 text-muted-foreground" />
                        </a>
                      )}
                      {selectedTeam.submission.repositoryUrl && (
                        <a
                          href={selectedTeam.submission.repositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
                        >
                          <Code2 className="size-3" />
                          <span>{t("openRepo")}</span>
                          <ExternalLink className="size-2.5 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("noSubmission")}</p>
                )}
              </div>

              {/* Members List */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Users className="size-4 text-primary" />
                    <span>{t("membersList")}</span>
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {selectedTeam.members?.length || 0} / {selectedTeam.maxMembers}
                  </Badge>
                </div>

                <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden">
                  {selectedTeam.members?.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-3 bg-card hover:bg-muted/20">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={member.user.avatar} />
                          <AvatarFallback className="text-xs font-medium">
                            {member.user.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <span>{member.user.name}</span>
                            {member.role === "leader" && (
                              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] py-0 px-1">
                                <Crown className="size-2.5 me-0.5" />
                                {t("leader")}
                              </Badge>
                            )}
                          </p>
                          {member.user.email && (
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Admin Actions */}
              <div className="border-t border-border/50 pt-4 flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setEditingTeam(selectedTeam)}
                >
                  <Pencil className="size-3.5 text-primary" />
                  <span>{t("editTeam")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setManageMembersTeam(selectedTeam)}
                >
                  <Users className="size-3.5 text-primary" />
                  <span>{t("manageMembers")}</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setDeleteTeamTarget(selectedTeam)}
                >
                  <Trash2 className="size-3.5" />
                  <span>{t("deleteTeam")}</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Team Admin Modals */}
      <EditTeamModal
        isOpen={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        team={editingTeam}
        onSuccess={() => {
          fetchTeams(true)
          if (selectedTeam && editingTeam && selectedTeam.id === editingTeam.id) {
            setSelectedTeam(null)
          }
        }}
      />
      <ManageTeamMembersModal
        isOpen={!!manageMembersTeam}
        onClose={() => setManageMembersTeam(null)}
        team={manageMembersTeam}
        onSuccess={() => {
          fetchTeams(true)
          if (selectedTeam && manageMembersTeam && selectedTeam.id === manageMembersTeam.id) {
            setSelectedTeam(null)
          }
        }}
      />
      <DeleteTeamModal
        isOpen={!!deleteTeamTarget}
        onClose={() => setDeleteTeamTarget(null)}
        team={deleteTeamTarget}
        onSuccess={() => {
          setSelectedTeam(null)
          fetchTeams(true)
        }}
      />
    </div>
  )
}
