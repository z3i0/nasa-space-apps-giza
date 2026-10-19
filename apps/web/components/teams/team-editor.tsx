"use client"

import { useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import type { TeamDraft } from "@/lib/teams"
import styles from "./team-workspace.module.css"
import { ChallengeSelect } from "@/components/profile/challenge-select"

export function TeamEditor({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial?: TeamDraft
  busy: boolean
  onSave: (draft: TeamDraft) => Promise<boolean>
  onCancel?: () => void
}) {
  const t = useTranslations("Teams")
  const [draft, setDraft] = useState<TeamDraft>(
    initial || { name: "", description: "", challenge: "", track: "" }
  )
  const [invalid, setInvalid] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (draft.name.trim().length < 3) {
      setInvalid(true)
      return
    }
    await onSave({ ...draft, name: draft.name.trim() })
  }
  return (
    <form onSubmit={submit} className={styles.stack}>
      <fieldset disabled={busy} className={styles.fields}>
        <label className={styles.field}>
          {t("name")}
          <input
            className={styles.control}
            required
            minLength={3}
            maxLength={50}
            value={draft.name}
            aria-invalid={invalid}
            onChange={(e) => {
              setInvalid(false)
              setDraft({ ...draft, name: e.target.value })
            }}
          />
        </label>
        {invalid && <p role="alert">{t("nameError")}</p>}
        <label className={styles.field}>
          {t("description")}
          <textarea
            className={styles.control}
            maxLength={500}
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </label>
        <div className={styles.twoFields}>
          <label className={styles.field}>
            {t("challenge")}
            <ChallengeSelect
              id="team-challenge"
              className={styles.control}
              value={draft.challenge}
              onChange={(value) => setDraft({ ...draft, challenge: value })}
            />
            <Link
              href="/dashboard/participant/challenges"
              className="text-xs text-cyan-200 underline underline-offset-4"
            >
              {t("browseChallenges")}
            </Link>
          </label>
          <label className={styles.field}>
            {t("track")}
            <input
              className={styles.control}
              maxLength={100}
              value={draft.track}
              onChange={(e) => setDraft({ ...draft, track: e.target.value })}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <Button type="submit">
            {busy ? t("saving") : initial ? t("save") : t("create")}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {t("cancel")}
            </Button>
          )}
        </div>
      </fieldset>
    </form>
  )
}
