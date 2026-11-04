"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from "swr"
import { useTranslations } from "next-intl"
import {
  Compass,
  Search,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  MessageSquare,
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
  Sparkles,
  MoreHorizontal,
  Pencil,
  KeyRound,
  UserX,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/dashboard/page-header"
import { OrganizerKpiCard } from "@/components/dashboard/organizer-kpi-card"
import { RoleApplications } from "@/components/account/role-applications"
import {
  accountApi,
  type DirectoryMentor,
  type DirectoryResponse,
} from "@/lib/account"
import { cn } from "@/lib/utils"

export function OrganizerMentorsView() {
  const t = useTranslations("Operations")

  const [activeTab, setActiveTab] = useState<string>("directory")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [selectedMentor, setSelectedMentor] = useState<DirectoryMentor | null>(null)
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

  const swrKey = `/directory?kind=mentors&search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=20`
  const {
    data,
    error: isSwrError,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DirectoryResponse<DirectoryMentor>>(swrKey, {
    keepPreviousData: true,
  })

  const loading = isLoading && !data
  const error = Boolean(isSwrError)
  const isRefreshing = isValidating && !isLoading

  const fetchMentors = useCallback((_isSilent?: boolean) => {
    return mutate()
  }, [mutate])

  // Calculate local KPI aggregates
  const kpis = useMemo(() => {
    const total = data?.total ?? 0
    const items = data?.items ?? []
    const totalSlots = items.reduce((acc, curr) => acc + (curr.activeSlotsCount || 0), 0)
    const totalRequests = items.reduce((acc, curr) => acc + (curr.requestsCount || 0), 0)
    const active = items.filter((i) => i.isActive).length

    return { total, totalSlots, totalRequests, active }
  }, [data])

  function exportCsv() {
    if (!data?.items?.length) return
    const quote = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`
    const headers = ["Mentor ID", "Name", "Email", "Institution", "Expertise / Skills", "Available Slots", "Total Requests", "Status"]
    const rows = (data.items || []).map((m) => [
      m.id,
      m.name,
      m.email,
      m.institution || "N/A",
      (m.skills || []).join(", "),
      m.activeSlotsCount || 0,
      m.requestsCount || 0,
      m.isActive ? "Active" : "Inactive",
    ])
    const csvContent = "\uFEFF" + [headers.map(quote).join(","), ...rows.map((r) => r.map(quote).join(","))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `mentors-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title={t("mentorsTitle")}
        subtitle={t("mentorsDescription")}
        icon={Compass}
        iconClassName="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchMentors(true)}
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
              disabled={!data?.items?.length}
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
          title={t("totalMentors")}
          value={kpis.total}
          icon={Compass}
          iconColorClass="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
          subtitle={t("total", { count: kpis.total })}
        />
        <OrganizerKpiCard
          title={t("activeMentors")}
          value={kpis.active}
          icon={UserCheck}
          iconColorClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          badgeText={data?.items?.length ? `${Math.round((kpis.active / (data.items.length || 1)) * 100)}%` : undefined}
          badgeVariant="default"
        />
        <OrganizerKpiCard
          title={t("availableSlots")}
          value={kpis.totalSlots}
          icon={Calendar}
          iconColorClass="bg-blue-500/15 text-blue-600 dark:text-blue-400"
        />
        <OrganizerKpiCard
          title={t("requests")}
          value={kpis.totalRequests}
          icon={MessageSquare}
          iconColorClass="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(String(val))} className="w-full">
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="directory" className="gap-2">
            <Compass className="size-4" />
            <span>{t("directoryTab")}</span>
            {data?.total ? (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 font-normal">
                {data.total}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="applications" className="gap-2">
            <Shield className="size-4" />
            <span>{t("applicationsTab")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Mentors Directory */}
        <TabsContent value="directory" className="flex flex-col gap-4 pt-2">
          {/* Search & View Toolbar */}
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchMentorsPlaceholder")}
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
            </CardContent>
          </Card>

          {/* Directory Content Area */}
          {error ? (
            <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
              <AlertCircle className="mx-auto size-8 text-destructive mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">{t("error")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("mentorsErrorDesc")}</p>
              <Button onClick={() => void fetchMentors()} variant="outline">
                {t("retry")}
              </Button>
            </Card>
          ) : loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !data?.items?.length ? (
            <Card className="p-12 text-center border-dashed border-border/80">
              <Compass className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">{t("empty")}</h3>
              <p className="text-sm text-muted-foreground">{t("mentorsEmptyDesc")}</p>
            </Card>
          ) : viewMode === "table" ? (
            /* Table View */
            <Card className="border-border/60 overflow-hidden p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">{t("mentors")}</TableHead>
                      <TableHead className="font-semibold">{t("expertise")}</TableHead>
                      <TableHead className="font-semibold">{t("slots")}</TableHead>
                      <TableHead className="font-semibold">{t("requests")}</TableHead>
                      <TableHead className="text-end font-semibold">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((mentor) => (
                      <TableRow key={mentor.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarImage src={mentor.avatar || undefined} />
                              <AvatarFallback className="text-xs font-semibold">
                                {mentor.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-0.5">
                              <p className="font-semibold text-foreground">{mentor.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="size-3 shrink-0" />
                                <span>{mentor.email}</span>
                              </p>
                              {mentor.institution && (
                                <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                                  <Building className="size-2.5 shrink-0" />
                                  <span>{mentor.institution}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[240px] items-center">
                            {mentor.skills?.length ? (
                              mentor.skills.slice(0, 3).map((skill, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-[11px] py-0 px-1.5 font-normal max-w-[105px]"
                                  title={skill}
                                >
                                  <span className="truncate">{skill}</span>
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">{t("noSkills")}</span>
                            )}
                            {mentor.skills && mentor.skills.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1 text-muted-foreground font-normal shrink-0"
                                title={mentor.skills.slice(3).join(", ")}
                              >
                                +{mentor.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400">
                              <Clock className="size-3 me-1" />
                              {t("vacantSlotsCount", { count: mentor.activeSlotsCount || 0 })}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Badge variant="secondary" className="text-xs font-medium">
                              <MessageSquare className="size-3 me-1 text-muted-foreground" />
                              {mentor.requestsCount || 0}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMentor(mentor)}
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
                                <DropdownMenuItem onClick={() => setEditingUser(mentor)}>
                                  <Pencil className="size-3.5 me-2" />
                                  <span>{t("edit")}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setRoleTargetUser(mentor)}>
                                  <Shield className="size-3.5 me-2" />
                                  <span>{t("changeRole")}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setPasswordTargetUser(mentor)}>
                                  <KeyRound className="size-3.5 me-2" />
                                  <span>{t("resetPassword")}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusTargetUser(mentor)}>
                                  {mentor.isActive ? (
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
                                  onClick={() => setDeleteTargetUser(mentor)}
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
              {data.items.map((mentor) => (
                <Card key={mentor.id} className="border-border/60 flex flex-col justify-between hover:border-border transition-all">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10">
                        <AvatarImage src={mentor.avatar || undefined} />
                        <AvatarFallback className="text-xs font-semibold">
                          {mentor.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold line-clamp-1" title={mentor.name}>
                          {mentor.name}
                        </CardTitle>
                        <CardDescription className="text-xs line-clamp-1 break-all">
                          {mentor.email}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 flex flex-col gap-4">
                    {mentor.institution && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building className="size-3 shrink-0" />
                        <span>{mentor.institution}</span>
                      </p>
                    )}

                    {/* Expertise badges */}
                    <div className="flex flex-wrap gap-1 min-h-[1.5rem] items-center">
                      {mentor.skills?.slice(0, 3).map((skill, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[10px] py-0 px-1.5 font-normal max-w-[100px]"
                          title={skill}
                        >
                          <span className="truncate">{skill}</span>
                        </Badge>
                      ))}
                      {mentor.skills && mentor.skills.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1 text-muted-foreground font-normal shrink-0"
                          title={mentor.skills.slice(3).join(", ")}
                        >
                          +{mentor.skills.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-blue-500" />
                        {t("availableSlotsCount", { count: mentor.activeSlotsCount || 0 })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3 text-amber-500" />
                        {t("requestsCountLabel", { count: mentor.requestsCount || 0 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 justify-between text-xs"
                        onClick={() => setSelectedMentor(mentor)}
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
                          <DropdownMenuItem onClick={() => setEditingUser(mentor)}>
                            <Pencil className="size-3.5 me-2" />
                            <span>{t("edit")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRoleTargetUser(mentor)}>
                            <Shield className="size-3.5 me-2" />
                            <span>{t("changeRole")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPasswordTargetUser(mentor)}>
                            <KeyRound className="size-3.5 me-2" />
                            <span>{t("resetPassword")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setStatusTargetUser(mentor)}>
                            {mentor.isActive ? (
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
                            onClick={() => setDeleteTargetUser(mentor)}
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
        </TabsContent>

        {/* Tab 2: Mentor Applications */}
        <TabsContent value="applications" className="pt-2">
          <RoleApplications role="mentor" embedded />
        </TabsContent>
      </Tabs>

      {/* Mentor Details Dialog */}
      <Dialog open={!!selectedMentor} onOpenChange={(open) => !open && setSelectedMentor(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedMentor && (
            <div className="flex flex-col gap-6">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={selectedMentor.avatar || undefined} />
                    <AvatarFallback className="text-sm font-semibold">
                      {selectedMentor.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-lg font-bold">{selectedMentor.name}</DialogTitle>
                    <DialogDescription className="break-all">{selectedMentor.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Bio & Overview */}
              {selectedMentor.bio && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-border/70 bg-card p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("mentorBio")}
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedMentor.bio}
                  </p>
                </div>
              )}

              {/* Institution */}
              {selectedMentor.institution && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="size-4 text-primary" />
                  <span>{selectedMentor.institution}</span>
                </div>
              )}

              {/* Expertise Tags */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Sparkles className="size-4 text-cyan-500" />
                    <span>{t("expertise")}</span>
                  </h4>
                  {selectedMentor.skills && selectedMentor.skills.length > 0 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">
                      {selectedMentor.skills.length}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg border border-border/50 bg-muted/20">
                  {selectedMentor.skills?.length ? (
                    selectedMentor.skills.map((skill, idx) => (
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

              {/* Slots Schedule */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Calendar className="size-4 text-primary" />
                    <span>{t("slots")}</span>
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {t("recordedSlots", { count: selectedMentor.slotsCount || 0 })}
                  </Badge>
                </div>

                {selectedMentor.slots?.length ? (
                  <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden">
                    {selectedMentor.slots.map((slot) => {
                      const start = new Date(slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      const end = new Date(slot.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      const date = new Date(slot.startTime).toLocaleDateString()
                      return (
                        <div key={slot.id} className="flex items-center justify-between p-3 text-xs bg-card">
                          <span className="font-medium text-foreground">{date} · {start} - {end}</span>
                          {slot.teamId ? (
                            <Badge variant="secondary" className="text-[10px]">{t("slotBooked")}</Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px] bg-emerald-600/20 text-emerald-600 dark:text-emerald-400">{t("slotAvailable")}</Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl">
                    {t("noSlotsAnnounced")}
                  </p>
                )}
              </div>

              {/* Quick Admin Actions */}
              <div className="border-t border-border/50 pt-4 flex flex-wrap items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setEditingUser(selectedMentor)}
                >
                  <Pencil className="size-3.5 text-primary" />
                  <span>{t("edit")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setRoleTargetUser(selectedMentor)}
                >
                  <Shield className="size-3.5 text-indigo-500" />
                  <span>{t("changeRole")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setPasswordTargetUser(selectedMentor)}
                >
                  <KeyRound className="size-3.5 text-amber-500" />
                  <span>{t("resetPassword")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => setStatusTargetUser(selectedMentor)}
                >
                  {selectedMentor.isActive ? (
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
        isMentor={true}
        onSuccess={() => {
          fetchMentors(true)
          if (selectedMentor && editingUser && selectedMentor.id === editingUser.id) {
            setSelectedMentor(null)
          }
        }}
      />
      <ChangeRoleModal
        isOpen={!!roleTargetUser}
        onClose={() => setRoleTargetUser(null)}
        user={roleTargetUser}
        onSuccess={() => {
          fetchMentors(true)
          if (selectedMentor && roleTargetUser && selectedMentor.id === roleTargetUser.id) {
            setSelectedMentor(null)
          }
        }}
      />
      <ResetPasswordModal
        isOpen={!!passwordTargetUser}
        onClose={() => setPasswordTargetUser(null)}
        user={passwordTargetUser}
        onSuccess={() => fetchMentors(true)}
      />
      <ToggleStatusModal
        isOpen={!!statusTargetUser}
        onClose={() => setStatusTargetUser(null)}
        user={statusTargetUser}
        onSuccess={() => {
          fetchMentors(true)
          if (selectedMentor && statusTargetUser && selectedMentor.id === statusTargetUser.id) {
            setSelectedMentor((prev) => prev ? { ...prev, isActive: !prev.isActive } : null)
          }
        }}
      />
      <DeleteUserModal
        isOpen={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        user={deleteTargetUser}
        onSuccess={() => {
          setSelectedMentor(null)
          fetchMentors(true)
        }}
      />
    </div>
  )
}

