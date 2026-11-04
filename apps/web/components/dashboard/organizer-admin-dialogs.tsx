"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { mutate as globalMutate } from "swr"
import { toast } from "sonner"
import {
  Pencil,
  Shield,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
  Users,
  Copy,
  Check,
  RefreshCw,
  Crown,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { accountApi, type DirectoryTeam } from "@/lib/account"
import { cn } from "@/lib/utils"

export interface AdminUserTarget {
  id: string
  name: string
  email: string
  phone?: string | null
  role?: string
  avatar?: string | null
  isActive: boolean
  institution?: string | null
  skills?: string[]
  bio?: string
  availability?: string
}

export type AdminTeamTarget = DirectoryTeam

export const invalidateAdminCaches = () => {
  void globalMutate(
    (key) =>
      typeof key === "string" &&
      (key.startsWith("/directory") || key.startsWith("/organizer-summary")),
    undefined,
    { revalidate: true }
  )
}

// -------------------------------------------------------------
// 1. Edit User Modal
// -------------------------------------------------------------
export function EditUserModal({
  isOpen,
  onClose,
  user,
  onSuccess,
  isMentor = false,
}: {
  isOpen: boolean
  onClose: () => void
  user: AdminUserTarget | null
  onSuccess: () => void
  isMentor?: boolean
}) {
  const t = useTranslations("Operations")
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [institution, setInstitution] = useState("")
  const [skillsStr, setSkillsStr] = useState("")
  const [bio, setBio] = useState("")
  const [availability, setAvailability] = useState("")

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
      setInstitution(user.institution || "")
      setSkillsStr((user.skills || []).join(", "))
      setBio(user.bio || "")
      setAvailability(user.availability || "")
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!name.trim() || !email.trim()) {
      toast.error(t("nameAndEmailRequired"))
      return
    }

    setLoading(true)
    try {
      const skills = skillsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      await accountApi(`/users/${user.id}`, {
        method: "PATCH",
        body: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          institution: institution.trim() || null,
          skills,
          bio: bio.trim(),
          ...(isMentor ? { availability: availability.trim() } : {}),
        },
      })
      toast.success(t("updatedSuccess"))
      invalidateAdminCaches()
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error" as any))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" />
            <span>{t("edit")}</span>
          </DialogTitle>
          <DialogDescription>
            {user?.name} · {user?.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">{t("fullName")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("fullName")}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">{t("email")}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("email")}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">{t("phone")}</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 100 000 0000"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">{t("institutionLabel")}</label>
            <Input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder={t("institutionPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">{t("skillsCommaSeparated")}</label>
            <Input
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder={t("skillsPlaceholder")}
            />
          </div>

          {isMentor && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">{t("availability")}</label>
              <Input
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder={t("availabilityPlaceholder")}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">{t("bio")}</label>
            <Textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("personalBio")}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <RefreshCw className="size-4 animate-spin me-2" />}
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------
// 2. Change Role Modal
// -------------------------------------------------------------
export function ChangeRoleModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  user: AdminUserTarget | null
  onSuccess: () => void
}) {
  const t = useTranslations("Operations")
  const [selectedRole, setSelectedRole] = useState<string>("participant")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role) {
      setSelectedRole(user.role)
    }
  }, [user])

  const roles = [
    { id: "participant", label: t("roleParticipant"), desc: t("roleParticipantDesc") },
    { id: "mentor", label: t("roleMentor"), desc: t("roleMentorDesc") },
    { id: "judge", label: t("roleJudge"), desc: t("roleJudgeDesc") },
    { id: "organizer", label: t("roleOrganizer"), desc: t("roleOrganizerDesc") },
  ]

  const handleSubmit = async () => {
    if (!user) return
    setLoading(true)
    try {
      await accountApi(`/users/${user.id}/role`, {
        method: "POST",
        body: { role: selectedRole },
      })
      toast.success(t("roleUpdatedSuccess"))
      invalidateAdminCaches()
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error" as any))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-indigo-500" />
            <span>{t("changeRole")}</span>
          </DialogTitle>
          <DialogDescription>
            {user?.name} · {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{t("changeRoleWarning")}</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-foreground">{t("newRole")}</label>
            <div className="flex flex-col gap-2">
              {roles.map((r) => {
                const isSelected = selectedRole === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    className={cn(
                      "flex items-start justify-between rounded-lg border p-3 text-start transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/40"
                        : "border-border/60 hover:border-border hover:bg-muted/30 text-muted-foreground"
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-2">
                        {r.label}
                        {user?.role === r.id && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                            {t("currentRole")}
                          </Badge>
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{r.desc}</span>
                    </div>
                    {isSelected && <Check className="size-4 text-primary shrink-0 ms-2" />}
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={loading || selectedRole === user?.role}>
              {loading && <RefreshCw className="size-4 animate-spin me-2" />}
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------
// 3. Reset Password Modal
// -------------------------------------------------------------
export function ResetPasswordModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  user: AdminUserTarget | null
  onSuccess: () => void
}) {
  const t = useTranslations("Operations")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let res = "NASA2026!"
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(res)
    setShowPassword(true)
  }

  const copyToClipboard = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      toast.success(t("passwordCopied"))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t("copyFailed"))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (password.length < 6) {
      toast.error(t("passwordMinLength"))
      return
    }

    setLoading(true)
    try {
      await accountApi(`/users/${user.id}/reset-password`, {
        method: "POST",
        body: { password },
      })
      toast.success(t("passwordResetSuccess"))
      invalidateAdminCaches()
      setPassword("")
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error" as any))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-amber-500" />
            <span>{t("resetPassword")}</span>
          </DialogTitle>
          <DialogDescription>
            {user?.name} · {user?.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">{t("newPassword")}</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] gap-1 px-1.5 text-primary"
                onClick={generateRandomPassword}
              >
                <Sparkles className="size-3 text-amber-500" />
                <span>{t("generatePassword")}</span>
              </Button>
            </div>

            <div className="relative flex items-center">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={6}
                className="pe-20"
              />
              <div className="absolute end-1.5 flex items-center gap-1">
                {password && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={copyToClipboard}
                    title={t("copyPassword")}
                  >
                    {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="size-3.5 text-muted-foreground" /> : <Eye className="size-3.5 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading || password.length < 6}>
              {loading && <RefreshCw className="size-4 animate-spin me-2" />}
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------
// 4. Toggle Status Modal
// -------------------------------------------------------------
export function ToggleStatusModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  user: AdminUserTarget | null
  onSuccess: () => void
}) {
  const t = useTranslations("Operations")
  const [loading, setLoading] = useState(false)
  if (!user) return null

  const isDeactivating = user.isActive

  const handleToggle = async () => {
    setLoading(true)
    try {
      await accountApi(`/users/${user.id}/status`, {
        method: "PATCH",
        body: { isActive: !user.isActive },
      })
      toast.success(t("statusUpdatedSuccess"))
      invalidateAdminCaches()
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error" as any))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDeactivating ? (
              <UserX className="size-5 text-amber-500" />
            ) : (
              <UserCheck className="size-5 text-emerald-500" />
            )}
            <span>{isDeactivating ? t("deactivateAccount") : t("activateAccount")}</span>
          </DialogTitle>
          <DialogDescription>
            {user.name} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
          {isDeactivating ? t("confirmDeactivateDesc") : t("confirmActivateDesc")}
        </p>

        <DialogFooter className="gap-2 sm:gap-3 pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            variant={isDeactivating ? "destructive" : "default"}
            onClick={handleToggle}
            disabled={loading}
          >
            {loading && <RefreshCw className="size-4 animate-spin me-2" />}
            {isDeactivating ? t("deactivateAccount") : t("activateAccount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------
// 5. Delete User Modal
// -------------------------------------------------------------
export function DeleteUserModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  user: AdminUserTarget | null
  onSuccess: () => void
}) {
  const t = useTranslations("Operations")
  const [loading, setLoading] = useState(false)
  if (!user) return null

  const handleDelete = async () => {
    setLoading(true)
    try {
      await accountApi(`/users/${user.id}`, {
        method: "DELETE",
      })
      toast.success(t("deletedSuccess"))
      invalidateAdminCaches()
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error" as any))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5" />
            <span>{t("deleteAccount")}</span>
          </DialogTitle>
          <DialogDescription>
            {user.name} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
          {t("confirmDeleteUserDesc")}
        </p>

        <DialogFooter className="gap-2 sm:gap-3 pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <RefreshCw className="size-4 animate-spin me-2" />}
            {t("deleteAccount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------
// 6. Edit Team Modal
// -------------------------------------------------------------
export function EditTeamModal({
  isOpen,
  onClose,
  team,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  team: AdminTeamTarget | null
  onSuccess: () => void
}) {
  const t = useTranslations("Operations")
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [challenge, setChallenge] = useState("")
  const [challengeOptions, setChallengeOptions] = useState<
    { id: string; title: string; titleAr: string | null }[]
  >([])
  const [loadingChallenges, setLoadingChallenges] = useState(false)

  useEffect(() => {
    if (team) {
      setName(team.name || "")
      setChallenge(team.challenge || "")
    }
  }, [team])

  useEffect(() => {
    if (isOpen) {
      setLoadingChallenges(true)
      accountApi<{ id: string; title: string; titleAr: string | null }[]>("/challenge-options")
        .then((data) => setChallengeOptions(data || []))
        .catch(() => setChallengeOptions([]))
        .finally(() => setLoadingChallenges(false))
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team) return

    setLoading(true)
    try {
      await accountApi(`/teams/${team.id}`, {
        method: "PATCH",
        body: {
          name: name.trim(),
          challenge: challenge.trim() || null,
        },
      })
      toast.success(t("updatedSuccess"))
      invalidateAdminCaches()
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error" as any))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" />
            <span>{t("editTeam")}</span>
          </DialogTitle>
          <DialogDescription>{team?.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          {/* Read-only Info Banner */}
          <div className="flex items-center justify-between text-xs rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{t("maxMembers")}:</span>
              <span className="font-semibold text-foreground">{team?.maxMembers}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{t("submissionStatus")}:</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                {team?.submission?.status === "submitted"
                  ? t("statusSubmitted")
                  : team?.submission?.status === "draft"
                    ? t("statusDraft")
                    : t("statusNotStarted")}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">{t("teamName")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("teamName")}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">{t("teamChallenge")}</label>
            <Select
              value={challenge || "__none__"}
              onValueChange={(val) => setChallenge(val === "__none__" ? "" : (val || ""))}
              disabled={loadingChallenges}
            >
              <SelectTrigger type="button" className="h-9 w-full rounded-md text-xs sm:text-sm">
                <SelectValue placeholder={loadingChallenges ? t("loadingChallenges") : t("chooseChallenge")}>
                  {(val) => {
                    if (!val || val === "__none__") return t("noChallengeSelected")
                    const found = challengeOptions.find((c) => c.title === val)
                    if (!found) return val
                    return locale === "ar" && found.titleAr ? found.titleAr : found.title
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectGroup>
                  <SelectItem value="__none__" className="text-xs text-muted-foreground">
                    {t("noChallengeSelected")}
                  </SelectItem>
                  {challengeOptions.map((c) => (
                    <SelectItem key={c.id} value={c.title} className="text-xs">
                      {locale === "ar" && c.titleAr ? c.titleAr : c.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <RefreshCw className="size-4 animate-spin me-2" />}
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------
// 7. Manage Team Members Modal
// -------------------------------------------------------------
export function ManageTeamMembersModal({
  isOpen,
  onClose,
  team,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  team: AdminTeamTarget | null
  onSuccess: () => void
}) {
  const t = useTranslations("Operations")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  if (!team) return null

  const handleMakeLeader = async (userId: string) => {
    setLoadingId(userId)
    try {
      await accountApi(`/teams/${team.id}/members/${userId}/role`, {
        method: "POST",
        body: { role: "leader" },
      })
      toast.success(t("leaderTransferredSuccess"))
      invalidateAdminCaches()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error" as any))
    } finally {
      setLoadingId(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm(t("confirmRemoveMember"))) return
    setLoadingId(userId)
    try {
      await accountApi(`/teams/${team.id}/members/${userId}`, {
        method: "DELETE",
      })
      toast.success(t("memberRemovedSuccess"))
      invalidateAdminCaches()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error" as any))
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <span>{t("manageMembers")}</span>
          </DialogTitle>
          <DialogDescription>
            {team.name} ({team.members?.length || 0} / {team.maxMembers})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pt-2">
          {team.members?.length ? (
            team.members.map((m) => {
              const isLeader = m.role === "leader"
              const isActionPending = loadingId === m.userId
              return (
                <div
                  key={m.userId}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={m.user.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {m.user.name?.slice(0, 1) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground truncate max-w-[140px]">
                          {m.user.name}
                        </span>
                        {isLeader && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1 font-normal text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Crown className="size-2.5 me-0.5" />
                            {t("leader")}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                        {m.user.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isLeader && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleMakeLeader(m.userId)}
                        disabled={isActionPending}
                      >
                        <Crown className="size-3 text-amber-500" />
                        <span>{t("makeLeader")}</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveMember(m.userId)}
                      disabled={isActionPending}
                      title={t("removeMember")}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              {t("notSet")}
            </p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------
// 8. Delete Team Modal
// -------------------------------------------------------------
export function DeleteTeamModal({
  isOpen,
  onClose,
  team,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  team: AdminTeamTarget | null
  onSuccess: () => void
}) {
  const t = useTranslations("Operations")
  const [loading, setLoading] = useState(false)
  if (!team) return null

  const handleDelete = async () => {
    setLoading(true)
    try {
      await accountApi(`/teams/${team.id}`, {
        method: "DELETE",
      })
      toast.success(t("deletedSuccess"))
      invalidateAdminCaches()
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error" as any))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-5" />
            <span>{t("deleteTeam")}</span>
          </DialogTitle>
          <DialogDescription>{team.name}</DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
          {t("confirmDeleteTeamDesc")}
        </p>

        <DialogFooter className="gap-2 sm:gap-3 pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <RefreshCw className="size-4 animate-spin me-2" />}
            {t("deleteTeam")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
