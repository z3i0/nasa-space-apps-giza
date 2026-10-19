"use client"

import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { DashboardThemeContext } from "@/components/dashboard/dashboard-theme-context"
import { getAuthUser, setAuth } from "@/lib/auth"
import {
  interestOptions,
  participationOptions,
  profileDraft,
  ProfileRequestError,
  requestProfile,
  roleOptions,
  skillOptions,
  type ParticipantProfile,
  type ProfileDraft,
} from "@/lib/profile"
import styles from "./participant-profile.module.css"
import { ChallengeSelect } from "./challenge-select"

export function ParticipantProfilePage() {
  const t = useTranslations("Dashboard.profilePage")
  const contact = useTranslations("Teams")
  const locale = useLocale()
  const theme = useContext(DashboardThemeContext)
  const [profile, setProfile] = useState<ParticipantProfile | null>(null)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [nameError, setNameError] = useState(false)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)
  const request = useRef<AbortController | null>(null)
  const busy = useRef(false)
  const dirty = !!(
    profile &&
    draft &&
    JSON.stringify(draft) !== JSON.stringify(profileDraft(profile))
  )
  const errorKey = (error: unknown) =>
    error instanceof ProfileRequestError
      ? error.status === 401
        ? "sessionExpired"
        : error.status === 409
          ? "conflict"
          : error.status === 400
            ? "validationError"
            : "requestError"
      : "requestError"

  const load = useCallback(() => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    return requestProfile(controller.signal).then(result => {
      if (controller.signal.aborted) return
      setProfile(result)
      setDraft(profileDraft(result))
      setSaved(false)
    }).catch(error => {
      if (!controller.signal.aborted) setError(errorKey(error))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
  }, [])

  function reload() {
    setLoading(true)
    setError("")
    void load()
  }

  useEffect(() => {
    void load()
    return () => request.current?.abort()
  }, [load])
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    const beforeNavigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]")
      if (
        !link ||
        link.getAttribute("href")?.startsWith("#") ||
        event.defaultPrevented
      )
        return
      if (!window.confirm(t("leaveConfirm"))) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", beforeNavigate, true)
    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      document.removeEventListener("click", beforeNavigate, true)
    }
  }, [dirty, t])

  function change<K extends keyof ProfileDraft>(
    key: K,
    value: ProfileDraft[K]
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
    setSaved(false)
    if (key === "name") setNameError(false)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!draft || !profile || busy.current) return
    if (!draft.name.trim()) {
      setNameError(true)
      document.getElementById("profile-name")?.focus()
      return
    }
    busy.current = true
    setSaving(true)
    setError("")
    const controller = new AbortController()
    request.current = controller
    try {
      const result = await requestProfile(
        controller.signal,
        draft,
        profile.updatedAt
      )
      if (controller.signal.aborted) return
      setProfile(result)
      setDraft(profileDraft(result))
      setSaved(true)
      const user = getAuthUser()
      if (user)
        setAuth(
          {},
          { ...user, name: result.user.name, fullName: result.user.name, phone: result.user.phone }
        )
    } catch (error) {
      if (!controller.signal.aborted) setError(errorKey(error))
    } finally {
      busy.current = false
      if (!controller.signal.aborted) setSaving(false)
    }
  }

  const errorMessage = error && (
    <div role="alert" className={styles.error}>
      <p>{t(error)}</p>
      {error === "sessionExpired" ? (
        <Link href="/login">{t("signIn")}</Link>
      ) : (
        error === "conflict" && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (window.confirm(t("discardConfirm"))) reload()
            }}
          >
            {t("reload")}
          </Button>
        )
      )}
    </div>
  )

  if (loading)
    return (
      <section className={`${styles.card} ${styles.loading}`} aria-busy="true">
        <h1>{t("title")}</h1>
        <p role="status" className={styles.muted}>
          {t("loading")}
        </p>
      </section>
    )
  if (!draft || !profile)
    return (
      <section className={styles.card}>
        <h1>{t("title")}</h1>
        {errorMessage}
        <Button onClick={reload}>{t("retry")}</Button>
      </section>
    )

  const optionLabel = (kind: "skills" | "interests", value: string) => {
    const index = (
      kind === "skills"
        ? ([...skillOptions] as string[])
        : ([...interestOptions] as string[])
    ).indexOf(value)
    return index >= 0 ? t(`${kind}.${index}`) : value
  }
  const roleIndex = (roleOptions as readonly string[]).indexOf(
    draft.desiredRole
  )
  const roleLabel = roleIndex < 0 ? draft.desiredRole : t(`roles.${roleIndex}`)
  const hidden = !draft.isPublic || draft.hideFromSearch

  function matchingCard(inPreview = false) {
    if (!draft || !profile) return null
    return (
      <section
        className={`${styles.card} ${styles.match} ${inPreview ? styles.previewCard : ""}`}
        data-matching-card=""
      >
        {!inPreview && <h2>{t("matchingTitle")}</h2>}
        {profile.user.emailVerified && (
          <span className={styles.pill}>{t("verified")}</span>
        )}
        <h3>{draft.name || t("namePlaceholder")}</h3>
        <p className={styles.muted}>
          {[
            roleLabel,
            ...draft.skills
              .filter((s) => !draft.desiredRole.includes(s))
              .slice(0, 2)
              .map((s) => optionLabel("skills", s)),
          ]
            .filter(Boolean)
            .join(" · ") || t("skillsEmpty")}
          <br />
          {[profile.academicLevel, profile.institution]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className={styles.chips}>
          {draft.interests.map((interest) => (
            <span className={styles.pill} key={interest}>
              {optionLabel("interests", interest)}
            </span>
          ))}
        </div>
        <p className={styles.muted}>{draft.bio || t("bioEmpty")}</p>
        {hidden && <p className={styles.note}>{t("hiddenNote")}</p>}
      </section>
    )
  }

  return (
    <>
      <form onSubmit={save} data-profile-form="" aria-label={t("title")}>
        <fieldset
          disabled={saving}
          className={styles.layout}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <div className={styles.column}>
            <section className={`${styles.card} ${styles.story}`}>
              <h1>{t("title")}</h1>
              <div className={styles.fields}>
                <label className={styles.field} htmlFor="profile-name">
                  {t("displayName")}
                  <Input
                    id="profile-name"
                    className={styles.control}
                    value={draft.name}
                    onChange={(e) => change("name", e.target.value)}
                    maxLength={100}
                    autoComplete="name"
                    aria-invalid={nameError}
                    aria-describedby={nameError ? "name-error" : undefined}
                    required
                  />
                  {nameError && (
                    <span id="name-error" role="alert" className={styles.error}>
                      {t("nameRequired")}
                    </span>
                  )}
                </label>
                <label className={styles.field} htmlFor="profile-role">
                  {t("preferredRole")}
                  <select
                    id="profile-role"
                    className={styles.control}
                    value={draft.desiredRole}
                    onChange={(e) => change("desiredRole", e.target.value)}
                  >
                    <option value="">{t("chooseRole")}</option>
                    {roleIndex < 0 && draft.desiredRole && (
                      <option>{draft.desiredRole}</option>
                    )}
                    {roleOptions.map((role, index) => (
                      <option key={role} value={role}>
                        {t(`roles.${index}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className={styles.field} htmlFor="profile-phone">
                {contact("contactNumber")}
                <Input id="profile-phone" className={styles.control} type="tel"
                  dir="ltr" autoComplete="tel" required minLength={7} maxLength={40}
                  value={draft.phone} onChange={e => change("phone", e.target.value)}
                  aria-describedby="profile-phone-help" />
              </label>
              <p id="profile-phone-help" className={styles.muted}>{contact("contactHelp")}</p>
              {(["skills", "bio", "experience", "interests"] as const).map(
                (key) =>
                  key === "skills" || key === "interests" ? (
                    <fieldset key={key} className={styles.group}>
                      <legend>{t(`${key}Label`)}</legend>
                      <div className={styles.chips}>
                        {[
                          ...new Set([
                            ...(key === "skills"
                              ? skillOptions
                              : interestOptions),
                            ...draft[key],
                          ]),
                        ].map((value) => (
                          <Button
                            key={value}
                            type="button"
                            variant="ghost"
                            className={styles.chip}
                            aria-pressed={draft[key].includes(value)}
                            onClick={() =>
                              change(
                                key,
                                draft[key].includes(value)
                                  ? draft[key].filter((s) => s !== value)
                                  : [...draft[key], value]
                              )
                            }
                          >
                            <span aria-hidden="true">
                              {draft[key].includes(value) ? "✓" : "+"}
                            </span>
                            {optionLabel(key, value)}
                          </Button>
                        ))}
                      </div>
                    </fieldset>
                  ) : (
                    <label
                      className={styles.field}
                      key={key}
                      htmlFor={`profile-${key}`}
                    >
                      {t(`${key}Label`)}
                      <Textarea
                        id={`profile-${key}`}
                        className={styles.control}
                        value={draft[key]}
                        maxLength={key === "bio" ? 1000 : 3000}
                        onChange={(e) => change(key, e.target.value)}
                      />
                    </label>
                  )
              )}
              <label className={styles.field} htmlFor="profile-challenge">
                {t("challengeLabel")}
                <ChallengeSelect
                  id="profile-challenge"
                  className={styles.control}
                  value={draft.preferredChallenge}
                  onChange={(value) => change("preferredChallenge", value)}
                />
              </label>
            </section>
            <section className={`${styles.card} ${styles.participation}`}>
              <h2>{t("participationTitle")}</h2>
              <Button
              nativeButton={false}
                className={styles.button}
                render={
                  <Link
                    href={`/dashboard/participant/${profile.team ? "team" : "find-team"}`}
                  />
                }
              >
                {profile.team?.name ||
                  t(
                    draft.teamStatus === "want_to_create_team"
                      ? "createTeam"
                      : "findTeam"
                  )}{" "}
                <span aria-hidden="true">{locale === "ar" ? "←" : "→"}</span>
              </Button>
              <fieldset className={styles.group}>
                <legend className="sr-only">{t("participationTitle")}</legend>
                <div className={styles.chips}>
                  {participationOptions.map((status) => (
                    <Button
                      type="button"
                      variant="ghost"
                      key={status}
                      className={`${styles.chip} ${styles.choice}`}
                      aria-pressed={draft.teamStatus === status}
                      onClick={() => change("teamStatus", status)}
                    >
                      <span aria-hidden="true">
                        {draft.teamStatus === status ? "●" : "○"}
                      </span>
                      {t(`participation.${status}`)}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <p className={styles.muted}>
                {profile.team
                  ? t("teamSummary", {
                      name: profile.team.name,
                      count: profile.team.memberCount,
                    })
                  : t(`participationHelp.${draft.teamStatus}`)}
              </p>
            </section>
            <div className={styles.actions}>
              <Button
                type="submit"
                className={styles.button}
                disabled={!dirty || saving}
              >
                {t(saving ? "saving" : "save")}
              </Button>
              <Button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                variant="secondary"
                disabled={!dirty || saving}
                onClick={() => {
                  if (window.confirm(t("discardConfirm"))) {
                    setDraft(profileDraft(profile))
                    setError("")
                    setNameError(false)
                  }
                }}
              >
                {t("discard")}
              </Button>
              <span role="status" className={styles.status}>
                {t(saved ? "saved" : dirty ? "unsaved" : "upToDate")}
              </span>
              {errorMessage}
            </div>
          </div>
          <aside className={styles.column} aria-label={t("matchingTitle")}>
            {matchingCard()}
            <section className={styles.card}>
              <h2>{t("privacyTitle")}</h2>
              {(
                [
                  "isPublic",
                  "shareProjectsWithMentors",
                  "hideFromSearch",
                ] as const
              ).map((key) => (
                <label className={styles.check} key={key}>
                  <Checkbox
                    className={styles.checkbox}
                    checked={draft[key]}
                    onCheckedChange={(value) => change(key, value)}
                  />
                  {t(`privacy.${key}`)}
                </label>
              ))}
              <div className={styles.divider} />
              <p className={styles.note}>{t("privacyNote")}</p>
              <Button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                variant="secondary"
                onClick={() => setPreview(true)}
              >
                {t("preview")}
              </Button>
            </section>
            <section className={styles.card}>
              <h2>{t("nextTitle")}</h2>
              <p className={styles.muted}>{t("nextDescription")}</p>
              <Button
              nativeButton={false}
                className={styles.button}
                render={<Link href="/dashboard/participant/challenges" />}
              >
                {t("explore")}{" "}
                <span aria-hidden="true">{locale === "ar" ? "←" : "→"}</span>
              </Button>
            </section>
          </aside>
        </fieldset>
      </form>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent
          className={`${theme} ${styles.preview}`}
          dir={locale === "ar" ? "rtl" : "ltr"}
          showCloseButton={false}
        >
          <DialogTitle>{t("preview")}</DialogTitle>
          <DialogDescription>
            {t(hidden ? "hiddenPreview" : "previewDescription")}
          </DialogDescription>
          {matchingCard(true)}
          <DialogClose
            render={
              <Button
                className={`${styles.button} ${styles.secondary}`}
                variant="secondary"
              />
            }
          >
            {t("close")}
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
}
