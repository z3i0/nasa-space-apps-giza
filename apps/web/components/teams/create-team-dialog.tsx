"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "@/i18n/routing"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Users, Sparkles, AlertCircle, Loader2 } from "lucide-react"
import { createTeam, type TeamDetails } from "@/lib/teams"

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (team: TeamDetails) => void
}

export const TRACK_OPTIONS = [
  { value: "earthScience", labelAr: "علوم الأرض والمناخ (Earth Science)", labelEn: "Earth Science & Climate" },
  { value: "spaceDebris", labelAr: "الحطام الفضائي والاستكشاف (Space Debris)", labelEn: "Space Debris & Exploration" },
  { value: "astrophysics", labelAr: "الفيزياء الفلكية والكواكب (Astrophysics)", labelEn: "Astrophysics & Planetary" },
  { value: "solarPhysics", labelAr: "فيزياء الشمس وطقس الفضاء (Solar Physics)", labelEn: "Solar Physics & Space Weather" },
  { value: "openData", labelAr: "البيانات المفتوحة والذكاء الاصطناعي (Open Data)", labelEn: "Open Data & AI" },
] as const

export function CreateTeamDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTeamDialogProps) {
  const t = useTranslations("Teams.dialog")
  const tTracks = useTranslations("Teams.tracks")
  const locale = useLocale()
  const router = useRouter()

  const [name, setName] = React.useState("")
  const [track, setTrack] = React.useState("earthScience")
  const [assignedRole, setAssignedRole] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const resetForm = () => {
    setName("")
    setTrack("earthScience")
    setAssignedRole("")
    setDescription("")
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(t("nameRequired"))
      return
    }
    if (trimmedName.length < 3) {
      setError(t("nameMinLength"))
      return
    }

    setLoading(true)
    setError("")

    try {
      const trackLabel = tTracks(track as keyof typeof import("../../messages/en/teams.json")["Teams"]["tracks"]) || track

      const newTeam = await createTeam({
        name: trimmedName,
        track: trackLabel,
        description: description.trim() || undefined,
        assignedRole: assignedRole.trim() || undefined,
      })

      toast.success(t("createdSuccess"))
      resetForm()
      onOpenChange(false)
      if (onSuccess) {
        onSuccess(newTeam)
      } else {
        router.push("/dashboard/participant/team")
        router.refresh()
      }
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "") || t("createFailed")
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!loading) {
          onOpenChange(val)
          if (!val) resetForm()
        }
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg rounded-2xl p-6 sm:p-7 gap-5" dir={locale === "ar" ? "rtl" : "ltr"}>
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20">
              <Users className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold">
                {t("createTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                {t("createSubtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Team Name */}
          <div className="space-y-1.5">
            <label htmlFor="team-name" className="text-xs font-semibold text-foreground block">
              {t("teamNameLabel")} <span className="text-destructive">*</span>
            </label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError("")
              }}
              placeholder={t("teamNamePlaceholder")}
              maxLength={50}
              required
              className="rounded-xl h-10 text-sm"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Track Selection */}
          <div className="space-y-1.5">
            <label htmlFor="team-track" className="text-xs font-semibold text-foreground block">
              {t("trackLabel")}
            </label>
            <Select value={track} onValueChange={(val) => setTrack(val || "earthScience")} disabled={loading}>
              <SelectTrigger id="team-track" className="w-full h-10 rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder={t("chooseTrack")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TRACK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {tTracks(opt.value)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Leader Assigned Role */}
          <div className="space-y-1.5">
            <label htmlFor="leader-role" className="text-xs font-semibold text-foreground block">
              {t("leaderRoleLabel")}
            </label>
            <Input
              id="leader-role"
              value={assignedRole}
              onChange={(e) => setAssignedRole(e.target.value)}
              placeholder={t("leaderRolePlaceholder")}
              maxLength={60}
              className="rounded-xl h-10 text-sm"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="team-desc" className="text-xs font-semibold text-foreground">
                {t("descLabel")}
              </label>
              <span className="text-xs text-muted-foreground font-mono">
                {description.length} / 500
              </span>
            </div>
            <Textarea
              id="team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descPlaceholder")}
              maxLength={500}
              className="rounded-xl min-h-[85px] text-sm resize-none"
              disabled={loading}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl text-xs sm:text-sm cursor-pointer"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded-xl text-xs sm:text-sm font-semibold cursor-pointer gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t("creating")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>{t("submitCreate")}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
