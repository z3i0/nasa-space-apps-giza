"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from "swr"
import { useTranslations } from "next-intl"
import {
  Award,
  Search,
  Download,
  RefreshCw,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Shield,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  X,
  Mail,
  Building,
  SlidersHorizontal,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  KeyRound,
  UserX,
  Trash2,
  Sparkles,
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
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/dashboard/page-header"
import { OrganizerKpiCard } from "@/components/dashboard/organizer-kpi-card"
import { RoleApplications } from "@/components/account/role-applications"
import { JudgingHub } from "@/components/judging/judging-hub"
import {
  accountApi,
  type DirectoryJudge,
  type DirectoryResponse,
} from "@/lib/account"
import { cn } from "@/lib/utils"

export function OrganizerJudgesView() {
  const t = useTranslations("Operations")
  const tj = useTranslations("Judging")

  const [activeTab, setActiveTab] = useState<string>("directory")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "in_progress" | "unassigned">("all")
  const [selectedJudge, setSelectedJudge] = useState<DirectoryJudge | null>(null)
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

  const swrKey = `/directory?kind=judges&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=20`
  const {
    data,
    error: isSwrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DirectoryResponse<DirectoryJudge>>(swrKey, {
    keepPreviousData: true,
  })

  const loading = isLoading && !data
  const error = Boolean(isSwrError)
  const isRefreshing = isValidating && !isLoading

  const fetchJudges = useCallback((_isSilent?: boolean) => {
    return mutate()
  }, [mutate])

  // Filter judges based on completion status
  const filteredJudges = useMemo(() => {
    if (!data?.items) return []
    return data.items.filter((j) => {
      if (statusFilter === "completed") {
        return j.assignmentsCount > 0 && j.completedAssignmentsCount === j.assignmentsCount
      }
      if (statusFilter === "in_progress") {
        return j.assignmentsCount > 0 && j.completedAssignmentsCount < j.assignmentsCount
      }
      if (statusFilter === "unassigned") {
        return j.assignmentsCount === 0
      }
      return true
    })
  }, [data?.items, statusFilter])

  // Calculate local KPI aggregates
  const kpis = useMemo(() => {
    const total = data?.total ?? 0
    const items = data?.items ?? []
    const totalAssignments = items.reduce((acc, curr) => acc + (curr.assignmentsCount || 0), 0)
    const totalCompleted = items.reduce((acc, curr) => acc + (curr.completedAssignmentsCount || 0), 0)
    const rate = totalAssignments > 0 ? Math.round((totalCompleted / totalAssignments) * 100) : 0

    return { total, totalAssignments, totalCompleted, rate }
  }, [data])

  function exportCsv() {
    if (!data?.items?.length) return
    const quote = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`
    const headers = ["Judge ID", "Name", "Email", "Institution", "Assignments Count", "Completed Count", "Pending Count", "Status"]
    const rows = filteredJudges.map((j) => [
      j.id,
      j.name,
      j.email,
      j.institution || "N/A",
      j.assignmentsCount || 0,
      j.completedAssignmentsCount || 0,
      j.pendingAssignmentsCount || 0,
      j.isActive ? "Active" : "Inactive",
    ])
    const csvContent = "\uFEFF" + [headers.map(quote).join(","), ...rows.map((r) => r.map(quote).join(","))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `judges-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title={t("judgesTitle")}
        subtitle={t("judgesDescription")}
        icon={Award}
        iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchJudges(true)}
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
              disabled={!filteredJudges.length}
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
          title={t("totalJudges")}
          value={kpis.total}
          icon={Award}
          iconColorClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          subtitle={t("total", { count: kpis.total })}
        />
        <OrganizerKpiCard
          title={t("assignedProjects")}
          value={kpis.totalAssignments}
          icon={ClipboardList}
          iconColorClass="bg-blue-500/15 text-blue-600 dark:text-blue-400"
        />
        <OrganizerKpiCard
          title={t("completedReviews")}
          value={kpis.totalCompleted}
          icon={CheckCircle2}
          iconColorClass="bg-purple-500/15 text-purple-600 dark:text-purple-400"
        />
        <OrganizerKpiCard
          title={t("completionRate")}
          value={`${kpis.rate}%`}
          icon={TrendingUp}
          iconColorClass="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          badgeText={`${kpis.totalCompleted} / ${kpis.totalAssignments}`}
          badgeVariant="secondary"
        />
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(String(val))} className="w-full">
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="directory" className="gap-2">
            <Award className="size-4" />
            <span>{t("directoryTab")}</span>
            {data?.total ? (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 font-normal">
                {data.total}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="hub" className="gap-2">
            <SlidersHorizontal className="size-4" />
            <span>{t("assignmentTab")}</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="gap-2">
            <Shield className="size-4" />
            <span>{t("applicationsTab")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Judges Directory */}
        <TabsContent value="directory" className="flex flex-col gap-4 pt-2">
          {/* Search & Filter Toolbar */}
          <Card className="border-border/60">
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchJudgesPlaceholder")}
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

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
                <span className="text-muted-foreground font-medium me-1">{t("judgingStatus")}:</span>
                {(
                  [
                    { id: "all", label: t("all") },
                    { id: "completed", label: t("completedEvaluation") },
                    { id: "in_progress", label: t("inProgress") },
                    { id: "unassigned", label: t("unassigned") },
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
              </div>
            </CardContent>
          </Card>

          {/* Directory Content Area */}
          {error ? (
            <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
              <AlertCircle className="mx-auto size-8 text-destructive mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">{t("error")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("judgesErrorDesc")}</p>
              <Button onClick={() => void fetchJudges()} variant="outline">
                {t("retry")}
              </Button>
            </Card>
          ) : loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !filteredJudges.length ? (
            <Card className="p-12 text-center border-dashed border-border/80">
              <Award className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">{t("empty")}</h3>
              <p className="text-sm text-muted-foreground">{t("judgesEmptyDesc")}</p>
            </Card>
          ) : viewMode === "table" ? (
            /* Table View */
            <Card className="border-border/60 overflow-hidden p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">{t("judges")}</TableHead>
                      <TableHead className="font-semibold">{t("assignedProjects")}</TableHead>
                      <TableHead className="font-semibold">{t("completedReviews")}</TableHead>
                      <TableHead className="font-semibold">{t("completionRate")}</TableHead>
                      <TableHead className="text-end font-semibold">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJudges.map((judge) => {
                      const progress =
                        judge.assignmentsCount > 0
                          ? Math.round(
                            (judge.completedAssignmentsCount / judge.assignmentsCount) * 100
                          )
                          : 0
                      return (
                        <TableRow key={judge.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-9">
                                <AvatarImage src={judge.avatar || undefined} />
                                <AvatarFallback className="text-xs font-semibold">
                                  {judge.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col gap-0.5">
                                <p className="font-semibold text-foreground">{judge.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="size-3 shrink-0" />
                                  <span>{judge.email}</span>
                                </p>
                                {judge.institution && (
                                  <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                                    <Building className="size-2.5 shrink-0" />
                                    <span>{judge.institution}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              <ClipboardList className="size-3 me-1 text-muted-foreground" />
                              {t("assignedCount", { count: judge.assignmentsCount || 0 })}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs",
                                judge.completedAssignmentsCount === judge.assignmentsCount &&
                                judge.assignmentsCount > 0 &&
                                "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              )}
                            >
                              <CheckCircle2 className="size-3 me-1" />
                              {t("completedCount", { count: judge.completedAssignmentsCount || 0 })}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="w-28 flex flex-col gap-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedJudge(judge)}
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
                                  <DropdownMenuItem onClick={() => setEditingUser(judge)}>
                                    <Pencil className="size-3.5 me-2" />
                                    <span>{t("edit")}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setRoleTargetUser(judge)}>
                                    <Shield className="size-3.5 me-2" />
                                    <span>{t("changeRole")}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setPasswordTargetUser(judge)}>
                                    <KeyRound className="size-3.5 me-2" />
                                    <span>{t("resetPassword")}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setStatusTargetUser(judge)}>
                                    {judge.isActive ? (
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
                                    onClick={() => setDeleteTargetUser(judge)}
                                  >
                                    <Trash2 className="size-3.5 me-2" />
                                    <span>{t("deleteAccount")}</span>
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
              {filteredJudges.map((judge) => {
                const progress =
                  judge.assignmentsCount > 0
                    ? Math.round(
                      (judge.completedAssignmentsCount / judge.assignmentsCount) * 100
                    )
                    : 0
                return (
                  <Card key={judge.id} className="border-border/60 flex flex-col justify-between hover:border-border transition-all">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="size-10">
                          <AvatarImage src={judge.avatar || undefined} />
                          <AvatarFallback className="text-xs font-semibold">
                            {judge.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <CardTitle className="text-base font-semibold line-clamp-1" title={judge.name}>
                            {judge.name}
                          </CardTitle>
                          <CardDescription className="text-xs line-clamp-1 break-all">
                            {judge.email}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 flex flex-col gap-4">
                      {judge.institution && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="size-3 shrink-0" />
                          <span>{judge.institution}</span>
                        </p>
                      )}

                      {/* Progress bar */}
                      <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{t("completionRate")}:</span>
                          <span className="font-semibold text-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                          <span>{t("completedCount", { count: judge.completedAssignmentsCount || 0 })}</span>
                          <span>{t("assignedCount", { count: judge.assignmentsCount || 0 })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-between text-xs"
                          onClick={() => setSelectedJudge(judge)}
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
                            <DropdownMenuItem onClick={() => setEditingUser(judge)}>
                              <Pencil className="size-3.5 me-2" />
                              <span>{t("edit")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRoleTargetUser(judge)}>
                              <Shield className="size-3.5 me-2" />
                              <span>{t("changeRole")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPasswordTargetUser(judge)}>
                              <KeyRound className="size-3.5 me-2" />
                              <span>{t("resetPassword")}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusTargetUser(judge)}>
                              {judge.isActive ? (
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
                              onClick={() => setDeleteTargetUser(judge)}
                            >
                              <Trash2 className="size-3.5 me-2" />
                              <span>{t("deleteAccount")}</span>
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
        </TabsContent>

        {/* Tab 2: Assignment Hub */}
        <TabsContent value="hub" className="pt-2">
          <JudgingHub organizer />
        </TabsContent>

        {/* Tab 3: Judge Applications */}
        <TabsContent value="applications" className="pt-2">
          <RoleApplications role="judge" embedded />
        </TabsContent>
      </Tabs>

      {/* Judge Details Dialog */}
      <Dialog open={!!selectedJudge} onOpenChange={(open) => !open && setSelectedJudge(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedJudge && (
            <div className="flex flex-col gap-6">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={selectedJudge.avatar || undefined} />
                    <AvatarFallback className="text-sm font-semibold">
                      {selectedJudge.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-lg font-bold">{selectedJudge.name}</DialogTitle>
                    <DialogDescription className="break-all">{selectedJudge.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Institution */}
              {selectedJudge.institution && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="size-4 text-primary" />
                  <span>{selectedJudge.institution}</span>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/70 bg-card p-3 flex flex-col gap-0.5">
                  <p className="text-xs text-muted-foreground">{t("assignedProjects")}</p>
                  <p className="text-lg font-bold text-foreground">{selectedJudge.assignmentsCount || 0}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-3 flex flex-col gap-0.5">
                  <p className="text-xs text-muted-foreground">{t("completedReviews")}</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedJudge.completedAssignmentsCount || 0}
                  </p>
                </div>
              </div>

              {/* Assigned Teams List */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <ClipboardList className="size-4 text-primary" />
                    <span>{t("assignedTeamsToJudge")}</span>
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {t("teamsCount", { count: selectedJudge.assignedTeams?.length || 0 })}
                  </Badge>
                </div>

                {selectedJudge.assignedTeams?.length ? (
                  <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden">
                    {selectedJudge.assignedTeams.map((assigned) => (
                      <div key={assigned.assignmentId} className="flex items-center justify-between p-3 text-xs bg-card">
                        <div className="flex flex-col gap-0.5">
                          <p className="font-semibold text-foreground">{assigned.teamName}</p>
                          {assigned.challenge && (
                            <p className="text-[11px] text-muted-foreground">{assigned.challenge}</p>
                          )}
                          {assigned.rubricName && (
                            <p className="text-[10px] text-muted-foreground/80">{t("rubricLabel", { name: assigned.rubricName })}</p>
                          )}
                        </div>
                        {assigned.completed ? (
                          <Badge variant="default" className="text-[10px] bg-emerald-600/20 text-emerald-600 dark:text-emerald-400">
                            {t("completedEvaluation")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            {t("inProgress")}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl">
                    {t("noAssignedTeamsYet")}
                  </p>
                )}
              </div>

              {/* Quick Admin Actions */}
              <div className="border-t border-border/50 pt-4 flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setEditingUser(selectedJudge)}
                >
                  <Pencil className="size-3.5 text-primary" />
                  <span>{t("edit")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setRoleTargetUser(selectedJudge)}
                >
                  <Shield className="size-3.5 text-indigo-500" />
                  <span>{t("changeRole")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setPasswordTargetUser(selectedJudge)}
                >
                  <KeyRound className="size-3.5 text-amber-500" />
                  <span>{t("resetPassword")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setStatusTargetUser(selectedJudge)}
                >
                  {selectedJudge.isActive ? (
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
          fetchJudges(true)
          if (selectedJudge && editingUser && selectedJudge.id === editingUser.id) {
            setSelectedJudge(null)
          }
        }}
      />
      <ChangeRoleModal
        isOpen={!!roleTargetUser}
        onClose={() => setRoleTargetUser(null)}
        user={roleTargetUser}
        onSuccess={() => {
          fetchJudges(true)
          if (selectedJudge && roleTargetUser && selectedJudge.id === roleTargetUser.id) {
            setSelectedJudge(null)
          }
        }}
      />
      <ResetPasswordModal
        isOpen={!!passwordTargetUser}
        onClose={() => setPasswordTargetUser(null)}
        user={passwordTargetUser}
        onSuccess={() => fetchJudges(true)}
      />
      <ToggleStatusModal
        isOpen={!!statusTargetUser}
        onClose={() => setStatusTargetUser(null)}
        user={statusTargetUser}
        onSuccess={() => {
          fetchJudges(true)
          if (selectedJudge && statusTargetUser && selectedJudge.id === statusTargetUser.id) {
            setSelectedJudge((prev) => prev ? { ...prev, isActive: !prev.isActive } : null)
          }
        }}
      />
      <DeleteUserModal
        isOpen={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        user={deleteTargetUser}
        onSuccess={() => {
          setSelectedJudge(null)
          fetchJudges(true)
        }}
      />
    </div>
  )
}

