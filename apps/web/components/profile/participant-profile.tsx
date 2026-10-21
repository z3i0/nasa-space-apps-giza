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
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/dashboard/page-header"
import { ChallengeSelect } from "./challenge-select"
import { DashboardThemeContext } from "@/components/dashboard/dashboard-theme-context"
import { getAuthUser, setAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
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
import {
  User as UserIcon,
  Sparkles,
  Globe,
  GraduationCap,
  Shield,
  Users,
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
} from "lucide-react"

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
  const [customSkillInput, setCustomSkillInput] = useState("")
  const [skillError, setSkillError] = useState("")
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
    return requestProfile(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setProfile(result)
        setDraft(profileDraft(result))
        setSaved(false)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorKey(error))
      })
      .finally(() => {
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

  function handleAddCustomSkill() {
    const trimmed = customSkillInput.trim()
    if (!trimmed || !draft) return

    if (trimmed.length > 64) {
      setSkillError(t("skillTooLong"))
      return
    }

    const existingOption = skillOptions.find(
      (opt) => opt.toLowerCase() === trimmed.toLowerCase()
    )
    const skillToAdd = existingOption ?? trimmed

    const alreadySelected = draft.skills.some(
      (s) => s.toLowerCase() === skillToAdd.toLowerCase()
    )

    if (alreadySelected) {
      setSkillError(t("skillAlreadyAdded"))
      return
    }

    if (draft.skills.length >= 50) {
      setSkillError(t("skillLimitReached"))
      return
    }

    change("skills", [...draft.skills, skillToAdd])
    setCustomSkillInput("")
    setSkillError("")
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
      toast.success(t("saved"))
      const user = getAuthUser()
      if (user)
        setAuth(
          {},
          {
            ...user,
            name: result.user.name,
            fullName: result.user.name,
            phone: result.user.phone,
          }
        )
    } catch (error) {
      if (!controller.signal.aborted) setError(errorKey(error))
    } finally {
      busy.current = false
      if (!controller.signal.aborted) setSaving(false)
    }
  }

  const errorMessage = error && (
    <div
      role="alert"
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive"
    >
      <p className="font-medium">{t(error)}</p>
      {error === "sessionExpired" ? (
        <Link href="/login" className="shrink-0 font-semibold underline">
          {t("signIn")}
        </Link>
      ) : (
        error === "conflict" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm(t("discardConfirm"))) reload()
            }}
            className="h-7 shrink-0 cursor-pointer rounded-lg text-xs"
          >
            {t("reload")}
          </Button>
        )
      )}
    </div>
  )

  if (loading)
    return (
      <div className="flex w-full flex-col gap-6" aria-busy="true">
        <PageHeader
          icon={UserIcon}
          title={t("title")}
          subtitle={t("loading")}
        />
        <p role="status" className="sr-only">
          {t("loading")}
        </p>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <Card className="space-y-5 rounded-2xl border-border/60 p-6 shadow-xs">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-3 w-64 rounded" />
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
              <Skeleton className="h-24 rounded-xl" />
            </Card>
            <Card className="space-y-4 rounded-2xl border-border/60 p-6 shadow-xs">
              <Skeleton className="h-5 w-32 rounded" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-24 rounded-full" />
                ))}
              </div>
            </Card>
          </div>
          <div className="flex flex-col gap-6 lg:col-span-4">
            <Card className="space-y-4 rounded-2xl border-border/60 p-6 shadow-xs">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
              <Skeleton className="h-20 rounded-xl" />
            </Card>
          </div>
        </div>
      </div>
    )

  if (!draft || !profile)
    return (
      <div className="flex w-full flex-col gap-6">
        <PageHeader icon={UserIcon} title={t("title")} />
        <Card className="mx-auto max-w-md space-y-4 rounded-2xl border-border/60 p-8 text-center shadow-xs">
          {errorMessage}
          <Button onClick={reload} className="cursor-pointer rounded-xl">
            {t("retry")}
          </Button>
        </Card>
      </div>
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

  const initials = (draft.name || profile.user.name || "U")
    .trim()
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  function matchingCard(inPreview = false) {
    if (!draft || !profile) return null
    return (
      <Card
        data-matching-card=""
        className={cn(
          "relative overflow-hidden border-border/60 bg-gradient-to-b from-card via-card to-background shadow-xs",
          inPreview && "border-0 bg-transparent shadow-none ring-0"
        )}
      >
        <CardHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center justify-between gap-3">
            {!inPreview && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                {t("matchingTitle")}
              </span>
            )}
            {profile.user.emailVerified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="size-3" />
                      {t("verified")}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>{t("verified")}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-3.5 pt-2">
            <Avatar className="size-12 ring-2 ring-primary/20">
              <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-heading text-lg font-bold text-foreground sm:text-xl">
                {draft.name || t("namePlaceholder")}
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel || t("chooseRole")}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p className="flex flex-wrap items-center gap-1.5">
              {[
                roleLabel,
                ...draft.skills
                  .filter((s) => !draft.desiredRole.includes(s))
                  .slice(0, 2)
                  .map((s) => optionLabel("skills", s)),
              ]
                .filter(Boolean)
                .join(" · ") || t("skillsEmpty")}
            </p>
            {[profile.academicLevel, profile.institution].filter(Boolean)
              .length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                <GraduationCap className="size-3.5 shrink-0 text-primary" />
                <span>
                  {[profile.academicLevel, profile.institution]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </p>
            )}
          </div>

          {draft.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {draft.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="rounded-full border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {optionLabel("skills", skill)}
                </Badge>
              ))}
            </div>
          )}

          {draft.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {draft.interests.map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
                >
                  {optionLabel("interests", interest)}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            {draft.bio || t("bioEmpty")}
          </p>

          {hidden && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{t("hiddenNote")}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        icon={UserIcon}
        title={t("title")}
        subtitle={t("previewDescription")}
      />

      {/* Main Form */}
      <form
        id="profile-form"
        onSubmit={save}
        data-profile-form=""
        aria-label={t("title")}
        className="w-full"
      >
        <fieldset disabled={saving} className="m-0 w-full min-w-0 border-0 p-0">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Primary Columns: Form Inputs */}
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
              {/* Card 1: Display Name & Preferred Role & Bio */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UserIcon className="size-4" />
                    </div>
                    <div>
                      <CardTitle>{t("title")}</CardTitle>
                      <CardDescription className="text-xs">
                        {t("previewDescription")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-5 pt-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="profile-name"
                        className="block text-xs font-semibold text-foreground"
                      >
                        {t("displayName")}
                      </label>
                      <Input
                        id="profile-name"
                        value={draft.name}
                        onChange={(e) => change("name", e.target.value)}
                        maxLength={100}
                        autoComplete="name"
                        aria-invalid={nameError}
                        aria-describedby={nameError ? "name-error" : undefined}
                        required
                        placeholder={t("namePlaceholder")}
                        className={cn(
                          "h-10 rounded-xl text-sm",
                          nameError &&
                            "border-destructive focus-visible:ring-destructive/30"
                        )}
                      />
                      {nameError && (
                        <p
                          id="name-error"
                          role="alert"
                          className="text-xs text-destructive"
                        >
                          {t("nameRequired")}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="profile-role"
                        className="block text-xs font-semibold text-foreground"
                      >
                        {t("preferredRole")}
                      </label>
                      <Select
                        value={draft.desiredRole}
                        onValueChange={(val) =>
                          change("desiredRole", val || "")
                        }
                      >
                        <SelectTrigger
                          id="profile-role"
                          className="h-10 w-full rounded-xl text-sm"
                        >
                          <SelectValue placeholder={t("chooseRole")}>
                            {(val) => {
                              if (!val) return t("chooseRole")
                              const index = (
                                roleOptions as readonly string[]
                              ).indexOf(val)
                              return index >= 0 ? t(`roles.${index}`) : val
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {roleOptions.map((role, index) => (
                              <SelectItem key={role} value={role}>
                                {t(`roles.${index}`)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label
                        htmlFor="profile-phone"
                        className="block text-xs font-semibold text-foreground"
                      >
                        {contact("contactNumber")}
                      </label>
                      <Input
                        id="profile-phone"
                        type="tel"
                        dir="ltr"
                        autoComplete="tel"
                        maxLength={40}
                        value={draft.phone}
                        onChange={(e) => change("phone", e.target.value)}
                        placeholder="+20 123 456 7890"
                        className="h-10 rounded-xl text-sm"
                        aria-describedby="profile-phone-help"
                      />
                      <p
                        id="profile-phone-help"
                        className="text-[11px] text-muted-foreground"
                      >
                        {contact("contactHelp")}
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="profile-bio"
                        className="text-xs font-semibold text-foreground"
                      >
                        {t("bioLabel")}
                      </label>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {draft.bio.length} / 1000
                      </span>
                    </div>
                    <Textarea
                      id="profile-bio"
                      value={draft.bio}
                      maxLength={1000}
                      placeholder={t("bioEmpty")}
                      onChange={(e) => change("bio", e.target.value)}
                      className="min-h-[96px] resize-y rounded-xl text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Skills */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{t("skillsLabel")}</CardTitle>
                        {draft.skills.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="rounded-full border-primary/20 bg-primary/10 px-2 py-0 text-[11px] font-semibold text-primary"
                          >
                            {draft.skills.length}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {t("skillsEmpty")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-6 pt-6">
                  {/* Selected Skills Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <CheckCircle2 className="size-3.5 text-primary" />
                        <span>{t("selectedSkills")}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          ({draft.skills.length})
                        </span>
                      </span>
                      {draft.skills.length > 0 && (
                        <button
                          type="button"
                          onClick={() => change("skills", [])}
                          className="cursor-pointer text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                        >
                          {t("clearAllSkills")}
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
                              onClick={() =>
                                change(
                                  "skills",
                                  draft.skills.filter((s) => s !== skill)
                                )
                              }
                              aria-label={t("removeSkill", {
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
                          {t("noSkillsSelected")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Add Custom Skill Input */}
                  <div className="space-y-2">
                    <label
                      htmlFor="custom-skill-input"
                      className="block text-xs font-semibold text-foreground"
                    >
                      {t("addCustomSkillLabel")}
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                        <Input
                          id="custom-skill-input"
                          value={customSkillInput}
                          onChange={(e) => {
                            setCustomSkillInput(e.target.value)
                            if (skillError) setSkillError("")
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleAddCustomSkill()
                            }
                          }}
                          maxLength={64}
                          placeholder={t("customSkillPlaceholder")}
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
                            aria-label={t("close")}
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddCustomSkill}
                        disabled={!customSkillInput.trim()}
                        variant="secondary"
                        className="h-10 shrink-0 cursor-pointer gap-1.5 rounded-xl px-4 text-xs font-semibold"
                      >
                        <Plus className="size-3.5" />
                        <span>{t("addSkill")}</span>
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
                  <fieldset className="m-0 min-w-0 space-y-2.5 border-0 border-t border-border/40 p-0 pt-2">
                    <legend className="w-full">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Sparkles className="size-3.5 text-amber-500" />
                          <span>{t("popularSkills")}</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {
                            skillOptions.filter((s) => draft.skills.includes(s))
                              .length
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
                            onClick={() =>
                              change(
                                "skills",
                                isSelected
                                  ? draft.skills.filter((s) => s !== value)
                                  : [...draft.skills, value]
                              )
                            }
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
                </CardContent>
              </Card>

              {/* Card 3: Interests & Preferred Challenge & Experience */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                      <Globe className="size-4" />
                    </div>
                    <div>
                      <CardTitle>{t("interestsLabel")}</CardTitle>
                      <CardDescription className="text-xs">
                        {t("challengeLabel")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-5 pt-6">
                  <fieldset className="m-0 min-w-0 border-0 p-0">
                    <legend className="mb-2.5 block text-xs font-semibold text-foreground">
                      {t("interestsLabel")}
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...new Set([...interestOptions, ...draft.interests]),
                      ].map((value) => {
                        const isSelected = draft.interests.includes(value)
                        return (
                          <Button
                            key={value}
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-pressed={isSelected}
                            onClick={() =>
                              change(
                                "interests",
                                isSelected
                                  ? draft.interests.filter((s) => s !== value)
                                  : [...draft.interests, value]
                              )
                            }
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

                  <div className="space-y-2">
                    <label
                      htmlFor="profile-challenge"
                      className="text-xs font-semibold text-foreground"
                    >
                      {t("challengeLabel")}
                    </label>
                    <ChallengeSelect
                      id="profile-challenge"
                      value={draft.preferredChallenge}
                      onChange={(value) => change("preferredChallenge", value)}
                      className="h-10 rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="profile-experience"
                      className="text-xs font-semibold text-foreground"
                    >
                      {t("experienceLabel")}
                    </label>
                    <Textarea
                      id="profile-experience"
                      value={draft.experience}
                      maxLength={3000}
                      onChange={(e) => change("experience", e.target.value)}
                      className="min-h-[96px] resize-y rounded-xl text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Participation & Team */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <CardTitle>{t("participationTitle")}</CardTitle>
                        <CardDescription className="text-xs">
                          {profile.team
                            ? t("teamSummary", {
                                name: profile.team.name,
                                count: profile.team.memberCount,
                              })
                            : t(`participationHelp.${draft.teamStatus}`)}
                        </CardDescription>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/participant/${profile.team || draft.teamStatus === "want_to_create_team" ? "team" : "find-team"}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "h-8 cursor-pointer rounded-xl px-3 text-xs font-medium"
                      )}
                    >
                      <span>
                        {profile.team?.name ||
                          t(
                            draft.teamStatus === "want_to_create_team"
                              ? "createTeam"
                              : "findTeam"
                          )}
                      </span>
                      <span aria-hidden="true" className="ms-1">
                        {locale === "ar" ? "←" : "→"}
                      </span>
                    </Link>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                  <fieldset className="m-0 min-w-0 border-0 p-0">
                    <legend className="sr-only">
                      {t("participationTitle")}
                    </legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {participationOptions.map((status) => {
                        const isSelected = draft.teamStatus === status
                        return (
                          <Button
                            type="button"
                            variant="outline"
                            key={status}
                            aria-pressed={isSelected}
                            onClick={() => change("teamStatus", status)}
                            className={cn(
                              "flex h-auto cursor-pointer items-center justify-start gap-2.5 rounded-xl px-4 py-3 text-start transition-all",
                              isSelected
                                ? "border-primary/50 bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                isSelected
                                  ? "border-primary"
                                  : "border-muted-foreground/50"
                              )}
                            >
                              {isSelected && (
                                <span className="size-2 rounded-full bg-primary" />
                              )}
                            </span>
                            <span className="text-xs font-semibold">
                              {t(`participation.${status}`)}
                            </span>
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>
                </CardContent>
              </Card>

              {/* Bottom Actions Bar */}
              <div className="flex flex-wrap items-center gap-3 pt-2 pb-6">
                <Button
                  type="submit"
                  disabled={!dirty || saving}
                  className="h-10 cursor-pointer gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                >
                  <Save className="size-4" />
                  <span>{t(saving ? "saving" : "save")}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!dirty || saving}
                  onClick={() => {
                    if (window.confirm(t("discardConfirm"))) {
                      setDraft(profileDraft(profile))
                      setError("")
                      setNameError(false)
                    }
                  }}
                  className="h-10 cursor-pointer rounded-xl px-4 font-medium"
                >
                  <RotateCcw className="size-4 text-muted-foreground" />
                  <span>{t("discard")}</span>
                </Button>

                <div
                  role="status"
                  className="ms-auto text-xs text-muted-foreground"
                >
                  {t(saved ? "saved" : dirty ? "unsaved" : "upToDate")}
                </div>

                {errorMessage}
              </div>
            </div>

            {/* Sidebar Column: Matching Card + Privacy + Next */}
            <aside
              className="flex min-w-0 flex-col gap-6 lg:col-span-4"
              aria-label={t("matchingTitle")}
            >
              {matchingCard()}

              {/* Privacy & Visibility Card */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-primary" />
                    <CardTitle className="text-sm">
                      {t("privacyTitle")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-4 pt-5">
                  {(
                    [
                      "isPublic",
                      "shareProjectsWithMentors",
                      "hideFromSearch",
                    ] as const
                  ).map((key) => (
                    <label
                      key={key}
                      className="group flex cursor-pointer items-start gap-3 text-xs font-medium text-foreground"
                    >
                      <Checkbox
                        className="mt-0.5 rounded-sm"
                        checked={draft[key]}
                        onCheckedChange={(value) => change(key, value)}
                      />
                      <span className="leading-relaxed group-hover:text-foreground/90">
                        {t(`privacy.${key}`)}
                      </span>
                    </label>
                  ))}

                  <div className="rounded-xl border border-border/40 bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
                    {t("privacyNote")}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreview(true)}
                    className="h-9 w-full cursor-pointer gap-2 rounded-xl text-xs font-medium"
                  >
                    <Eye className="size-3.5 text-primary" />
                    <span>{t("preview")}</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Next Step Card */}
              <Card className="rounded-2xl border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t("nextTitle")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("nextDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Link
                    href="/dashboard/participant/challenges"
                    className={cn(
                      buttonVariants(),
                      "h-9 w-full cursor-pointer gap-2 rounded-xl text-xs font-semibold"
                    )}
                  >
                    <span>{t("explore")}</span>
                    <span aria-hidden="true">
                      {locale === "ar" ? "←" : "→"}
                    </span>
                  </Link>
                </CardContent>
              </Card>
            </aside>
          </div>
        </fieldset>
      </form>

      {/* Preview Dialog */}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent
          className={cn(theme, "max-w-md rounded-2xl p-6 sm:p-7")}
          dir={locale === "ar" ? "rtl" : "ltr"}
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {t("preview")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t(hidden ? "hiddenPreview" : "previewDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">{matchingCard(true)}</div>

          <DialogFooter className="sm:justify-start">
            <DialogClose
              render={
                <Button
                  variant="outline"
                  className="h-9 w-full cursor-pointer rounded-xl text-xs"
                />
              }
            >
              {t("close")}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
