"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import { PageHeader } from "@/components/dashboard/page-header"
import { Link } from "@/i18n/routing"
import {
  Users,
  Compass,
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
  Crown,
  Loader2,
  Send,
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
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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

export interface SpecificTeamClientProps {
  teamId: string
  initialTeam?: TeamDetails | null
  initialMyTeam?: TeamDetails | null
}

export function SpecificTeamClient(props: SpecificTeamClientProps) {
  const user = useAuthUser()
  const ownTeam =
    user?.id &&
    props.initialMyTeam?.members.some((member) => member.userId === user.id)
      ? props.initialMyTeam
      : undefined
  return (
    <SpecificTeamContent
      key={`${user?.id || "session"}:${props.teamId}`}
      {...props}
      initialMyTeam={ownTeam}
    />
  )
}

function SpecificTeamContent({
  teamId,
  initialTeam,
  initialMyTeam,
}: SpecificTeamClientProps) {
  const t = useTranslations("Teams.myTeam")
  const tFind = useTranslations("Teams.findTeam")
  const locale = useLocale()
  const user = useAuthUser()
  const currentUser =
    user || (typeof window !== "undefined" ? getAuthUser() : null)

  const [team, setTeam] = React.useState<TeamDetails | null | undefined>(
    initialTeam
  )
  const [myTeam, setMyTeam] = React.useState<TeamDetails | null | undefined>(
    initialMyTeam
  )
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
  const [targetMember, setTargetMember] = React.useState<TeamMember | null>(
    null
  )
  const [confirmLoading, setConfirmLoading] = React.useState(false)

  const loadData = React.useCallback(
    async (silent = false) => {
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
      } catch (err) {
        console.error("Failed to load team by id:", err)
        if (!silent) {
          setError(
            (err instanceof Error ? err.message : "") || "Failed to load team"
          )
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [teamId]
  )

  React.useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetchTeamById(teamId, controller.signal),
      fetchMyTeam(controller.signal),
    ])
      .then(([detail, mine]) => {
        if (!controller.signal.aborted) {
          setTeam(detail)
          setMyTeam(mine.team)
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : t("actionFailed"))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [teamId, t])

  // Identity checks
  const isMember = Boolean(
    team &&
    currentUser?.id &&
    team.members?.some((m) => m.userId === currentUser.id)
  )

  const isLeader = Boolean(
    team &&
    currentUser?.id &&
    team.members?.some(
      (m) => m.userId === currentUser.id && m.role === "leader"
    )
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
    } catch (err) {
      toast.error(
        (err instanceof Error ? err.message : "") || t("actionFailed")
      )
    } finally {
      setConfirmLoading(false)
    }
  }

  const confirmConfig = React.useMemo(() => {
    if (confirmType === "leave") {
      return {
        title: t("confirmLeaveTitle"),
        description: isLeader
          ? t("leaveConfirmLeader")
          : t("leaveConfirmMember"),
        confirmText: t("leaveTeam"),
        variant: "destructive" as const,
        icon: LogOut,
      }
    }
    if (confirmType === "remove" && targetMember) {
      return {
        title: t("confirmRemoveTitle"),
        description: t("removeMemberConfirm", {
          name: targetMember.user?.name || "",
        }),
        confirmText: t("removeMemberBtn"),
        variant: "destructive" as const,
        icon: AlertTriangle,
      }
    }
    if (confirmType === "transfer" && targetMember) {
      return {
        title: t("confirmTransferTitle"),
        description: t("transferLeaderConfirm", {
          name: targetMember.user?.name || "",
        }),
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
    } catch (err) {
      toast.error(
        (err instanceof Error ? err.message : "") || t("actionFailed")
      )
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
    } catch (err) {
      toast.error(
        (err instanceof Error ? err.message : "") || t("actionFailed")
      )
    } finally {
      setSendingJoin(false)
    }
  }

  const handleJoinResponse = async (requestId: string, accept: boolean) => {
    try {
      await respondToJoinRequest(requestId, accept)
      toast.success(accept ? t("requestAccepted") : t("requestRejected"))
      void loadData(true)
    } catch (err) {
      toast.error(
        (err instanceof Error ? err.message : "") || t("actionFailed")
      )
    }
  }

  const isInitialLoading = loading || team === undefined

  return (
    <RoleGuard allowedRoles={["participant"]}>
      <div className="flex w-full flex-col gap-6">
        {/* Page Header */}
        <PageHeader
          icon={Users}
          title={team ? team.name : isInitialLoading ? "" : t("title")}
          subtitle={
            team
              ? team.track || t("subtitleWithTeam")
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
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {isLeader && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                    className="h-9 cursor-pointer gap-1.5 rounded-xl border-primary/30 text-xs text-primary shadow-xs hover:bg-primary/5"
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
                  className="h-9 cursor-pointer gap-1.5 rounded-xl text-xs shadow-xs"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span>{t("shareTeam")}</span>
                </Button>

                {isMember && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleOpenLeaveDialog}
                    className="h-9 cursor-pointer gap-1.5 rounded-xl text-xs shadow-xs"
                  >
                    <LogOut className="size-3.5" />
                    <span>{t("leaveTeam")}</span>
                  </Button>
                )}

                <Link
                  href="/dashboard/participant/find-team"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-9 cursor-pointer gap-1.5 rounded-xl px-3 text-xs shadow-xs"
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
            <Card className="space-y-4 rounded-2xl border-border/60 p-6">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-96 rounded" />
              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            </Card>
          </div>
        )}

        {/* Error / Not Found State */}
        {!isInitialLoading && (error || !team) && (
          <Card className="mx-auto max-w-lg space-y-4 rounded-2xl border-border/60 p-12 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {locale === "ar"
                  ? "لم نتمكن من العثور على هذا الفريق"
                  : "Team not found"}
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
                "h-9 cursor-pointer gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
              )}
            >
              <Compass className="size-3.5" />
              <span>{tFind("title")}</span>
            </Link>
          </Card>
        )}

        {/* Active Team View */}
        {!isInitialLoading && team && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Primary Column */}
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
              {/* Team Information Card */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <CardTitle className="text-lg font-bold sm:text-xl">
                          {team.name}
                        </CardTitle>
                        {team.track && (
                          <Badge
                            variant="secondary"
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          >
                            {team.track}
                          </Badge>
                        )}
                        {team.challenge && (
                          <Badge
                            variant="outline"
                            className="rounded-full border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {team.challenge}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="pt-1 text-xs sm:text-sm">
                        {team.description || t("noDescription")}
                      </CardDescription>
                    </div>

                    {isLeader && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditOpen(true)}
                        className="h-8 shrink-0 cursor-pointer gap-1.5 rounded-xl border-border text-xs shadow-xs hover:border-primary/40 hover:text-primary"
                      >
                        <Pencil className="size-3.5 text-primary" />
                        <span className="hidden sm:inline">
                          {t("editTeamBtn")}
                        </span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-4 pt-5">
                  <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
                    <div className="rounded-xl border border-border/50 bg-muted/40 p-3">
                      <span className="block text-xs text-muted-foreground">
                        {t("membersCountLabel")}
                      </span>
                      <span className="font-mono text-lg font-bold text-foreground">
                        {team.members.length} / {team.maxMembers}
                      </span>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/40 p-3">
                      <span className="block text-xs text-muted-foreground">
                        {t("tasksCountLabel")}
                      </span>
                      <span className="font-mono text-lg font-bold text-foreground">
                        {team.tasks?.length || 0}
                      </span>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/40 p-3">
                      <span className="block text-xs text-muted-foreground">
                        {t("yourRoleLabel")}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-primary">
                        {isLeader
                          ? t("roleLeader")
                          : isMember
                            ? t("roleMember")
                            : locale === "ar"
                              ? "غير منضم"
                              : "Not a member"}
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
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">
                          {t("teamMembersTitle")}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {team.members.length} {t("outOf")} {team.maxMembers}{" "}
                          {t("slotsFilled")}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-3 pt-5">
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
                        className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 ring-1 ring-border">
                            <AvatarImage
                              src={member.user?.avatar || undefined}
                            />
                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                              {memberInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-foreground">
                                {memberName}
                              </span>
                              {member.user?.username && (
                                <span className="font-mono text-xs text-muted-foreground/80">
                                  @{member.user.username}
                                </span>
                              )}
                              {isMemberLeader && (
                                <Badge
                                  variant="secondary"
                                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                                >
                                  <Crown className="size-2.5" />
                                  <span>{t("roleLeader")}</span>
                                </Badge>
                              )}
                              {member.userId === user?.id && (
                                <Badge
                                  variant="outline"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  {t("youBadge")}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {member.assignedRole ||
                                member.user?.profile?.desiredRole ||
                                t("roleMember")}
                            </p>
                          </div>
                        </div>

                        {/* Member Skills Chips */}
                        {member.user?.profile?.skills &&
                          member.user.profile.skills.length > 0 && (
                            <div className="flex flex-wrap justify-start gap-1 sm:max-w-xs sm:justify-end">
                              {member.user.profile.skills
                                .slice(0, 3)
                                .map((skill) => (
                                  <Badge
                                    key={skill}
                                    variant="outline"
                                    className="border-primary/20 bg-primary/5 px-2 py-0 text-[10px] text-primary"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                            </div>
                          )}

                        {/* Leader Actions on other members */}
                        {isLeader &&
                          !isMemberLeader &&
                          member.userId !== user?.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <button
                                    type="button"
                                    aria-label={t("memberActions")}
                                    className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  />
                                }
                              >
                                <MoreVertical className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align={locale === "ar" ? "start" : "end"}
                              >
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs"
                                  onClick={() =>
                                    handleOpenTransferDialog(member)
                                  }
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
              {isLeader &&
                team.joinRequests &&
                team.joinRequests.length > 0 && (
                  <Card className="rounded-2xl border-amber-500/30 border-border/60 shadow-xs">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-amber-500" />
                        <CardTitle className="text-sm font-bold">
                          {t("pendingJoinRequestsTitle")} (
                          {team.joinRequests.length})
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-3 pt-4">
                      {team.joinRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 p-3.5 sm:flex-row sm:items-center"
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
                              className="h-8 cursor-pointer gap-1 rounded-lg bg-emerald-600 px-3 text-xs hover:bg-emerald-700"
                            >
                              <Check className="size-3" />
                              <span>{t("acceptBtn")}</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleJoinResponse(req.id, false)}
                              className="h-8 cursor-pointer gap-1 rounded-lg border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10"
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
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
              {/* If user is NOT a member: Join Team Card */}
              {!isMember && (
                <Card className="rounded-2xl border-border/60 border-primary/20 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="size-4 text-primary" />
                      <CardTitle className="text-sm font-bold">
                        {tFind("requestJoinBtn")}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {isTeamFull
                        ? locale === "ar"
                          ? "هذا الفريق مكتمل العدد حالياً."
                          : "This team has reached maximum capacity."
                        : userHasAnyTeam
                          ? locale === "ar"
                            ? "أنت مسجل بالفعل في فريق آخر. يجب مغادرته أولاً قبل الانضمام لفريق جديد."
                            : "You are already in a team."
                          : locale === "ar"
                            ? "أرسل طلباً لقائد الفريق للانضمام والمشاركة في المشروع."
                            : "Send a join request to the team leader."}
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="space-y-3 pt-4">
                    {joinSent ? (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
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
                          className="resize-none rounded-xl text-xs"
                        />
                        <Button
                          type="submit"
                          disabled={sendingJoin || isTeamFull || userHasAnyTeam}
                          className="h-9 w-full cursor-pointer gap-1.5 rounded-xl text-xs font-semibold"
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
                      <CardTitle className="text-sm font-bold">
                        {t("inviteMemberTitle")}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {t("inviteMemberDesc")}
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="space-y-3 pt-4">
                    <form onSubmit={handleInvite} className="space-y-2">
                      <Input
                        type="text"
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        placeholder={t("inviteUsernamePlaceholder")}
                        required
                        disabled={
                          inviting || team.members.length >= team.maxMembers
                        }
                        className="h-9 rounded-xl text-xs"
                      />
                      <Button
                        type="submit"
                        disabled={
                          inviting ||
                          !inviteUsername.trim() ||
                          team.members.length >= team.maxMembers
                        }
                        className="h-9 w-full cursor-pointer gap-1.5 rounded-xl text-xs font-semibold"
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
                      <p className="text-xs font-medium text-amber-500">
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
                    <CardTitle className="text-sm font-bold">
                      {t("mentorCardTitle")}
                    </CardTitle>
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
                      "h-9 w-full cursor-pointer gap-2 rounded-xl text-xs font-semibold"
                    )}
                  >
                    <span>{t("requestMentorBtn")}</span>
                    <span aria-hidden="true">
                      {locale === "ar" ? "←" : "→"}
                    </span>
                  </Link>
                </CardContent>
              </Card>

              {/* Direct Link Share Card */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="size-4 text-primary" />
                    <CardTitle className="text-sm font-bold">
                      {t("shareTeam")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="rounded-xl border border-border/50 bg-muted/50 p-2.5 font-mono text-[11px] break-all text-muted-foreground">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/${locale}/dashboard/participant/team/${team.id}`
                      : `/team/${team.id}`}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCopyLink}
                    className="h-9 w-full cursor-pointer gap-1.5 rounded-xl text-xs"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
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
          onSuccess={() => void loadData()}
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
