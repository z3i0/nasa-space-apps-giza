"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import { PageHeader } from "@/components/dashboard/page-header"
import { Link } from "@/i18n/routing"
import {
  Users,
  Compass,
  Plus,
  Rocket,
  Shield,
  Clock,
  Sparkles,
  Share2,
  UserPlus,
  LogOut,
  CheckCircle2,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Crown,
  FileText,
  Target,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Send,
  Lock,
  Pencil,
  MoreVertical,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAuthUser, getAuthUser } from "@/lib/auth"
import {
  fetchTeamById,
  fetchMyTeam,
  leaveTeam,
  removeTeamMember,
  transferLeadership,
  inviteMember,
  requestToJoinTeam,
  respondToJoinRequest,
  type TeamDetails,
  type TeamMember,
} from "@/lib/teams"
import { EditTeamDialog } from "@/components/teams/edit-team-dialog"
import { ConfirmActionDialog } from "@/components/teams/confirm-action-dialog"

const MY_TEAM_CACHE_KEY = "my_team_cache"

interface StoredTeamData {
  userId?: string
  team: TeamDetails
}

function getStoredTeam(): StoredTeamData | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(MY_TEAM_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      if ("team" in parsed && parsed.team) return parsed as StoredTeamData
      if ("id" in parsed && parsed.id) return { team: parsed as TeamDetails }
    }
    return null
  } catch {
    return null
  }
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

export interface SpecificTeamClientProps {
  teamId: string
  initialTeam?: TeamDetails | null
  initialMyTeam?: TeamDetails | null
}

