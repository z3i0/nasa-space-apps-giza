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
import { ChallengeSelect } from "@/components/profile/challenge-select"
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
import { Pencil, Sparkles, AlertCircle, Loader2 } from "lucide-react"
import { updateTeam, type TeamDetails } from "@/lib/teams"
import { TRACK_OPTIONS } from "./create-team-dialog"

interface EditTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: TeamDetails | null
  onSuccess?: (team: TeamDetails) => void
}

export function EditTeamDialog(props: EditTeamDialogProps) {
  if (!props.open || !props.team) return null
  return <EditTeamForm key={props.team.id} {...props} />
}

function EditTeamForm({
  open,
  onOpenChange,
  team,
  onSuccess,
}: EditTeamDialogProps) {
  const t = useTranslations("Teams.dialog")
  const tTracks = useTranslations("Teams.tracks")
  const locale = useLocale()

  const [name, setName] = React.useState(team?.name || "")
  const [track, setTrack] = React.useState<string>(
    () =>
      TRACK_OPTIONS.find(
        (option) =>
          option.value === team?.track ||
          option.labelAr === team?.track ||
          option.labelEn === team?.track
      )?.value ||
      team?.track ||
      "earthScience"
  )
  const [challenge, setChallenge] = React.useState(team?.challenge || "")
  const [description, setDescription] = React.useState(team?.description || "")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

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
      const trackLabel =
        tTracks(
          track as keyof (typeof import("../../messages/en/teams.json"))["Teams"]["tracks"]
        ) || track

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
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "") || t("updateFailed")
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
        className="max-h-[90vh] max-w-md gap-5 overflow-y-auto rounded-2xl p-6 sm:max-w-lg sm:p-7"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Pencil className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold sm:text-xl">
                {t("editTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                {t("editSubtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Team Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-team-name"
              className="block text-xs font-semibold text-foreground"
            >
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
              className="h-10 rounded-xl border-border bg-background text-sm"
            />
          </div>

          {/* Challenge Track */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              {t("trackLabel")}
            </label>
            <Select
              value={track}
              onValueChange={(val) => setTrack(val || "earthScience")}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border bg-background text-sm">
                <SelectValue placeholder={t("chooseTrack")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectGroup>
                  {TRACK_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs sm:text-sm"
                    >
                      {tTracks(opt.value)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Challenge / Topic */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-team-challenge"
              className="block text-xs font-semibold text-foreground"
            >
              {t("challengeLabel")}
            </label>
            <ChallengeSelect
              id="edit-team-challenge"
              value={challenge}
              onChange={setChallenge}
              className="h-10 rounded-xl border-border bg-background text-sm"
            />
          </div>

          {/* Team Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-team-desc"
              className="block text-xs font-semibold text-foreground"
            >
              {t("descLabel")}
            </label>
            <Textarea
              id="edit-team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descPlaceholder")}
              rows={3}
              maxLength={500}
              className="resize-none rounded-xl border-border bg-background text-sm"
            />
            <p className="text-end text-[11px] text-muted-foreground">
              {description.length}/500
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9 cursor-pointer rounded-xl text-xs"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 cursor-pointer gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
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
