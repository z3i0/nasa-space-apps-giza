"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Link } from "@/i18n/routing"
import { AuthHeader } from "@/components/auth/auth-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RegistrationTags } from "@/components/auth/registration-tags"
import styles from "@/components/auth/auth-layout.module.css"
import { authClient } from "@/lib/auth-client"
import { setAuth, clearLocalAuth } from "@/lib/auth"
import {
  skillOptions,
  interestOptions,
  roleOptions,
  participationOptions,
} from "@/lib/profile"

type RegistrationRole = "participant" | "mentor" | "judge"
type TagKind = "skills" | "interests"
type RegistrationChallenge = {
  id: string
  title: string
  titleAr: string | null
}
const inputClass = "mt-1.5 h-10 rounded-lg"

export default function RegisterPage() {
  const t = useTranslations("Auth.register")
  const tProfile = useTranslations("Dashboard.profilePage")
  const tAccount = useTranslations("Account")
  const locale = useLocale()
  const lock = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState(false)
  const [step, setStep] = useState(1)
  const [requestedRole, setRequestedRole] =
    useState<RegistrationRole>("participant")
  const isParticipant = requestedRole === "participant"
  const isMentor = requestedRole === "mentor"
  const [challenges, setChallenges] = useState<RegistrationChallenge[]>([])
  const [challengeLoadError, setChallengeLoadError] = useState(false)
  const [tagInput, setTagInput] = useState({ skills: "", interests: "" })
  const [tagError, setTagError] = useState({ skills: "", interests: "" })
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    institution: "",
    academicLevel: "",
    skills: [] as string[],
    bio: "",
    interests: [] as string[],
    experience: "",
    preferredChallenge: "",
    teamStatus: "want_to_join_team" as (typeof participationOptions)[number],
    desiredRole: "",
  })
  const academicLevels = t.raw("academicLevels") as {
    value: string
    label: string
  }[]
  const roleText = (field: string) => t(`roles.${requestedRole}.${field}`)
  const steps = isParticipant
    ? [
        t("stepAccount"),
        roleText("profileTitle"),
        t("stepExpertise"),
        t("stepTeam"),
      ]
    : isMentor
      ? [t("stepAccount"), roleText("profileTitle")]
      : [t("stepAccount")]
  const totalSteps = steps.length
  const descriptions = isParticipant
    ? [
        t("stepDescription1"),
        roleText("profileHint"),
        roleText("expertiseHint"),
        t("teamProfileHint"),
      ]
    : isMentor
      ? [t("stepDescription1"), roleText("profileHint")]
      : [t("stepDescription1")]

  const optionLabel = (kind: TagKind, value: string) => {
    const options: readonly string[] =
      kind === "skills" ? skillOptions : interestOptions
    const index = options.indexOf(value)
    return index >= 0 ? tProfile(`${kind}.${index}`) : value
  }

  function mergedTags(kind: TagKind) {
    const options: readonly string[] =
      kind === "skills" ? skillOptions : interestOptions
    const values = [...draft[kind]]
    for (const token of tagInput[kind]
      .split(/[,،]/)
      .map((value) => value.trim())
      .filter(Boolean)) {
      if (token.length > 64) {
        setTagError((previous) => ({ ...previous, [kind]: t("tagTooLong") }))
        return null
      }
      const canonical =
        options.find((value) => value.toLowerCase() === token.toLowerCase()) ??
        token
      if (
        !values.some((value) => value.toLowerCase() === canonical.toLowerCase())
      )
        values.push(canonical)
    }
    if (values.length > 50) {
      setTagError((previous) => ({ ...previous, [kind]: t("tagLimitReached") }))
      return null
    }
    return values
  }

  function addTags(kind: TagKind) {
    const values = mergedTags(kind)
    if (!values) return
    setDraft((previous) => ({ ...previous, [kind]: values }))
    setTagInput((previous) => ({ ...previous, [kind]: "" }))
    setTagError((previous) => ({ ...previous, [kind]: "" }))
  }

  function toggleTag(kind: TagKind, value: string) {
    if (!draft[kind].includes(value) && draft[kind].length >= 50) {
      setTagError((previous) => ({ ...previous, [kind]: t("tagLimitReached") }))
      return
    }
    setDraft((previous) => ({
      ...previous,
      [kind]: previous[kind].includes(value)
        ? previous[kind].filter((item) => item !== value)
        : [...previous[kind], value],
    }))
    setTagError((previous) => ({ ...previous, [kind]: "" }))
  }

  useEffect(() => {
    if (!isParticipant) return
    const controller = new AbortController()
    fetch("/api/auth/registration-options", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load challenges")
        return response.json() as Promise<RegistrationChallenge[]>
      })
      .then((options) => {
        if (!controller.signal.aborted) {
          setChallenges(options)
          setChallengeLoadError(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setChallengeLoadError(true)
      })
    return () => controller.abort()
  }, [isParticipant])

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [step])

  function nextStep(form: HTMLFormElement) {
    if (!form.reportValidity()) return
    if (step === 1) {
      if (draft.name.trim().length < 2) {
        setError(t("invalidName"))
        return
      }
      if (draft.password !== draft.confirmPassword) {
        setError(t("mismatch"))
        return
      }
    }
    if (step === 3) {
      const skills = mergedTags("skills")
      const interests = mergedTags("interests")
      if (!skills || !interests) return
      setDraft((previous) => ({ ...previous, skills, interests }))
      setTagInput({ skills: "", interests: "" })
      setTagError({ skills: "", interests: "" })
    }
    setError("")
    setStep((current) => Math.min(totalSteps, current + 1))
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    if (step !== totalSteps) {
      nextStep(event.currentTarget)
      return
    }
    setError("")
    if (draft.name.trim().length < 2) {
      setStep(1)
      setError(t("invalidName"))
      return
    }
    if (draft.password !== draft.confirmPassword) {
      setStep(1)
      setError(t("mismatch"))
      return
    }
    // Mentor topics use the existing skills field, which the mentor directory
    // already displays. Include any custom topics still in the input.
    const mentorTopics = isMentor ? mergedTags("skills") : []
    if (!mentorTopics) return
    lock.current = true
    setBusy(true)
    try {
      const email = draft.email.trim().toLowerCase()
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          email,
          phone: draft.phone.trim(),
          password: draft.password,
          requestedRole,
          // Submit only the fields collected for the selected role.
          ...(isParticipant
            ? {
                institution: draft.institution.trim(),
                skills: draft.skills,
                bio: draft.bio.trim(),
                interests: draft.interests,
                experience: draft.experience.trim(),
                academicLevel: draft.academicLevel.trim(),
                preferredChallenge: draft.preferredChallenge,
                teamStatus: draft.teamStatus,
                desiredRole: draft.desiredRole.trim(),
              }
            : isMentor
              ? { skills: mentorTopics, bio: draft.bio.trim() }
              : {}),
        }),
      })
      if (!response.ok) {
        setError(
          t(
            response.status === 409
              ? "exists"
              : response.status === 400
                ? "invalid"
                : response.status >= 500
                  ? "unavailable"
                  : "error"
          )
        )
        return
      }
      setCreated(true)
      clearLocalAuth()
      await authClient.signOut()
      // Preserve the existing signed session and organizer approval flow.
      const result = await authClient.signIn.email({
        email,
        password: draft.password,
      })
      if (
        !result.error &&
        result.data?.user &&
        result.data.token &&
        result.data.user.email.toLowerCase() === email
      ) {
        const user = result.data.user
        setAuth(
          { accessToken: result.data.token },
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: requestedRole,
            roles: ["participant"],
          }
        )
        window.location.replace(`/${locale}/dashboard/${requestedRole}`)
      }
    } catch {
      setError(t("unavailable"))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <AuthHeader backLabel={t("backToHome")} />
      <main className={styles.main}>
        <aside className={styles.intro}>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h2 className={styles.introTitle}>{t("title")}</h2>
          <p className={styles.introCopy}>{roleText("intro")}</p>
        </aside>
        <section className={styles.card} aria-labelledby="registration-title">
          <div className="mb-3 space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h1
                id="registration-title"
                ref={heading}
                tabIndex={-1}
                className="min-w-0 text-xl font-semibold tracking-tight outline-none sm:text-2xl"
              >
                {created ? t("title") : steps[step - 1]}
              </h1>
              {!created && totalSteps > 1 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t("stepTitle", { step, total: totalSteps })}
                </span>
              )}
            </div>
            {!created && totalSteps > 1 && (
              <>
                <Progress
                  value={step}
                  max={totalSteps}
                  aria-label={t("registrationProgress")}
                  className="h-1"
                />
              </>
            )}
            {!created && (
              <p className="text-sm leading-5 text-muted-foreground">
                {descriptions[step - 1]}
              </p>
            )}
          </div>
          {created ? (
            <div role="status" className="space-y-3 text-sm">
              <p>{t("created")}</p>
              {!isParticipant && <p>{roleText("approval")}</p>}
            </div>
          ) : (
            <form onSubmit={register} className="space-y-4">
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <fieldset disabled={busy} className="min-w-0 space-y-4">
                {step === 1 && (
                  <div data-active-step className="space-y-3">
                    <label className="block text-sm font-medium">
                      {t("roleLabel")}
                      <Select
                        value={requestedRole}
                        onValueChange={(value) => {
                          if (value) {
                            setRequestedRole(value as RegistrationRole)
                            setError("")
                            setTagError({ skills: "", interests: "" })
                          }
                        }}
                      >
                        <SelectTrigger
                          type="button"
                          className={`${inputClass} !h-10 w-full`}
                        >
                          <SelectValue>
                            {() => tAccount(requestedRole)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className={styles.selectMenu}>
                          {(["participant", "mentor", "judge"] as const).map(
                            (role) => (
                              <SelectItem key={role} value={role}>
                                {tAccount(role)}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </label>
                    {!isParticipant && (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {roleText("approvalShort")}
                      </p>
                    )}
                    <div className={styles.fields}>
                      <label className="block min-w-0 text-sm font-medium">
                        {t("name")}
                        <Input
                          required
                          minLength={2}
                          maxLength={120}
                          autoComplete="name"
                          className={inputClass}
                          value={draft.name}
                          onChange={(e) =>
                            setDraft({ ...draft, name: e.target.value })
                          }
                        />
                      </label>
                      <label className="block min-w-0 text-sm font-medium">
                        {t("email")}
                        <Input
                          required
                          type="email"
                          autoComplete="email"
                          className={inputClass}
                          value={draft.email}
                          onChange={(e) =>
                            setDraft({ ...draft, email: e.target.value })
                          }
                        />
                      </label>
                      <label className="block min-w-0 text-sm font-medium sm:col-span-2">
                        {t("phone")}
                        <Input
                          required
                          type="tel"
                          maxLength={40}
                          autoComplete="tel"
                          className={inputClass}
                          value={draft.phone}
                          onChange={(e) =>
                            setDraft({ ...draft, phone: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className={styles.passwords}>
                      <label className="block min-w-0 text-sm font-medium">
                        {t("password")}
                        <Input
                          required
                          type="password"
                          minLength={8}
                          maxLength={128}
                          autoComplete="new-password"
                          aria-describedby="password-hint"
                          className={inputClass}
                          value={draft.password}
                          onChange={(e) =>
                            setDraft({ ...draft, password: e.target.value })
                          }
                        />
                      </label>
                      <label className="block min-w-0 text-sm font-medium">
                        {t("confirmPassword")}
                        <Input
                          required
                          type="password"
                          minLength={8}
                          maxLength={128}
                          autoComplete="new-password"
                          className={inputClass}
                          value={draft.confirmPassword}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              confirmPassword: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <p
                      id="password-hint"
                      className="text-xs text-muted-foreground"
                    >
                      {t("passwordHint")}
                    </p>
                  </div>
                )}

                {step === 2 && isMentor && (
                  <div data-active-step className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      {t("tagHint")}
                    </p>
                    <RegistrationTags
                      kind="skills"
                      label={roleText("skills")}
                      hint={t("tagHint")}
                      values={draft.skills}
                      options={skillOptions}
                      input={tagInput.skills}
                      error={tagError.skills}
                      addLabel={roleText("addTopic")}
                      removeLabel={(value) =>
                        t("removeTag", { value: optionLabel("skills", value) })
                      }
                      optionLabel={(value) => optionLabel("skills", value)}
                      onInput={(value) => {
                        setTagInput((previous) => ({
                          ...previous,
                          skills: value,
                        }))
                        setTagError((previous) => ({ ...previous, skills: "" }))
                      }}
                      onAdd={() => addTags("skills")}
                      onToggle={(value) => toggleTag("skills", value)}
                    />
                    <label className="block min-w-0 text-sm font-medium">
                      {roleText("bio")}
                      <Textarea
                        name="bio"
                        maxLength={1000}
                        rows={3}
                        className="mt-1.5 min-h-24 rounded-lg"
                        value={draft.bio}
                        onChange={(event) =>
                          setDraft({ ...draft, bio: event.target.value })
                        }
                      />
                    </label>
                  </div>
                )}

                {step === 2 && isParticipant && (
                  <div data-active-step className={styles.fields}>
                    <label
                      className={`block min-w-0 text-sm font-medium ${!isParticipant ? "sm:col-span-2" : ""}`}
                    >
                      {roleText("institution")}
                      <Input
                        name="institution"
                        maxLength={160}
                        autoComplete="organization"
                        className={inputClass}
                        value={draft.institution}
                        onChange={(e) =>
                          setDraft({ ...draft, institution: e.target.value })
                        }
                      />
                    </label>
                    {isParticipant && (
                      <label className="block min-w-0 text-sm font-medium">
                        {t("academicLevel")}
                        <Select
                          value={draft.academicLevel || "none"}
                          onValueChange={(value) =>
                            setDraft({
                              ...draft,
                              academicLevel:
                                !value || value === "none" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger
                            type="button"
                            className={`${inputClass} !h-10 w-full`}
                          >
                            <SelectValue>
                              {(value) =>
                                academicLevels.find(
                                  (level) => level.value === value
                                )?.label ?? t("chooseAcademicLevel")
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className={styles.selectMenu}>
                            <SelectItem value="none">
                              {t("chooseAcademicLevel")}
                            </SelectItem>
                            {academicLevels.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                    )}
                    <label className="block min-w-0 text-sm font-medium sm:col-span-2">
                      {roleText("bio")}
                      <Textarea
                        name="bio"
                        maxLength={1000}
                        rows={2}
                        className="mt-1.5 min-h-20 rounded-lg"
                        value={draft.bio}
                        onChange={(e) =>
                          setDraft({ ...draft, bio: e.target.value })
                        }
                      />
                    </label>
                    <label className="block min-w-0 text-sm font-medium sm:col-span-2">
                      {roleText("experience")}
                      <Textarea
                        name="experience"
                        maxLength={3000}
                        rows={3}
                        className="mt-1.5 min-h-24 rounded-lg"
                        placeholder={roleText("experiencePlaceholder")}
                        value={draft.experience}
                        onChange={(e) =>
                          setDraft({ ...draft, experience: e.target.value })
                        }
                      />
                    </label>
                  </div>
                )}

                {step === 3 && isParticipant && (
                  <div data-active-step className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      {t("tagHint")}
                    </p>
                    {(["skills", "interests"] as const).map((kind) => (
                      <RegistrationTags
                        key={kind}
                        kind={kind}
                        label={roleText(kind)}
                        hint={t("tagHint")}
                        values={draft[kind]}
                        options={
                          kind === "skills" ? skillOptions : interestOptions
                        }
                        input={tagInput[kind]}
                        error={tagError[kind]}
                        addLabel={
                          kind === "skills"
                            ? tProfile("addSkill")
                            : t("addInterest")
                        }
                        removeLabel={(value) =>
                          t("removeTag", { value: optionLabel(kind, value) })
                        }
                        optionLabel={(value) => optionLabel(kind, value)}
                        onInput={(value) => {
                          setTagInput((previous) => ({
                            ...previous,
                            [kind]: value,
                          }))
                          setTagError((previous) => ({
                            ...previous,
                            [kind]: "",
                          }))
                        }}
                        onAdd={() => addTags(kind)}
                        onToggle={(value) => toggleTag(kind, value)}
                      />
                    ))}
                  </div>
                )}

                {step === 4 && isParticipant && (
                  <div data-active-step className="space-y-4">
                    {isParticipant ? (
                      <div className={styles.fields}>
                        <label className="block min-w-0 text-sm font-medium sm:col-span-2">
                          {t("preferredChallenge")}
                          <Select
                            value={draft.preferredChallenge || "none"}
                            onValueChange={(value) =>
                              setDraft({
                                ...draft,
                                preferredChallenge:
                                  !value || value === "none" ? "" : value,
                              })
                            }
                          >
                            <SelectTrigger
                              type="button"
                              className={`${inputClass} !h-10 w-full`}
                            >
                              <SelectValue>
                                {(value) => {
                                  const challenge = challenges.find(
                                    (option) => option.title === value
                                  )
                                  return challenge
                                    ? locale === "ar" && challenge.titleAr
                                      ? challenge.titleAr
                                      : challenge.title
                                    : t("noPreferredChallenge")
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className={styles.selectMenu}>
                              <SelectItem value="none">
                                {t("noPreferredChallenge")}
                              </SelectItem>
                              {challenges.map((challenge) => (
                                <SelectItem
                                  key={challenge.id}
                                  value={challenge.title}
                                >
                                  {locale === "ar" && challenge.titleAr
                                    ? challenge.titleAr
                                    : challenge.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {challengeLoadError && (
                            <span
                              role="status"
                              className="mt-1 block text-xs text-muted-foreground"
                            >
                              {t("challengeListUnavailable")}
                            </span>
                          )}
                        </label>
                        <label className="block min-w-0 text-sm font-medium">
                          {t("desiredRole")}
                          <Select
                            value={draft.desiredRole || "none"}
                            onValueChange={(value) =>
                              setDraft({
                                ...draft,
                                desiredRole:
                                  !value || value === "none" ? "" : value,
                              })
                            }
                          >
                            <SelectTrigger
                              type="button"
                              className={`${inputClass} !h-10 w-full`}
                            >
                              <SelectValue>
                                {(value) => {
                                  const index = (
                                    roleOptions as readonly string[]
                                  ).indexOf(String(value))
                                  return index >= 0
                                    ? tProfile(`roles.${index}`)
                                    : t("noPreferredRole")
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className={styles.selectMenu}>
                              <SelectItem value="none">
                                {t("noPreferredRole")}
                              </SelectItem>
                              {roleOptions.map((role, index) => (
                                <SelectItem key={role} value={role}>
                                  {tProfile(`roles.${index}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                        <label className="block min-w-0 text-sm font-medium">
                          {t("teamStatus")}
                          <Select
                            value={draft.teamStatus}
                            onValueChange={(value) => {
                              if (value)
                                setDraft({
                                  ...draft,
                                  teamStatus: value as typeof draft.teamStatus,
                                })
                            }}
                          >
                            <SelectTrigger
                              type="button"
                              className={`${inputClass} !h-10 w-full`}
                            >
                              <SelectValue>
                                {(value) =>
                                  value ? t(`teamStatusOptions.${value}`) : ""
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className={styles.selectMenu}>
                              {participationOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {t(`teamStatusOptions.${status}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6">
                        {roleText("approval")}
                      </p>
                    )}
                    <div className="rounded-xl border border-border p-3">
                      <h2 className="text-sm font-semibold">
                        {t("reviewTitle")}
                      </h2>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm [overflow-wrap:anywhere]">
                        {[
                          [t("name"), draft.name],
                          [t("roleLabel"), tAccount(requestedRole)],
                          [t("email"), draft.email],
                          [roleText("institution"), draft.institution || "—"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-xs text-muted-foreground">
                              {label}
                            </dt>
                            <dd className="mt-1">{value}</dd>
                          </div>
                        ))}
                        {(["skills", "interests"] as const).map((kind) => (
                          <div key={kind}>
                            <dt className="text-xs text-muted-foreground">
                              {roleText(kind)}
                            </dt>
                            <dd className="mt-1 flex flex-wrap gap-1">
                              {draft[kind].length
                                ? draft[kind].map((value) => (
                                    <span
                                      key={value}
                                      className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                                    >
                                      {optionLabel(kind, value)}
                                    </span>
                                  ))
                                : "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {!isParticipant && (
                        <details className="mt-3 border-t border-border pt-3 text-sm">
                          <summary className="cursor-pointer font-medium">
                            {t("reviewBackground")}
                          </summary>
                          <dl className="mt-2 space-y-2 [overflow-wrap:anywhere]">
                            <div>
                              <dt className="text-xs text-muted-foreground">
                                {roleText("bio")}
                              </dt>
                              <dd className="whitespace-pre-wrap">
                                {draft.bio || "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">
                                {roleText("experience")}
                              </dt>
                              <dd className="whitespace-pre-wrap">
                                {draft.experience || "—"}
                              </dd>
                            </div>
                          </dl>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </fieldset>
              <div className={styles.actions}>
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setError("")
                      setStep((current) => current - 1)
                    }}
                    className="h-11 rounded-lg px-4"
                  >
                    <ArrowLeft className="size-4 rtl:rotate-180" />
                    {t("backStep")}
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 rounded-lg px-5"
                >
                  {t(
                    busy
                      ? "submitting"
                      : step === totalSteps
                        ? "submit"
                        : "continue"
                  )}
                  {step !== totalSteps && (
                    <ArrowRight className="size-4 rtl:rotate-180" />
                  )}
                </Button>
              </div>
            </form>
          )}
          <p className="mt-3 text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link
              href="/login"
              className="font-semibold text-primary underline underline-offset-4"
            >
              {t("signIn")}
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}
