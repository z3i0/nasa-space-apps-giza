"use client"
import { useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import type { Challenge, ChallengeDraft } from "@/lib/challenges"
import s from "./challenges.module.css"

export function ChallengeEditor({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: Challenge | null
  busy: boolean
  onSave: (draft: ChallengeDraft) => Promise<void>
  onCancel: () => void
}) {
  const t = useTranslations("Challenges")
  const [draft, setDraft] = useState<ChallengeDraft>(() => ({
    title: initial?.title || "",
    titleAr: initial?.titleAr || "",
    summary: initial?.summary || "",
    summaryAr: initial?.summaryAr || "",
    description: initial?.description || "",
    descriptionAr: initial?.descriptionAr || "",
    category: initial?.category || "",
    difficulty: initial?.difficulty || "beginner",
    year: initial?.year || new Date().getUTCFullYear(),
    tags: initial?.tags || [],
    sourceUrl: initial?.sourceUrl || "",
    isPublished: initial?.isPublished || false,
    isArchived: initial?.isArchived || false,
    resources:
      initial?.resources.map(({ label, url }) => ({ label, url })) || [],
    expectedVersion: initial?.version,
  }))
  const [tags, setTags] = useState(draft.tags.join(", "))
  async function submit(event: FormEvent) {
    event.preventDefault()
    await onSave({
      ...draft,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      sourceUrl: draft.sourceUrl || undefined,
    })
  }
  return (
    <section className={s.panel} aria-label={t(initial ? "edit" : "new")}>
      <h2 className={s.sectionTitle}>{t(initial ? "edit" : "new")}</h2>
      <p className={s.muted}>{t("editorHint")}</p>
      <form onSubmit={submit} className="mt-5">
        <fieldset disabled={busy} className={s.fields}>
          <label className={s.field}>
            {t("titleLabel")}
            <input
              className={s.control}
              required
              minLength={3}
              maxLength={200}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className={s.field}>
            {t("summaryLabel")}
            <textarea
              className={s.control}
              required
              minLength={10}
              maxLength={500}
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            />
          </label>
          <label className={s.field}>
            {t("descriptionLabel")}
            <textarea
              className={s.control}
              required
              minLength={20}
              maxLength={12000}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <details>
            <summary className="cursor-pointer text-sm">
              {t("arabicContent")}
            </summary>
            <div className={`${s.fields} mt-4`}>
              {(
                [
                  ["titleAr", 200],
                  ["summaryAr", 500],
                  ["descriptionAr", 12000],
                ] as const
              ).map(([key, max]) => (
                <label key={key} className={s.field}>
                  {t(key)}
                  <textarea
                    dir="rtl"
                    className={s.control}
                    maxLength={max}
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
          </details>
          <div className={s.two}>
            <label className={s.field}>
              {t("category")}
              <input
                className={s.control}
                required
                minLength={2}
                maxLength={60}
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              />
            </label>
            <label className={s.field}>
              {t("difficulty")}
              <select
                className={s.control}
                value={draft.difficulty}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    difficulty: e.target.value as ChallengeDraft["difficulty"],
                  })
                }
              >
                {(["beginner", "intermediate", "advanced"] as const).map(
                  (value) => (
                    <option key={value} value={value}>
                      {t(value)}
                    </option>
                  )
                )}
              </select>
            </label>
            <label className={s.field}>
              {t("year")}
              <input
                required
                type="number"
                min={2000}
                max={2100}
                className={s.control}
                value={draft.year}
                onChange={(e) =>
                  setDraft({ ...draft, year: Number(e.target.value) })
                }
              />
            </label>
            <label className={s.field}>
              {t("tags")}
              <input
                className={s.control}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </label>
          </div>
          <label className={s.field}>
            {t("sourceUrl")}
            <input
              type="url"
              className={s.control}
              maxLength={2000}
              value={draft.sourceUrl}
              onChange={(e) =>
                setDraft({ ...draft, sourceUrl: e.target.value })
              }
            />
          </label>
          <div>
            <h3 className="mb-3 font-semibold">{t("resources")}</h3>
            <div className={s.fields}>
              {draft.resources.map((resource, index) => (
                <div key={index} className={s.resourceRow}>
                  <label className={s.field}>
                    {t("resourceLabel")}
                    <input
                      required
                      maxLength={120}
                      className={s.control}
                      value={resource.label}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          resources: draft.resources.map((item, i) =>
                            i === index
                              ? { ...item, label: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </label>
                  <label className={s.field}>
                    {t("resourceUrl")}
                    <input
                      required
                      type="url"
                      maxLength={2000}
                      className={s.control}
                      value={resource.url}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          resources: draft.resources.map((item, i) =>
                            i === index
                              ? { ...item, url: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        resources: draft.resources.filter(
                          (_, i) => i !== index
                        ),
                      })
                    }
                  >
                    {t("removeResource")}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              className="mt-3"
              type="button"
              variant="secondary"
              disabled={draft.resources.length >= 10}
              onClick={() =>
                setDraft({
                  ...draft,
                  resources: [...draft.resources, { label: "", url: "" }],
                })
              }
            >
              {t("addResource")}
            </Button>
          </div>
          <label className={s.check}>
            <input
              type="checkbox"
              checked={draft.isPublished}
              onChange={(e) =>
                setDraft({ ...draft, isPublished: e.target.checked })
              }
            />
            {t("publishLabel")}
          </label>
          <label className={s.check}>
            <input
              type="checkbox"
              checked={draft.isArchived}
              onChange={(e) =>
                setDraft({ ...draft, isArchived: e.target.checked })
              }
            />
            {t("archiveLabel")}
          </label>
          <div className={s.actions}>
            <Button type="submit">{t(busy ? "saving" : "saveChanges")}</Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}
