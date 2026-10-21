"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { RoleGuard } from "@/components/role-guard"
import { PageHeader } from "@/components/dashboard/page-header"
import { Link } from "@/i18n/routing"
import {
  Compass,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Check,
  Send,
  Loader2,
  Lock,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  fetchTeams,
  fetchMyTeam,
  fetchMyInvitations,
  requestToJoinTeam,
  respondToInvitation,
  type TeamListItem,
  type TeamDetails,
  type MyTeamInvitation,
} from "@/lib/teams"
import {
  CreateTeamDialog,
  TRACK_OPTIONS,
} from "@/components/teams/create-team-dialog"

export default function FindTeamPage() {
  const t = useTranslations("Teams.findTeam")
  const tTracks = useTranslations("Teams.tracks")
  const locale = useLocale()

  const [teams, setTeams] = React.useState<TeamListItem[]>([])
  const [myTeam, setMyTeam] = React.useState<TeamDetails | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [track, setTrack] = React.useState("all")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [invitations, setInvitations] = React.useState<MyTeamInvitation[]>([])
  const [respondingId, setRespondingId] = React.useState<string | null>(null)

  // Join dialog state
  const [joinTeamId, setJoinTeamId] = React.useState<string | null>(null)
  const [joinMessage, setJoinMessage] = React.useState("")
  const [sendingJoin, setSendingJoin] = React.useState(false)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [teamsData, myTeamData, invitationsData] = await Promise.all([
        fetchTeams({
          search: search.trim() || undefined,
          track: track !== "all" ? track : undefined,
        }),
        fetchMyTeam().catch(() => ({ team: null })),
        fetchMyInvitations().catch(() => ({ invitations: [] })),
      ])
      setTeams(teamsData.teams || teamsData.items || [])
      setMyTeam(myTeamData.team)
      setInvitations(invitationsData.invitations || [])
    } catch (err) {
      console.error("Failed to load teams:", err)
      toast.error(
        (err instanceof Error ? err.message : "") || "Failed to load teams"
      )
    } finally {
      setLoading(false)
    }
  }, [search, track])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      void loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadData])

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinTeamId) return
    setSendingJoin(true)
    try {
      await requestToJoinTeam(joinTeamId, joinMessage.trim())
      toast.success(t("joinRequestSent"))
      setJoinTeamId(null)
      setJoinMessage("")
    } catch (err) {
      toast.error(
        (err instanceof Error ? err.message : "") || t("actionFailed")
      )
    } finally {
      setSendingJoin(false)
    }
  }

  const handleInvitation = async (invitationId: string, accept: boolean) => {
    setRespondingId(invitationId)
    try {
      await respondToInvitation(invitationId, accept)
      toast.success(t(accept ? "invitationAccepted" : "invitationDeclined"))
      void loadData()
    } catch (err) {
      toast.error(
        (err instanceof Error ? err.message : "") || t("actionFailed")
      )
    } finally {
      setRespondingId(null)
    }
  }

  const selectedJoinTeam = teams.find((tm) => tm.id === joinTeamId)

  return (
    <RoleGuard allowedRoles={["participant"]}>
      <div className="flex w-full flex-col gap-6">
        {/* Page Header */}
        <PageHeader
          icon={Compass}
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                <span>{t("createTeamBtn")}</span>
              </Button>
              <Link
                href="/dashboard/participant/team"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Users className="size-4 text-primary" />
                <span>{t("myTeamLink")}</span>
              </Link>
            </div>
          }
        />

        {/* Search & Filters */}
        <Card className="rounded-2xl border-border/60 p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 rounded-xl ps-9 text-xs sm:text-sm"
              />
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={track}
                onValueChange={(val) => setTrack(val || "all")}
              >
                <SelectTrigger className="h-10 w-full rounded-xl text-xs sm:text-sm">
                  <SelectValue placeholder={t("allTracks")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{t("allTracks")}</SelectItem>
                    {TRACK_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {tTracks(opt.value)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card
                key={i}
                className="space-y-4 rounded-2xl border-border/60 p-6"
              >
                <Skeleton className="h-6 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-9 rounded-xl" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && teams.length === 0 && (
          <Card className="mx-auto max-w-lg space-y-4 rounded-2xl border-border/60 p-12 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <Compass className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {t("noTeamsFound")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("noTeamsFoundDesc")}
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              <span>{t("createTeamBtn")}</span>
            </Button>
          </Card>
        )}

        {/* Received Invitations */}
        {!loading && invitations.length > 0 && (
          <Card className="space-y-4 rounded-2xl border-primary/30 bg-primary/5 p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                {t("invitationsTitle")}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4"
                >
                  <p className="text-xs leading-relaxed text-foreground">
                    {t("invitationsDesc", {
                      name: inv.invitedByUser.name,
                      team: inv.team.name,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={respondingId === inv.id}
                      onClick={() => void handleInvitation(inv.id, true)}
                    >
                      {respondingId === inv.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      <span>{t("invitationAccept")}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={respondingId === inv.id}
                      onClick={() => void handleInvitation(inv.id, false)}
                    >
                      <span>{t("invitationDecline")}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Teams Grid */}
        {!loading && teams.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((tm) => {
              const isFull = tm.membersCount >= tm.maxMembers
              const isUserInThisTeam = myTeam?.id === tm.id
              const percentage = Math.min(
                100,
                Math.round((tm.membersCount / tm.maxMembers) * 100)
              )

              return (
                <Card
                  key={tm.id}
                  className="group flex flex-col justify-between rounded-2xl border-border/60 shadow-xs transition-all hover:border-primary/40"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <CardTitle className="truncate text-base font-bold">
                          <Link
                            href={`/dashboard/participant/team/${tm.id}`}
                            className="transition-colors hover:text-primary hover:underline"
                          >
                            {tm.name}
                          </Link>
                        </CardTitle>
                        {tm.track && (
                          <Badge
                            variant="secondary"
                            className="rounded-full px-2 py-0 text-[11px] font-medium"
                          >
                            {tm.track}
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                          isFull
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-primary/30 bg-primary/10 text-primary"
                        )}
                      >
                        {tm.membersCount} / {tm.maxMembers}
                      </Badge>
                    </div>

                    <CardDescription className="line-clamp-2 pt-2 text-xs leading-relaxed">
                      {tm.description || t("noDescription")}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {/* Capacity Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                        <span>{t("slotsCapacity")}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isFull ? "bg-destructive" : "bg-primary"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>

                  <Separator />

                  <CardFooter className="pt-3 pb-3">
                    {isUserInThisTeam ? (
                      <Badge
                        variant="secondary"
                        className="h-9 w-full justify-center rounded-xl border border-primary/30 bg-primary/15 text-xs font-semibold text-primary"
                      >
                        <CheckCircle2 className="me-1 size-3.5" />
                        {t("yourTeamBadge")}
                      </Badge>
                    ) : isFull ? (
                      <Button disabled variant="ghost">
                        <Lock className="me-1 size-3.5" />
                        <span>{t("teamFull")}</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => {
                          setJoinTeamId(tm.id)
                          setJoinMessage("")
                        }}
                        className="w-full"
                      >
                        <Send className="size-3.5" />
                        <span>{t("requestJoinBtn")}</span>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* Create Team Dialog */}
        <CreateTeamDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => void loadData()}
        />

        {/* Join Request Dialog */}
        <Dialog
          open={Boolean(joinTeamId)}
          onOpenChange={(open) => !open && setJoinTeamId(null)}
        >
          <DialogContent
            className="max-w-md rounded-2xl p-6"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {t("requestJoinTitle", { team: selectedJoinTeam?.name || "" })}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("requestJoinDesc")}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleJoinSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="join-message"
                  className="block text-xs font-semibold text-foreground"
                >
                  {t("joinMessageLabel")}
                </label>
                <Textarea
                  id="join-message"
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder={t("joinMessagePlaceholder")}
                  maxLength={300}
                  className="min-h-[90px] resize-none rounded-xl text-xs sm:text-sm"
                  disabled={sendingJoin}
                />
              </div>

              <DialogFooter className="gap-2 pt-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setJoinTeamId(null)}
                  disabled={sendingJoin}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={sendingJoin}>
                  {sendingJoin ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  <span>{t("sendRequestBtn")}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}
