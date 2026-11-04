"use client"

import { useContext, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Award, CalendarDays, Compass, Search, X } from "lucide-react"
import { Link } from "@/i18n/routing"
import { PageHeader } from "@/components/dashboard/page-header"
import { DashboardThemeContext } from "@/components/dashboard/dashboard-theme-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { accountApi, type RoleApplication } from "@/lib/account"
import { mentorshipApi, type Mentor, type MentorSlot } from "@/lib/mentorship"
import { judgingApi, type Assignment, type Management } from "@/lib/judging"
import {
  ContactEmail,
  directoryGrid,
  directoryItem,
  directoryTags,
} from "./admin-directory-ui"

type Kind = "mentors" | "judges"
interface Expert {
  id: string
  name: string
  email?: string
  avatar?: string | null
  bio: string
  topics: string[]
  availability: string
  slots: MentorSlot[]
  assignments: Assignment[]
}
interface ExtraProfile {
  bio: string | null
  skills: string[]
  user?: { avatar?: string | null }
}
const field =
  "h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm"
const pageSize = 6
function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\p{M}\u0640]/gu, "")
    .trim()
    .toLowerCase()
}
function topicsFor(mentor: Mentor) {
  const topics = new Map<string, string>()
  for (const topic of [
    ...(mentor.mentorProfile?.expertise ?? []),
    ...(mentor.profile?.skills ?? []),
  ]) {
    const key = normalize(topic)
    if (key && !topics.has(key)) topics.set(key, topic.trim())
  }
  return [...topics.values()]
}