export function SpecificTeamClient({
  teamId,
  initialTeam,
  initialMyTeam,
}: SpecificTeamClientProps) {
  const t = useTranslations("Teams.myTeam")
  const tFind = useTranslations("Teams.findTeam")
  const locale = useLocale()
  const user = useAuthUser()
  const currentUser = user || (typeof window !== "undefined" ? getAuthUser() : null)

  const [team, setTeam] = React.useState<TeamDetails | null | undefined>(() => {
    if (initialTeam !== undefined) return initialTeam
    const cached = getStoredTeam()
    if (cached?.team && (cached.team.id === teamId || cached.team.name === teamId)) {
      return cached.team
    }
    return undefined
  })
  const [myTeam, setMyTeam] = React.useState<TeamDetails | null | undefined>(() => {
    if (initialMyTeam !== undefined) return initialMyTeam
    const cached = getStoredTeam()
    return cached?.team || null
  })
  const [loading, setLoading] = React.useState(team === undefined)
  const [error, setError] = React.useState("")
  const [copied, setCopied] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)

  // Leader invite state
  const [inviteUsername, setInviteUsername] = React.useState("")
  const [inviting, setInviting] = React.useState(false)

  // Outsider join state
  const [joinMessage, setJoinMessage] = React.useState("")
  const [sendingJoin, setSendingJoin] = React.useState(false)
  const [joinSent, setJoinSent] = React.useState(false)

  // Confirmation dialog state
  type ConfirmModalType = "leave" | "remove" | "transfer" | null
  const [confirmType, setConfirmType] = React.useState<ConfirmModalType>(null)
  const [targetMember, setTargetMember] = React.useState<TeamMember | null>(null)
  const [confirmLoading, setConfirmLoading] = React.useState(false)

  // Hydrate immediately before paint if cached team matches and no SSR initialTeam
  useIsomorphicLayoutEffect(() => {
    if (initialTeam !== undefined) return
    const cached = getStoredTeam()
    const cu = getAuthUser()
    if (cached?.team && (!cu?.id || !cached.userId || cached.userId === cu.id)) {
      setMyTeam(cached.team)
      if (cached.team.id === teamId || cached.team.name === teamId) {
        setTeam(cached.team)
        setLoading(false)
      }
    }
  }, [teamId, initialTeam])

  const loadData = React.useCallback(async (silent = false) => {
    if (!teamId) return
    if (!silent) {
      setLoading(true)
    }
    setError("")
    try {
      const [teamData, myTeamData] = await Promise.all([
        fetchTeamById(teamId),
        fetchMyTeam().catch(() => ({ team: null })),
      ])
      setTeam(teamData)
      setMyTeam(myTeamData.team)
      const cu = getAuthUser()
      if (myTeamData.team) {
        localStorage.setItem(
          MY_TEAM_CACHE_KEY,
          JSON.stringify({ userId: cu?.id || "", team: myTeamData.team })
        )
      }
    } catch (err: any) {
      console.error("Failed to load team by id:", err)
      if (!silent) {
        setError(err?.message || "Failed to load team")
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [teamId])

  React.useEffect(() => {
    const hasData = team !== undefined
    void loadData(hasData)
  }, [loadData])

  // Identity checks
  const isMember = Boolean(
    team &&
      currentUser?.id &&
      team.members?.some((m) => m.userId === currentUser.id)
  )

  const isLeader = Boolean(
    team &&
      currentUser?.id &&
      (team.createdById === currentUser.id ||
        team.members?.some((m) => m.userId === currentUser.id && m.role === "leader"))
  )

  const userHasAnyTeam = Boolean(myTeam)
  const isTeamFull = Boolean(team && team.members.length >= team.maxMembers)

  const handleCopyLink = () => {
    if (typeof window === "undefined" || !team) return
    const teamUrl = `${window.location.origin}/${locale}/dashboard/participant/team/${team.id}`
    navigator.clipboard.writeText(teamUrl)
    setCopied(true)
    toast.success(t("linkCopied"))
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenLeaveDialog = () => {
    setConfirmType("leave")
  }

  const handleOpenRemoveDialog = (member: TeamMember) => {
    setTargetMember(member)
    setConfirmType("remove")
  }

  const handleOpenTransferDialog = (member: TeamMember) => {
    setTargetMember(member)
    setConfirmType("transfer")
  }

  const handleExecuteConfirm = async () => {
    if (!team) return
    setConfirmLoading(true)
    try {
      if (confirmType === "leave") {
        if (!currentUser?.id) return
        await leaveTeam(team.id, currentUser.id)
        localStorage.removeItem(MY_TEAM_CACHE_KEY)
        toast.success(t("leaveSuccess"))
        setConfirmType(null)
        void loadData(false)
      } else if (confirmType === "remove" && targetMember) {
        await removeTeamMember(team.id, targetMember.userId)
        toast.success(t("removeMemberSuccess"))
        setConfirmType(null)
        setTargetMember(null)
        void loadData(true)
      } else if (confirmType === "transfer" && targetMember) {
        await transferLeadership(team.id, targetMember.userId)
        toast.success(t("transferLeaderSuccess"))
        setConfirmType(null)
        setTargetMember(null)
        void loadData(true)
      }
    } catch (err: any) {
      toast.error(err?.message || t("actionFailed"))
    } finally {
      setConfirmLoading(false)
    }
  }

  const confirmConfig = React.useMemo(() => {
    if (confirmType === "leave") {
      return {
        title: t("confirmLeaveTitle"),
        description: isLeader ? t("leaveConfirmLeader") : t("leaveConfirmMember"),
        confirmText: t("leaveTeam"),
        variant: "destructive" as const,
        icon: LogOut,
      }
    }
    if (confirmType === "remove" && targetMember) {
      return {
        title: t("confirmRemoveTitle"),
        description: t("removeMemberConfirm", { name: targetMember.user?.name || "" }),
        confirmText: t("removeMemberBtn"),
        variant: "destructive" as const,
        icon: AlertTriangle,
      }
    }
    if (confirmType === "transfer" && targetMember) {
      return {
        title: t("confirmTransferTitle"),
        description: t("transferLeaderConfirm", { name: targetMember.user?.name || "" }),
        confirmText: t("transferLeaderBtn"),
        variant: "default" as const,
        icon: Crown,
      }
    }
    return null
  }, [confirmType, targetMember, isLeader, t])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team || !inviteUsername.trim()) return
    setInviting(true)
    try {
      await inviteMember(team.id, inviteUsername.trim())
      toast.success(t("inviteSent"))
      setInviteUsername("")
      void loadData(true)
    } catch (err: any) {
      toast.error(err?.message || t("actionFailed"))
    } finally {
      setInviting(false)
    }
  }

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team) return
    setSendingJoin(true)
    try {
      await requestToJoinTeam(team.id, joinMessage.trim())
      toast.success(tFind("joinRequestSent"))
      setJoinSent(true)
      setJoinMessage("")
    } catch (err: any) {
      toast.error(err?.message || t("actionFailed"))
    } finally {
      setSendingJoin(false)
    }
  }

  const handleJoinResponse = async (requestId: string, accept: boolean) => {
    try {
      await respondToJoinRequest(requestId, accept)
      toast.success(accept ? t("requestAccepted") : t("requestRejected"))
      void loadData(true)
    } catch (err: any) {
      toast.error(err?.message || t("actionFailed"))
    }
  }

  const isInitialLoading = loading || team === undefined

  return (
    <RoleGuard allowedRoles={["participant"]}>
      <div className="w-full flex flex-col gap-6">
        {/* Page Header */}
        <PageHeader
          icon={Users}
          title={team ? team.name : isInitialLoading ? "" : t("title")}
          subtitle={
            team
              ? (team.track || t("subtitleWithTeam"))
              : isInitialLoading
                ? t("subtitleWithTeam")
                : t("subtitleNoTeam")
          }
          actions={
            isInitialLoading && !team ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-28 rounded-xl" />
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            ) : team ? (
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {isLeader && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                    className="rounded-xl text-xs h-9 gap-1.5 cursor-pointer shadow-xs border-primary/30 hover:bg-primary/5 text-primary"
                  >
                    <Pencil className="size-3.5" />
                    <span>{t("editTeamBtn")}</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="rounded-xl text-xs h-9 gap-1.5 cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  <span>{t("shareTeam")}</span>
                </Button>

                {isMember && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleOpenLeaveDialog}
                    className="rounded-xl text-xs h-9 gap-1.5 cursor-pointer shadow-xs"
                  >
                    <LogOut className="size-3.5" />
                    <span>{t("leaveTeam")}</span>
                  </Button>
                )}

                <Link
                  href="/dashboard/participant/find-team"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-xl text-xs h-9 px-3 gap-1.5 cursor-pointer shadow-xs"
                  )}
                >
                  <Compass className="size-3.5 text-primary" />
                  <span>{tFind("title")}</span>
                </Link>
              </div>
            ) : null
          }
        />

        {/* Loading State */}
        {isInitialLoading && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-border/60 p-6 space-y-4">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-96 rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            </Card>
          </div>
        )}

        {/* Error / Not Found State */}
        {!isInitialLoading && (error || !team) && (
          <Card className="rounded-2xl border-border/60 p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {locale === "ar" ? "لم نتمكن من العثور على هذا الفريق" : "Team not found"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {locale === "ar"
                  ? "قد يكون الرابط غير صحيح أو تم حذف هذا الفريق."
                  : "The link may be invalid or the team might have been removed."}
              </p>
            </div>
            <Link
              href="/dashboard/participant/find-team"
              className={cn(
                buttonVariants(),
                "rounded-xl text-xs h-9 font-semibold gap-1.5 cursor-pointer shadow-xs"
              )}
            >
              <Compass className="size-3.5" />
              <span>{tFind("title")}</span>
            </Link>
          </Card>
        )}

        {/* Active Team View */}
        {!isInitialLoading && team && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Primary Column */}
            <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
              {/* Team Information Card */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <CardTitle className="text-lg sm:text-xl font-bold">
                          {team.name}
                        </CardTitle>
                        {team.track && (
                          <Badge variant="secondary" className="rounded-full text-xs font-medium px-2.5 py-0.5">
                            {team.track}
                          </Badge>
                        )}
                        {team.challenge && (
                          <Badge variant="outline" className="rounded-full text-xs font-medium px-2.5 py-0.5 border-primary/20 text-primary bg-primary/5">
                            {team.challenge}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs sm:text-sm pt-1">
                        {team.description || t("noDescription")}
                      </CardDescription>
                    </div>

                    {isLeader && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditOpen(true)}
                        className="shrink-0 rounded-xl text-xs h-8 gap-1.5 cursor-pointer shadow-xs border-border hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="size-3.5 text-primary" />
                        <span className="hidden sm:inline">{t("editTeamBtn")}</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                      <span className="text-xs text-muted-foreground block">{t("membersCountLabel")}</span>
                      <span className="text-lg font-bold text-foreground font-mono">
                        {team.members.length} / {team.maxMembers}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                      <span className="text-xs text-muted-foreground block">{t("tasksCountLabel")}</span>
                      <span className="text-lg font-bold text-foreground font-mono">
                        {team.tasks?.length || 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                      <span className="text-xs text-muted-foreground block">{t("yourRoleLabel")}</span>
                      <span className="text-xs font-semibold text-primary mt-1 block">
                        {isLeader ? t("roleLeader") : isMember ? t("roleMember") : (locale === "ar" ? "غير منضم" : "Not a member")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Members List Card */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{t("teamMembersTitle")}</CardTitle>
                        <CardDescription className="text-xs">
                          {team.members.length} {t("outOf")} {team.maxMembers} {t("slotsFilled")}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-5 space-y-3">
                  {team.members.map((member) => {
                    const memberName = member.user?.name || "Participant"
                    const memberInitials = memberName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                    const isMemberLeader = member.role === "leader"

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 ring-1 ring-border">
                            <AvatarImage src={member.user?.avatar || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {memberInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground">
                                {memberName}
                              </span>
                              {member.user?.username && (
                                <span className="text-xs font-mono text-muted-foreground/80">
                                  @{member.user.username}
                                </span>
                              )}
                              {isMemberLeader && (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full text-[10px] px-2 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold gap-1 inline-flex items-center"
                                >
                                  <Crown className="size-2.5" />
                                  <span>{t("roleLeader")}</span>
                                </Badge>
                              )}
                              {member.userId === user?.id && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {t("youBadge")}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {member.assignedRole || member.user?.profile?.desiredRole || t("roleMember")}
                            </p>
                          </div>
                        </div>

                        {/* Member Skills Chips */}
                        {member.user?.profile?.skills && member.user.profile.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:max-w-xs justify-start sm:justify-end">
                            {member.user.profile.skills.slice(0, 3).map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className="text-[10px] px-2 py-0 border-primary/20 bg-primary/5 text-primary"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Leader Actions on other members */}
                        {isLeader && !isMemberLeader && member.userId !== user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button
                                  type="button"
                                  aria-label={t("memberActions")}
                                  className="size-8 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                />
                              }
                            >
                              <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                onClick={() => handleOpenTransferDialog(member)}
                              >
                                <Crown className="size-3.5 text-amber-500" />
                                {t("transferLeaderBtn")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer text-xs"
                                onClick={() => handleOpenRemoveDialog(member)}
                              >
                                <X className="size-3.5" />
                                {t("removeMemberBtn")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Join Requests (Leader Only) */}
              {isLeader && team.joinRequests && team.joinRequests.length > 0 && (
                <Card className="rounded-2xl border-border/60 shadow-xs border-amber-500/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-500" />
                      <CardTitle className="text-sm font-bold">
                        {t("pendingJoinRequestsTitle")} ({team.joinRequests.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-4 space-y-3">
                    {team.joinRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/40 gap-3"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">
                            {req.user?.name || "Participant"}
                          </p>
                          {req.message && (
                            <p className="text-xs text-muted-foreground italic">
                              &ldquo;{req.message}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleJoinResponse(req.id, true)}
                            className="rounded-lg text-xs h-8 px-3 gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Check className="size-3" />
                            <span>{t("acceptBtn")}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleJoinResponse(req.id, false)}
                            className="rounded-lg text-xs h-8 px-3 gap-1 cursor-pointer text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <X className="size-3" />
                            <span>{t("rejectBtn")}</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 flex flex-col gap-6 min-w-0">
              {/* If user is NOT a member: Join Team Card */}
              {!isMember && (
                <Card className="rounded-2xl border-border/60 shadow-xs border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="size-4 text-primary" />
                      <CardTitle className="text-sm font-bold">{tFind("requestJoinBtn")}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {isTeamFull
                        ? (locale === "ar" ? "هذا الفريق مكتمل العدد حالياً." : "This team has reached maximum capacity.")
                        : userHasAnyTeam
                          ? (locale === "ar" ? "أنت مسجل بالفعل في فريق آخر. يجب مغادرته أولاً قبل الانضمام لفريق جديد." : "You are already in a team.")
                          : (locale === "ar" ? "أرسل طلباً لقائد الفريق للانضمام والمشاركة في المشروع." : "Send a join request to the team leader.")}
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-4 space-y-3">
                    {joinSent ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{tFind("joinRequestSent")}</span>
                      </div>
                    ) : (
                      <form onSubmit={handleJoinSubmit} className="space-y-3">
                        <Textarea
                          value={joinMessage}
                          onChange={(e) => setJoinMessage(e.target.value)}
                          placeholder={tFind("joinMessagePlaceholder")}
                          disabled={sendingJoin || isTeamFull || userHasAnyTeam}
                          rows={3}
                          className="rounded-xl text-xs resize-none"
                        />
                        <Button
                          type="submit"
                          disabled={sendingJoin || isTeamFull || userHasAnyTeam}
                          className="w-full rounded-xl text-xs h-9 cursor-pointer gap-1.5 font-semibold"
                        >
                          {sendingJoin ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Send className="size-3.5" />
                          )}
                          <span>{tFind("sendRequestBtn")}</span>
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Invite Member Card (Leader only) */}
              {isLeader && (
                <Card className="rounded-2xl border-border/60 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="size-4 text-primary" />
                      <CardTitle className="text-sm font-bold">{t("inviteMemberTitle")}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {t("inviteMemberDesc")}
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-4 space-y-3">
                    <form onSubmit={handleInvite} className="space-y-2">
                      <Input
                        type="text"
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        placeholder={t("inviteUsernamePlaceholder")}
                        required
                        disabled={inviting || team.members.length >= team.maxMembers}
                        className="rounded-xl text-xs h-9"
                      />
                      <Button
                        type="submit"
                        disabled={inviting || !inviteUsername.trim() || team.members.length >= team.maxMembers}
                        className="w-full rounded-xl text-xs h-9 cursor-pointer gap-1.5 font-semibold"
                      >
                        {inviting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="size-3.5" />
                        )}
                        <span>{t("sendInviteBtn")}</span>
                      </Button>
                    </form>
                    {team.members.length >= team.maxMembers && (
                      <p className="text-xs text-amber-500 font-medium">
                        {t("teamFullNotice")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Mentorship Support Card */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Compass className="size-4 text-sky-500" />
                    <CardTitle className="text-sm font-bold">{t("mentorCardTitle")}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {t("mentorCardDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link
                    href="/dashboard/participant/mentorship"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full rounded-xl h-9 text-xs font-semibold cursor-pointer gap-2"
                    )}
                  >
                    <span>{t("requestMentorBtn")}</span>
                    <span aria-hidden="true">{locale === "ar" ? "←" : "→"}</span>
                  </Link>
                </CardContent>
              </Card>

              {/* Direct Link Share Card */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="size-4 text-primary" />
                    <CardTitle className="text-sm font-bold">{t("shareTeam")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="p-2.5 rounded-xl bg-muted/50 border border-border/50 text-[11px] font-mono break-all text-muted-foreground">
                    {typeof window !== "undefined" ? `${window.location.origin}/${locale}/dashboard/participant/team/${team.id}` : `/team/${team.id}`}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCopyLink}
                    className="w-full rounded-xl text-xs h-9 cursor-pointer gap-1.5"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    <span>{t("shareTeam")}</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Edit Team Dialog */}
        <EditTeamDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          team={team || null}
          onSuccess={(updated) => {
            setTeam(updated)
            if (updated.id !== teamId && updated.name !== teamId) {
              window.history.replaceState(null, "", `/${locale}/dashboard/participant/team/${encodeURIComponent(updated.id)}`)
            }
          }}
        />

        {confirmConfig && (
          <ConfirmActionDialog
            open={Boolean(confirmType)}
            onOpenChange={(open) => {
              if (!open && !confirmLoading) {
                setConfirmType(null)
                setTargetMember(null)
              }
            }}
            title={confirmConfig.title}
            description={confirmConfig.description}
            confirmText={confirmConfig.confirmText}
            cancelText={t("confirmCancel")}
            variant={confirmConfig.variant}
            icon={confirmConfig.icon}
            loading={confirmLoading}
            onConfirm={handleExecuteConfirm}
          />
        )}
      </div>
    </RoleGuard>
  )
}
