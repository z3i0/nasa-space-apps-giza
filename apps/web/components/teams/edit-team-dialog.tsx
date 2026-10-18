"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
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
import { Pencil, Sparkles, AlertCircle, Loader2, Target, CheckCircle2 } from "lucide-react"
import { updateTeam, type TeamDetails } from "@/lib/teams"
import { TRACK_OPTIONS } from "./create-team-dialog"

interface EditTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: TeamDetails | null
  onSuccess?: (team: TeamDetails) => void
}

export function EditTeamDialog({
  open,
  onOpenChange,
  team,
  onSuccess,
}: EditTeamDialogProps) {
  const t = useTranslations("Teams.dialog")
  const tTracks = useTranslations("Teams.tracks")
  const locale = useLocale()

  const [name, setName] = React.useState("")
  const [track, setTrack] = React.useState("earthScience")
  const [challenge, setChallenge] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  // Sync state when team or open changes
  React.useEffect(() => {
    if (team && open) {
      setName(team.name || "")
      setDescription(team.description || "")
      setChallenge(team.challenge || "")

      // Find matching track option value if available
      const matched = TRACK_OPTIONS.find(
        (opt) =>
          opt.value === team.track ||
          opt.labelAr === team.track ||
          opt.labelEn === team.track ||
          (team.track && opt.value.toLowerCase() === team.track.toLowerCase())
      )
      setTrack(matched ? matched.value : team.track || "earthScience")
      setError("")
    }
  }, [team, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team) return

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
      const trackLabel = tTracks(track as any) || track

      const updated = await updateTeam(team.id, {
        name: trimmedName,
        track: trackLabel,
        challenge: challenge.trim() || undefined,
        description: description.trim() || undefined,
      })

      toast.success(t("updatedSuccess"))
      onOpenChange(false)
      if (onSuccess) {
        onSuccess(updated)
      }
    } catch (err: any) {
      const msg = err?.message || t("updateFailed")
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
        }
      }}
    >
      <DialogContent
        className="max-w-md sm:max-w-lg rounded-2xl p-6 sm:p-7 gap-5 max-h-[90vh] overflow-y-auto"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20">
              <Pencil className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold">
                {t("editTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                {t("editSubtitle")}
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
            <label htmlFor="edit-team-name" className="text-xs font-semibold text-foreground block">
              {t("teamNameLabel")} <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-team-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError("")
              }}
              placeholder={t("teamNamePlaceholder")}
              maxLength={50}
              required
              className="rounded-xl h-10 text-sm bg-background border-border"
            />
          </div>

          {/* Challenge Track */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              {t("trackLabel")}
            </label>
            <Select value={track} onValueChange={(val) => setTrack(val || "earthScience")}>
              <SelectTrigger className="rounded-xl h-10 text-sm bg-background border-border w-full">
                <SelectValue placeholder={t("chooseTrack")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectGroup>
                  {TRACK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs sm:text-sm">
                      {tTracks(opt.value)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Challenge / Topic */}
          <div className="space-y-1.5">
            <label htmlFor="edit-team-challenge" className="text-xs font-semibold text-foreground block">
              {t("challengeLabel")}
            </label>
            <Input
              id="edit-team-challenge"
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder={t("challengePlaceholder")}
              maxLength={100}
              className="rounded-xl h-10 text-sm bg-background border-border"
            />
          </div>

          {/* Team Description */}
          <div className="space-y-1.5">
            <label htmlFor="edit-team-desc" className="text-xs font-semibold text-foreground block">
              {t("descLabel")}
            </label>
            <Textarea
              id="edit-team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descPlaceholder")}
              rows={3}
              maxLength={500}
              className="rounded-xl text-sm bg-background border-border resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-end">
              {description.length}/500
            </p>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl text-xs h-9 cursor-pointer"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl text-xs font-semibold h-9 gap-1.5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("saving")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>{t("saveChanges")}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
