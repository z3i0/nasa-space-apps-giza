"use client"

import { useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import type { TeamDraft } from "@/lib/teams"
import styles from "./team-workspace.module.css"

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
            <input
              className={styles.control}
              maxLength={200}
              value={draft.challenge}
              onChange={(e) =>
                setDraft({ ...draft, challenge: e.target.value })
              }
            />
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
