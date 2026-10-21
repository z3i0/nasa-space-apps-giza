"use client"

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  UserRound,
  UsersRound,
  Sparkles,
  Globe,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Link } from "@/i18n/routing"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import { setAuth, clearLocalAuth } from "@/lib/auth"
import { RoleSelect } from "@/components/role-select"
import { cn } from "@/lib/utils"
import { skillOptions, interestOptions, roleOptions } from "@/lib/profile"

type RegistrationChallenge = {
  id: string
  title: string
  titleAr: string | null
}
type TeamStatus =
  | "already_have_team"
  | "want_to_join_team"
  | "want_to_create_team"
  | "working_individually"

const teamStatuses: TeamStatus[] = [
  "already_have_team",
  "want_to_join_team",
  "want_to_create_team",
  "working_individually",
]

export default function RegisterPage() {
  const t = useTranslations("Auth.register")
  const tProfile = useTranslations("Dashboard.profilePage")
  const academicLevels = t.raw("academicLevels") as {
    value: string
    label: string
  }[]
  const locale = useLocale()
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState(false)
  const [step, setStep] = useState(1)
  const [requestedRole, setRequestedRole] = useState("participant")
  const [challenges, setChallenges] = useState<RegistrationChallenge[]>([])
  const [challengeLoadError, setChallengeLoadError] = useState(false)
  const [customSkillInput, setCustomSkillInput] = useState("")
  const [skillError, setSkillError] = useState("")
  const [customInterestInput, setCustomInterestInput] = useState("")
  const [interestError, setInterestError] = useState("")
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
    teamStatus: "want_to_join_team" as TeamStatus,
    desiredRole: "",
  })

  const optionLabel = (kind: "skills" | "interests", value: string) => {
    const index = (
      kind === "skills"
        ? ([...skillOptions] as string[])
        : ([...interestOptions] as string[])
    ).indexOf(value)
    return index >= 0 ? tProfile(`${kind}.${index}`) : value
  }

  function handleAddSkills(rawText?: string) {
    const text = rawText !== undefined ? rawText : customSkillInput
    const tokens = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (!tokens.length) return

    const currentSkills = [...draft.skills]
    let error = ""

    for (const token of tokens) {
      if (token.length > 64) {
        error = tProfile("skillTooLong")
        break
      }
      const existingOption = skillOptions.find(
        (opt) => opt.toLowerCase() === token.toLowerCase()
      )
      const skillToAdd = existingOption ?? token
      const alreadySelected = currentSkills.some(
        (s) => s.toLowerCase() === skillToAdd.toLowerCase()
      )
      if (alreadySelected) {
        if (tokens.length === 1) {
          error = tProfile("skillAlreadyAdded")
        }
        continue
      }
      if (currentSkills.length >= 50) {
        error = tProfile("skillLimitReached")
        break
      }
      currentSkills.push(skillToAdd)
    }

    setDraft((prev) => ({ ...prev, skills: currentSkills }))
    setCustomSkillInput("")
    setSkillError(error)
  }

  function toggleSkill(skill: string) {
    setDraft((prev) => {
      const exists = prev.skills.includes(skill)
      return {
        ...prev,
        skills: exists
          ? prev.skills.filter((s) => s !== skill)
          : [...prev.skills, skill],
      }
    })
  }

  function removeSkill(skill: string) {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  function handleAddInterests(rawText?: string) {
    const text = rawText !== undefined ? rawText : customInterestInput
    const tokens = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (!tokens.length) return

    const currentInterests = [...draft.interests]
    let error = ""

    for (const token of tokens) {
      if (token.length > 64) {
        error = t("interestTooLong")
        break
      }
      const existingOption = interestOptions.find(
        (opt) => opt.toLowerCase() === token.toLowerCase()
      )
      const interestToAdd = existingOption ?? token
      const alreadySelected = currentInterests.some(
        (s) => s.toLowerCase() === interestToAdd.toLowerCase()
      )
      if (alreadySelected) {
        if (tokens.length === 1) {
          error = t("interestAlreadyAdded")
        }
        continue
      }
      if (currentInterests.length >= 50) {
        error = t("interestLimitReached")
        break
      }
      currentInterests.push(interestToAdd)
    }

    setDraft((prev) => ({ ...prev, interests: currentInterests }))
    setCustomInterestInput("")
    setInterestError(error)
  }

  function toggleInterest(interest: string) {
    setDraft((prev) => {
      const exists = prev.interests.includes(interest)
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((s) => s !== interest)
          : [...prev.interests, interest],
      }
    })
  }

  function removeInterest(interest: string) {
    setDraft((prev) => ({
      ...prev,
      interests: prev.interests.filter((s) => s !== interest),
    }))
  }

  useEffect(() => {
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
  }, [])

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step !== 3) return
    if (lock.current) return
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
    lock.current = true
    setBusy(true)

    const pendingSkills = customSkillInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const finalSkills = [...new Set([...draft.skills, ...pendingSkills])]

    const pendingInterests = customInterestInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const finalInterests = [
      ...new Set([...draft.interests, ...pendingInterests]),
    ]

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
          institution: draft.institution.trim(),
          academicLevel: draft.academicLevel.trim(),
          skills: finalSkills,
          bio: draft.bio.trim(),
          interests: finalInterests,
          experience: draft.experience.trim(),
          preferredChallenge: draft.preferredChallenge,
          teamStatus: draft.teamStatus,
          desiredRole: draft.desiredRole.trim(),
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
      // Better Auth signs the browser session cookie; never fabricate a cookie.
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

  function nextStep(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form
    const panel = form?.querySelector<HTMLElement>("[data-active-step]")
    const fields = panel?.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input, textarea, select")
    if (fields && [...fields].some((field) => !field.reportValidity())) return
    if (step === 1 && draft.password !== draft.confirmPassword) {
      setError(t("mismatch"))
      return
    }
    if (step === 2) {
      if (customSkillInput.trim()) {
        handleAddSkills(customSkillInput)
      }
      if (customInterestInput.trim()) {
        handleAddInterests(customInterestInput)
      }
    }
    setError("")
    setStep((current) => Math.min(3, current + 1))
  }

  function previousStep() {
    setError("")
    setStep((current) => Math.max(1, current - 1))
  }

  const steps = [
    { number: 1, key: "stepAccount", icon: UserRound },
    { number: 2, key: "stepProfile", icon: GraduationCap },
    { number: 3, key: "stepTeam", icon: UsersRound },
  ] as const

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background text-foreground">
      <header className="relative z-10 flex items-center justify-between border-b border-border/70 bg-background/70 p-4 backdrop-blur-xl sm:px-8">
        <Link href="/" className="text-sm underline underline-offset-4">
          {t("backToHome")}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="relative mx-auto grid min-h-[calc(100svh-65px)] w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:px-8 lg:py-12">
        <aside className="hidden space-y-8 lg:block">
          <div className="space-y-4">
            <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
            <h1 className="max-w-lg text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
              {t("title")}
            </h1>
            <p className="max-w-md text-base leading-7 text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <div className="grid max-w-md grid-cols-3 gap-3 pt-3">
            {steps.map(({ number, key, icon: Icon }) => (
              <div
                key={number}
                className={`space-y-2 rounded-xl border p-3 transition-colors ${step === number ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card/40"}`}
              >
                <Icon
                  className={`size-4 ${step === number ? "text-primary" : "text-muted-foreground"}`}
                />
                <p className="text-xs leading-5 font-medium">{t(key)}</p>
              </div>
            ))}
          </div>
        </aside>

        <Card className="mx-auto w-full max-w-2xl border-border/70 bg-card/90 shadow-2xl shadow-primary/5 backdrop-blur-sm">
          <CardHeader className="space-y-5 p-5 pb-3 sm:p-8 sm:pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  className="text-lg font-semibold tracking-tight sm:text-2xl lg:text-3xl"
                >
                  <span className="inline-block whitespace-nowrap">
                    {created ? t("title") : t("stepTitle", { step })}
                  </span>
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  {created ? t("subtitle") : t(`stepDescription${step}`)}
                </CardDescription>
              </div>
            </div>
            {!created && (
              <div className="space-y-3">
                <Progress value={step} max={3} className="h-1.5" />
                <ol
                  aria-label={t("registrationProgress")}
                  className="grid grid-cols-3 gap-2"
                >
                  {steps.map(({ number, key }) => {
                    const complete = number < step
                    const current = number === step
                    return (
                      <li
                        key={number}
                        aria-current={current ? "step" : undefined}
                        className="flex min-w-0 items-center gap-2 text-xs"
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${complete ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                        >
                          {complete ? <Check className="size-3.5" /> : number}
                        </span>
                        <span
                          className={
                            current
                              ? "truncate font-semibold text-foreground"
                              : "hidden truncate text-muted-foreground sm:inline"
                          }
                        >
                          {t(key)}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-5 pt-3 sm:p-8 sm:pt-4">
            {created ? (
              <div role="status" className="space-y-4">
                <p>{t("created")}</p>
                <Link
                  href="/login"
                  className="font-semibold text-primary underline"
                >
                  {t("signIn")}
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <p
                    role="alert"
                    className="mb-5 rounded-xl border border-destructive/40 p-3 text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
                <form className="space-y-6" onSubmit={register}>
                  {step === 1 && (
                    <div data-active-step className="space-y-5">
                      <RoleSelect
                        value={requestedRole}
                        onChange={setRequestedRole}
                        disabled={busy}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium">
                          {t("name")}
                          <Input
                            required
                            minLength={2}
                            maxLength={120}
                            autoComplete="name"
                            className="mt-2 h-11 rounded-xl"
                            value={draft.name}
                            onChange={(e) =>
                              setDraft({ ...draft, name: e.target.value })
                            }
                          />
                        </label>
                        <label className="block text-sm font-medium">
                          {t("email")}
                          <Input
                            required
                            type="email"
                            autoComplete="email"
                            className="mt-2 h-11 rounded-xl"
                            value={draft.email}
                            onChange={(e) =>
                              setDraft({ ...draft, email: e.target.value })
                            }
                          />
                        </label>
                        <label className="block text-sm font-medium sm:col-span-2">
                          {t("phone")}
                          <Input
                            required
                            type="tel"
                            maxLength={40}
                            autoComplete="tel"
                            className="mt-2 h-11 rounded-xl"
                            value={draft.phone}
                            onChange={(e) =>
                              setDraft({ ...draft, phone: e.target.value })
                            }
                          />
                        </label>
                        <label className="block text-sm font-medium">
                          {t("password")}
                          <Input
                            required
                            type="password"
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            aria-describedby="password-hint"
                            className="mt-2 h-11 rounded-xl"
                            value={draft.password}
                            onChange={(e) =>
                              setDraft({ ...draft, password: e.target.value })
                            }
                          />
                          <span
                            id="password-hint"
                            className="mt-1 block text-xs text-muted-foreground"
                          >
                            {t("passwordHint")}
                          </span>
                        </label>
                        <label className="block text-sm font-medium">
                          {t("confirmPassword")}
                          <Input
                            required
                            type="password"
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            className="mt-2 h-11 rounded-xl"
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
                    </div>
                  )}

                  {step === 2 && (
                    <div data-active-step className="space-y-5">
                      <div>
                        <h2 className="text-base font-semibold">
                          {t("profileDetails")}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {t("profileDetailsHint")}
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium">
                          {t("institution")}
                          <Input
                            name="institution"
                            maxLength={160}
                            autoComplete="organization"
                            className="mt-2 h-11 rounded-xl"
                            value={draft.institution}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                institution: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="block text-sm font-medium">
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
                              className="mt-2 !h-11 w-full rounded-xl bg-background text-base md:text-sm"
                            >
                              <SelectValue
                                placeholder={t("chooseAcademicLevel")}
                              >
                                {(value) =>
                                  !value || value === "none"
                                    ? t("chooseAcademicLevel")
                                    : (academicLevels.find(
                                      (level) => level.value === value
                                    )?.label ?? value)
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                {t("chooseAcademicLevel")}
                              </SelectItem>
                              {academicLevels.map((level) => (
                                <SelectItem
                                  key={level.value}
                                  value={level.value}
                                >
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                        {/* Skills Section */}
                        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 sm:col-span-2 sm:p-5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Sparkles className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-foreground">
                                  {tProfile("skillsLabel")}
                                </h3>
                                {draft.skills.length > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full border-primary/20 bg-primary/10 px-2 py-0 text-[11px] font-semibold text-primary"
                                  >
                                    {draft.skills.length}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {tProfile("skillsEmpty")}
                              </p>
                            </div>
                          </div>

                          <Separator />

                          {/* Selected Skills */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <CheckCircle2 className="size-3.5 text-primary" />
                                <span>{tProfile("selectedSkills")}</span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  ({draft.skills.length})
                                </span>
                              </span>
                              {draft.skills.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraft((prev) => ({
                                      ...prev,
                                      skills: [],
                                    }))
                                  }
                                  className="cursor-pointer text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                                >
                                  {tProfile("clearAllSkills")}
                                </button>
                              )}
                            </div>

                            {draft.skills.length > 0 ? (
                              <div className="flex min-h-[46px] flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-secondary/20 p-3">
                                {draft.skills.map((skill) => (
                                  <Badge
                                    key={skill}
                                    variant="secondary"
                                    className="group inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 py-1 ps-3 pe-1.5 text-xs font-medium text-primary shadow-2xs"
                                  >
                                    <span>{optionLabel("skills", skill)}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeSkill(skill)}
                                      aria-label={tProfile("removeSkill", {
                                        skill: optionLabel("skills", skill),
                                      })}
                                      className="inline-flex size-4 cursor-pointer items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/25 hover:text-primary"
                                    >
                                      <X className="size-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
                                <p className="text-xs text-muted-foreground">
                                  {tProfile("noSkillsSelected")}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Add Custom Skill */}
                          <div className="space-y-2">
                            <label
                              htmlFor="custom-skill-input"
                              className="block text-xs font-semibold text-foreground"
                            >
                              {tProfile("addCustomSkillLabel")}
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <div className="relative flex-1">
                                <Input
                                  id="custom-skill-input"
                                  name="skills"
                                  value={customSkillInput}
                                  onChange={(e) => {
                                    setCustomSkillInput(e.target.value)
                                    if (skillError) setSkillError("")
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      handleAddSkills()
                                    }
                                  }}
                                  maxLength={64}
                                  placeholder={tProfile(
                                    "customSkillPlaceholder"
                                  )}
                                  className="h-10 rounded-xl pe-8 text-sm"
                                />
                                {customSkillInput && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCustomSkillInput("")
                                      setSkillError("")
                                    }}
                                    className="absolute end-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-xs text-muted-foreground hover:text-foreground"
                                    aria-label={tProfile("close")}
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                )}
                              </div>
                              <Button
                                type="button"
                                onClick={() => handleAddSkills()}
                                disabled={!customSkillInput.trim()}
                                variant="secondary"
                                className="h-10 shrink-0 cursor-pointer gap-1.5 rounded-xl px-4 text-xs font-semibold"
                              >
                                <Plus className="size-3.5" />
                                <span>{tProfile("addSkill")}</span>
                              </Button>
                            </div>
                            {skillError && (
                              <p className="flex items-center gap-1 text-xs text-destructive">
                                <AlertCircle className="size-3" />
                                <span>{skillError}</span>
                              </p>
                            )}
                          </div>

                          {/* Popular / Suggested Skills */}
                          <fieldset className="m-0 min-w-0 space-y-2.5 border-0 border-t border-border/40 p-0 pt-3">
                            <legend className="w-full">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                  <Sparkles className="size-3.5 text-amber-500" />
                                  <span>{tProfile("popularSkills")}</span>
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {
                                    skillOptions.filter((s) =>
                                      draft.skills.includes(s)
                                    ).length
                                  }{" "}
                                  / {skillOptions.length}
                                </span>
                              </div>
                            </legend>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {skillOptions.map((value) => {
                                const isSelected = draft.skills.includes(value)
                                return (
                                  <Button
                                    key={value}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-pressed={isSelected}
                                    onClick={() => toggleSkill(value)}
                                    className={cn(
                                      "h-8 cursor-pointer gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-all",
                                      isSelected
                                        ? "border-primary/60 bg-primary/20 font-semibold text-primary shadow-xs ring-1 ring-primary/30 hover:bg-primary/30 hover:text-primary"
                                        : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                    )}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="text-xs font-bold"
                                    >
                                      {isSelected ? "✓" : "+"}
                                    </span>
                                    {optionLabel("skills", value)}
                                  </Button>
                                )
                              })}
                            </div>
                          </fieldset>
                        </div>

                        <label className="block text-sm font-medium sm:col-span-2">
                          {t("bio")}
                          <Textarea
                            name="bio"
                            maxLength={1000}
                            rows={3}
                            className="mt-2 min-h-24 rounded-xl"
                            value={draft.bio}
                            onChange={(e) =>
                              setDraft({ ...draft, bio: e.target.value })
                            }
                          />
                        </label>

                        {/* Interests Section */}
                        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 sm:col-span-2 sm:p-5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                              <Globe className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-foreground">
                                  {tProfile("interestsLabel")}
                                </h3>
                                {draft.interests.length > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full border-sky-500/20 bg-sky-500/10 px-2 py-0 text-[11px] font-semibold text-sky-500"
                                  >
                                    {draft.interests.length}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {t("interestsDescription")}
                              </p>
                            </div>
                          </div>

                          <Separator />

                          {/* Selected Interests */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <CheckCircle2 className="size-3.5 text-sky-500" />
                                <span>{t("selectedInterests")}</span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  ({draft.interests.length})
                                </span>
                              </span>
                              {draft.interests.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraft((prev) => ({
                                      ...prev,
                                      interests: [],
                                    }))
                                  }
                                  className="cursor-pointer text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                                >
                                  {t("clearAllInterests")}
                                </button>
                              )}
                            </div>

                            {draft.interests.length > 0 ? (
                              <div className="flex min-h-[46px] flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-secondary/20 p-3">
                                {draft.interests.map((interest) => (
                                  <Badge
                                    key={interest}
                                    variant="secondary"
                                    className="group inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 py-1 ps-3 pe-1.5 text-xs font-medium text-sky-500 shadow-2xs"
                                  >
                                    <span>
                                      {optionLabel("interests", interest)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeInterest(interest)}
                                      aria-label={tProfile("removeSkill", {
                                        skill: optionLabel(
                                          "interests",
                                          interest
                                        ),
                                      })}
                                      className="inline-flex size-4 cursor-pointer items-center justify-center rounded-full text-sky-500/70 transition-colors hover:bg-sky-500/25 hover:text-sky-500"
                                    >
                                      <X className="size-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
                                <p className="text-xs text-muted-foreground">
                                  {t("noInterestsSelected")}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Add Custom Interest */}
                          <div className="space-y-2">
                            <label
                              htmlFor="custom-interest-input"
                              className="block text-xs font-semibold text-foreground"
                            >
                              {t("addCustomInterestLabel")}
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <div className="relative flex-1">
                                <Input
                                  id="custom-interest-input"
                                  name="interests"
                                  value={customInterestInput}
                                  onChange={(e) => {
                                    setCustomInterestInput(e.target.value)
                                    if (interestError) setInterestError("")
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      handleAddInterests()
                                    }
                                  }}
                                  maxLength={64}
                                  placeholder={t("customInterestPlaceholder")}
                                  className="h-10 rounded-xl pe-8 text-sm"
                                />
                                {customInterestInput && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCustomInterestInput("")
                                      setInterestError("")
                                    }}
                                    className="absolute end-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-xs text-muted-foreground hover:text-foreground"
                                    aria-label={tProfile("close")}
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                )}
                              </div>
                              <Button
                                type="button"
                                onClick={() => handleAddInterests()}
                                disabled={!customInterestInput.trim()}
                                variant="secondary"
                                className="h-10 shrink-0 cursor-pointer gap-1.5 rounded-xl px-4 text-xs font-semibold"
                              >
                                <Plus className="size-3.5" />
                                <span>{t("addInterest")}</span>
                              </Button>
                            </div>
                            {interestError && (
                              <p className="flex items-center gap-1 text-xs text-destructive">
                                <AlertCircle className="size-3" />
                                <span>{interestError}</span>
                              </p>
                            )}
                          </div>

                          {/* Suggested Interest Options */}
                          <fieldset className="m-0 min-w-0 space-y-2.5 border-0 border-t border-border/40 p-0 pt-3">
                            <legend className="w-full">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                  <Globe className="size-3.5 text-sky-500" />
                                  <span>{t("popularInterests")}</span>
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {
                                    interestOptions.filter((i) =>
                                      draft.interests.includes(i)
                                    ).length
                                  }{" "}
                                  / {interestOptions.length}
                                </span>
                              </div>
                            </legend>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {interestOptions.map((value) => {
                                const isSelected =
                                  draft.interests.includes(value)
                                return (
                                  <Button
                                    key={value}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-pressed={isSelected}
                                    onClick={() => toggleInterest(value)}
                                    className={cn(
                                      "h-8 cursor-pointer gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-all",
                                      isSelected
                                        ? "border-sky-500/60 bg-sky-500/20 font-semibold text-sky-400 shadow-xs ring-1 ring-sky-500/30 hover:bg-sky-500/30 hover:text-sky-300"
                                        : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                                    )}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="text-xs font-bold"
                                    >
                                      {isSelected ? "✓" : "+"}
                                    </span>
                                    {optionLabel("interests", value)}
                                  </Button>
                                )
                              })}
                            </div>
                          </fieldset>
                        </div>
                        <label className="block text-sm font-medium sm:col-span-2">
                          {t("experience")}
                          <Textarea
                            name="experience"
                            maxLength={3000}
                            rows={3}
                            className="mt-2 min-h-24 rounded-xl"
                            value={draft.experience}
                            onChange={(e) =>
                              setDraft({ ...draft, experience: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div data-active-step className="space-y-5">
                      <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                        <p className="text-sm font-medium">
                          {t("teamProfileTitle")}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {t("teamProfileHint")}
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium">
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
                              className="mt-2 !h-11 w-full rounded-xl bg-background text-base md:text-sm"
                            >
                              <SelectValue
                                placeholder={t("noPreferredChallenge")}
                              >
                                {(value) => {
                                  if (!value || value === "none")
                                    return t("noPreferredChallenge")
                                  const challenge = challenges.find(
                                    (option) => option.title === value
                                  )
                                  return locale === "ar" && challenge?.titleAr
                                    ? challenge.titleAr
                                    : (challenge?.title ?? value)
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
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
                        <label className="block text-sm font-medium">
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
                              className="mt-2 !h-11 w-full rounded-xl bg-background text-base md:text-sm"
                            >
                              <SelectValue placeholder={t("noPreferredRole")}>
                                {(value) => {
                                  if (!value || value === "none")
                                    return t("noPreferredRole")
                                  const index = (
                                    roleOptions as readonly string[]
                                  ).indexOf(value)
                                  return index >= 0
                                    ? tProfile(`roles.${index}`)
                                    : value
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
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
                        <label className="block text-sm font-medium sm:col-span-2">
                          {t("teamStatus")}
                          <Select
                            value={draft.teamStatus}
                            onValueChange={(value) => {
                              if (value)
                                setDraft({
                                  ...draft,
                                  teamStatus: value as TeamStatus,
                                })
                            }}
                          >
                            <SelectTrigger
                              type="button"
                              className="mt-2 !h-11 w-full rounded-xl bg-background text-base md:text-sm"
                            >
                              <SelectValue>
                                {(value) =>
                                  value ? t(`teamStatusOptions.${value}`) : ""
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {teamStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {t(`teamStatusOptions.${status}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                      </div>
                      <div className="rounded-xl border border-border bg-background/60 p-4">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {t("reviewTitle")}
                        </p>
                        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {t("name")}
                            </dt>
                            <dd className="mt-1 font-medium">
                              {draft.name || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {t("institution")}
                            </dt>
                            <dd className="mt-1 font-medium">
                              {draft.institution || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {t("skills")}
                            </dt>
                            <dd className="mt-1 font-medium">
                              {draft.skills.length > 0 ? (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {draft.skills.map((s) => (
                                    <Badge
                                      key={s}
                                      variant="secondary"
                                      className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                                    >
                                      {optionLabel("skills", s)}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                "—"
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {t("interests")}
                            </dt>
                            <dd className="mt-1 font-medium">
                              {draft.interests.length > 0 ? (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {draft.interests.map((i) => (
                                    <Badge
                                      key={i}
                                      variant="secondary"
                                      className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-500"
                                    >
                                      {optionLabel("interests", i)}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                "—"
                              )}
                            </dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-xs text-muted-foreground">
                              {t("teamStatus")}
                            </dt>
                            <dd className="mt-1 font-medium">
                              {t(`teamStatusOptions.${draft.teamStatus}`)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:justify-between">
                    {step > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={previousStep}
                        className="h-11 rounded-xl px-5"
                      >
                        <ArrowLeft className="size-4 rtl:rotate-180" />
                        {t("backStep")}
                      </Button>
                    ) : (
                      <span className="hidden sm:block" />
                    )}
                    {step === 3 ? (
                      <Button
                        key="submit-btn"
                        type="submit"
                        disabled={busy}
                        className="h-11 rounded-xl px-6 text-sm font-semibold shadow-md shadow-primary/15"
                      >
                        {t(busy ? "submitting" : "submit")}
                      </Button>
                    ) : (
                      <Button
                        key="continue-btn"
                        type="button"
                        disabled={busy}
                        onClick={nextStep}
                        className="h-11 rounded-xl px-6 text-sm font-semibold shadow-md shadow-primary/15"
                      >
                        {t("continue")}
                        {locale === "ar" ? (
                          <ChevronLeft className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </>
            )}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link
                href="/login"
                className="font-semibold text-primary underline underline-offset-4"
              >
                {t("signIn")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