export function OrganizerExperts({ kind }: { kind: Kind }) {
  const t = useTranslations("Operations")
  const a = useTranslations("Operations.admin")
  const locale = useLocale()
  const [entries, setEntries] = useState<Expert[] | null>(null)
  const [error, setError] = useState(false)
  const [contactsError, setContactsError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("")
  const [openHours, setOpenHours] = useState(false)
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      const [source, applications] = await Promise.allSettled([
        kind === "mentors"
          ? mentorshipApi<Mentor[]>("/mentors", { signal: controller.signal })
          : judgingApi<Management>(
              "/manage",
              "GET",
              undefined,
              controller.signal
            ),
        accountApi<RoleApplication[]>(
          "/role-applications",
          undefined,
          controller.signal
        ),
      ])
      if (controller.signal.aborted) return
      setContactsError(applications.status === "rejected")
      if (source.status === "rejected") {
        setError(true)
        return
      }
      const contacts = new Map(
        applications.status === "fulfilled"
          ? applications.value
              .filter((item) => item.user?.id)
              .map((item) => [item.user!.id, item.user!.email])
          : []
      )
      const data = source.value
      const people: Expert[] = Array.isArray(data)
        ? data.map((mentor) => ({
            id: mentor.id,
            name: mentor.name,
            avatar: mentor.avatar,
            email: contacts.get(mentor.id),
            bio:
              mentor.mentorProfile?.bio.trim() ||
              mentor.profile?.bio?.trim() ||
              "",
            topics: topicsFor(mentor),
            availability: mentor.mentorProfile?.availability || "",
            slots: mentor.mentorSlots,
            assignments: [],
          }))
        : data.judges.map((judge) => ({
            ...judge,
            email: contacts.get(judge.id),
            bio: "",
            topics: [],
            availability: "",
            slots: [],
            assignments: data.assignments.filter(
              (assignment) => assignment.judgeId === judge.id
            ),
          }))
      setEntries(people.sort((a, b) => a.name.localeCompare(b.name, locale)))
      setNow(Date.now())
      setError(false)
    }
    void load()
    return () => controller.abort()
  }, [kind, attempt, locale])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const topicOptions = new Map<string, string>()
  for (const entry of entries ?? [])
    for (const topic of entry.topics) {
      if (!topicOptions.has(normalize(topic)))
        topicOptions.set(normalize(topic), topic)
    }
  const terms = normalize(search).split(/\s+/).filter(Boolean)
  const filtered = (entries ?? []).filter((entry) => {
    const searchable = normalize(
      [
        entry.name,
        entry.email,
        ...(kind === "mentors" ? [entry.bio, ...entry.topics] : []),
      ].join(" ")
    )
    if (!terms.every((term) => searchable.includes(term))) return false
    if (kind === "mentors")
      return (
        (!filter ||
          entry.topics.some((topic) => normalize(topic) === filter)) &&
        (!openHours ||
          entry.slots.some((slot) => Date.parse(slot.startTime) > now))
      )
    return (
      !filter ||
      (filter === "unassigned"
        ? entry.assignments.length === 0
        : entry.assignments.some((item) => !item.completed))
    )
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  const clear = () => {
    setSearch("")
    setFilter("")
    setOpenHours(false)
    setPage(1)
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5">
      <PageHeader
        title={t(kind)}
        subtitle={a(`${kind}Hint`)}
        actions={
          <>
            <Link
              href={`/dashboard/organizer/role-requests?role=${kind === "judges" ? "judge" : "mentor"}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {a("allApprovals")}
            </Link>
            {kind === "judges" && (
              <Link
                href="/dashboard/organizer/scores"
                className={buttonVariants({ size: "sm" })}
              >
                {a("manageJudging")}
              </Link>
            )}
          </>
        }
      />
      <section
        aria-label={a("filters")}
        className="grid gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <label htmlFor="expert-search" className="text-xs font-medium">
              {a("searchLabel")}
            </label>
            <div className="relative mt-1.5">
              <Search
                className="pointer-events-none absolute start-3 top-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="expert-search"
                type="search"
                className={`${field} ps-9`}
                value={search}
                maxLength={150}
                placeholder={a(`${kind}Search`)}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          <label className="min-w-0 text-xs font-medium">
            {a(kind === "mentors" ? "topicFilter" : "workloadFilter")}
            <select
              className={`mt-1.5 ${field}`}
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">
                {a(kind === "mentors" ? "allTopics" : "allJudges")}
              </option>
              {kind === "mentors" ? (
                [...topicOptions]
                  .sort(([, a], [, b]) => a.localeCompare(b, locale))
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))
              ) : (
                <>
                  <option value="pending">{a("needsReview")}</option>
                  <option value="unassigned">{a("unassigned")}</option>
                </>
              )}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {kind === "mentors" && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={openHours}
                onChange={(event) => {
                  setOpenHours(event.target.checked)
                  setPage(1)
                }}
                className="size-4 accent-primary"
              />
              {a("openHoursOnly")}
            </label>
          )}
          {(search || filter || openHours) && (
            <button
              className="text-xs font-medium text-primary hover:underline"
              onClick={clear}
            >
              {a("clearFilters")}
            </button>
          )}
        </div>
      </section>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 p-5 text-sm"
        >
          {t("error")}{" "}
          <Button
            variant="outline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("retry")}
          </Button>
        </div>
      ) : !entries ? (
        <p role="status" className="py-5 text-sm text-muted-foreground">
          {t("loading")}
        </p>
      ) : (
        <>
          {contactsError && (
            <p role="alert" className="text-sm text-muted-foreground">
              {a("contactsError")}{" "}
              <button
                className="text-primary underline"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t("retry")}
              </button>
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p role="status">
              {a("showing", {
                start: filtered.length ? (currentPage - 1) * pageSize + 1 : 0,
                end: Math.min(currentPage * pageSize, filtered.length),
                total: filtered.length,
              })}
            </p>
            {kind === "mentors" && entries.length === 100 && (
              <p>{a("directoryLimit")}</p>
            )}
          </div>
          {visible.length ? (
            <div className={directoryGrid}>
              {visible.map((expert) => (
                <ExpertCard
                  key={expert.id}
                  expert={expert}
                  kind={kind}
                  now={now}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
              <h2 className="font-semibold">
                {a(entries.length ? "noMatches" : "emptyExperts")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {a(entries.length ? "tryFilters" : "emptyExpertsHint")}
              </p>
              {!!entries.length && (
                <Button className="mt-4" variant="outline" onClick={clear}>
                  {a("clearFilters")}
                </Button>
              )}
            </div>
          )}
          {pageCount > 1 && (
            <nav
              aria-label={a("pagination")}
              className="flex items-center justify-between gap-2 border-t border-border pt-4"
            >
              <Button
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                {t("previous")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {a("page", { current: currentPage, total: pageCount })}
              </span>
              <Button
                variant="outline"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                {t("next")}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}

function ExpertCard({
  expert,
  kind,
  now,
}: {
  expert: Expert
  kind: Kind
  now: number
}) {
  const a = useTranslations("Operations.admin")
  const locale = useLocale()
  const themeClassName = useContext(DashboardThemeContext)
  const [profile, setProfile] = useState<ExtraProfile | null>(null)
  const [profileError, setProfileError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (kind !== "judges") return
    const controller = new AbortController()
    // Only profiles for this visible page are loaded; absent profiles are valid for judges.
    void fetch(`/api/profiles/${encodeURIComponent(expert.id)}`, {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
      .then(async (response) => {
        if (response.status === 404) return null
        if (!response.ok) throw new Error("Profile unavailable")
        return response.json() as Promise<ExtraProfile>
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setProfile(data)
          setProfileError(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfileError(true)
      })
    return () => controller.abort()
  }, [expert.id, kind, attempt])

  const name = expert.name || a("unnamed")
  const topics = expert.topics.length ? expert.topics : (profile?.skills ?? [])
  const bio = expert.bio || profile?.bio || ""
  const avatar = expert.avatar || profile?.user?.avatar
  const slots = expert.slots
    .filter((slot) => Date.parse(slot.startTime) > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const completed = expert.assignments.filter((item) => item.completed).length
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))
  const tone =
    kind === "mentors"
      ? "text-success bg-success/10"
      : "text-orange bg-orange/10"
  const Icon = kind === "mentors" ? Compass : Award

  return (
    <article
      aria-label={name}
      className={`${directoryItem} ${kind === "mentors" ? "min-h-[26rem]" : "min-h-80"}`}
    >
      <div className="flex min-h-12 items-start gap-3">
        <Avatar className="size-11 shrink-0">
          <AvatarImage src={avatar || undefined} alt="" />
          <AvatarFallback className={tone}>
            {name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2
            title={name}
            className="line-clamp-2 text-base font-semibold [overflow-wrap:anywhere]"
          >
            {name}
          </h2>
        </div>
        <Icon
          className={`size-4 shrink-0 ${kind === "mentors" ? "text-success" : "text-orange"}`}
          aria-hidden="true"
        />
      </div>
      <ContactEmail email={expert.email} compact />
      <p
        className={`mt-4 line-clamp-3 text-sm leading-relaxed ${bio ? "text-foreground/85" : "text-muted-foreground"}`}
      >
        {bio || a(kind === "mentors" ? "noBio" : "judgeRoleHint")}
      </p>
      {(kind === "mentors" || !!topics.length) && (
        <div className={`mt-3 ${directoryTags}`}>
          {topics.length ? (
            topics.slice(0, 4).map((topic) => (
              <span
                key={topic}
                className={`max-w-full truncate rounded-md px-2 py-1 text-xs ${tone}`}
              >
                {topic}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">
              {a("noTopics")}
            </span>
          )}
          {topics.length > 4 && (
            <span className="py-1 text-xs text-muted-foreground">
              {a("moreTopics", { count: topics.length - 4 })}
            </span>
          )}
        </div>
      )}
      {kind === "mentors" ? (
        <div className="mt-4 text-xs text-muted-foreground">
          {expert.availability && (
            <p className="mb-2 line-clamp-2 [overflow-wrap:anywhere]">
              {expert.availability}
            </p>
          )}
          <p className="flex items-start gap-2">
            <CalendarDays
              className="mt-0.5 size-3.5 shrink-0 text-success"
              aria-hidden="true"
            />
            <span>
              {slots.length ? (
                <>
                  {a("nextSlot")}
                  <time
                    className="mt-1 block text-foreground"
                    dateTime={slots[0].startTime}
                  >
                    {time(slots[0].startTime)}
                  </time>
                  <span className="mt-0.5 block">{a("cairo")}</span>
                </>
              ) : (
                a("noSlots")
              )}
            </span>
          </p>
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
          {[
            ["assigned", expert.assignments.length],
            ["finished", completed],
            ["remaining", expert.assignments.length - completed],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">
                {a(String(label))}
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {profileError && (
        <p className="mt-3 text-xs text-muted-foreground">
          {a("profileError")}{" "}
          <button
            className="text-primary underline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {a("retryProfile")}
          </button>
        </p>
      )}
      <div className="mt-auto pt-5" data-card-footer>
        <Dialog>
          <DialogTrigger
            render={<Button variant="outline" className="w-full" />}
          >
            {a("viewProfile")}
          </DialogTrigger>
          <DialogContent
            className={`${themeClassName} max-h-[85dvh] overflow-x-hidden overflow-y-auto sm:max-w-xl`}
            dir={locale === "ar" ? "rtl" : "ltr"}
            showCloseButton={false}
          >
            <DialogHeader className="pe-8">
              <DialogTitle className="text-xl leading-snug [overflow-wrap:anywhere]">
                {name}
              </DialogTitle>
              <DialogDescription>
                {a(kind === "mentors" ? "mentorDetails" : "judgeDetails")}
              </DialogDescription>
            </DialogHeader>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute end-3 top-3"
                  aria-label={a("closeProfile")}
                />
              }
            >
              <X aria-hidden="true" />
            </DialogClose>
            <ContactEmail email={expert.email} />
            <section>
              <h3 className="mb-2 text-sm font-semibold">{a("about")}</h3>
              <p className="text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
                {bio || a("noBio")}
              </p>
            </section>
            {(kind === "mentors" || !!topics.length) && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">{a("topics")}</h3>
                <div className="flex flex-wrap gap-2">
                  {topics.length ? (
                    topics.map((topic) => (
                      <span
                        key={topic}
                        className={`max-w-full rounded-md px-2 py-1 text-xs [overflow-wrap:anywhere] ${tone}`}
                      >
                        {topic}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {a("noTopics")}
                    </p>
                  )}
                </div>
              </section>
            )}
            {kind === "mentors" ? (
              <section>
                <h3 className="mb-2 text-sm font-semibold">
                  {a("availability")}
                </h3>
                {expert.availability && (
                  <p className="mb-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
                    {expert.availability}
                  </p>
                )}
                <p className="mb-2 text-xs text-muted-foreground">
                  {a("cairo")}
                </p>
                {slots.length ? (
                  <ul className="divide-y divide-border">
                    {slots.map((slot) => (
                      <li key={slot.id} className="py-2 text-sm">
                        <time dateTime={slot.startTime}>
                          {time(slot.startTime)}
                        </time>{" "}
                        –{" "}
                        <time dateTime={slot.endTime}>
                          {time(slot.endTime)}
                        </time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {a("noSlots")}
                  </p>
                )}
              </section>
            ) : (
              <section>
                <h3 className="mb-2 text-sm font-semibold">
                  {a("assignedProjects")}
                </h3>
                {expert.assignments.length ? (
                  <ul className="divide-y divide-border">
                    {expert.assignments.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap justify-between gap-2 py-2 text-sm"
                      >
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {item.snapshot.teamName}
                        </span>
                        <span
                          className={
                            item.completed ? "text-success" : "text-orange"
                          }
                        >
                          {a(item.completed ? "finished" : "needsReview")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {a("noAssignments")}
                  </p>
                )}
                <Link
                  href="/dashboard/organizer/scores"
                  className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                >
                  {a("manageJudging")}
                </Link>
              </section>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </article>
  )
}
