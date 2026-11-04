"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowDown,
  CalendarDays,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Mentor, MentorshipRequest } from "@/lib/mentorship"

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}|\u0640/gu, "")
    .toLowerCase()
    .trim()
}

function mentorTopics(mentor: Mentor) {
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

interface MentorDirectoryProps {
  mentors: Mentor[]
  requests: MentorshipRequest[]
  busy: boolean
  requestError: string
  onRequest: (mentorId: string, message: string) => Promise<boolean>
}

export function MentorDirectory({
  mentors,
  requests,
  busy,
  requestError,
  onRequest,
}: MentorDirectoryProps) {
  const t = useTranslations("Mentorship")
  const d = useTranslations("Mentorship.directory")
  const locale = useLocale()
  const [search, setSearch] = useState("")
  const [topicFilter, setTopicFilter] = useState("")
  const [openHoursOnly, setOpenHoursOnly] = useState(false)
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [expandedBios, setExpandedBios] = useState<string[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const entries = mentors.map((mentor) => {
    const topics = mentorTopics(mentor)
    const bio =
      mentor.mentorProfile?.bio.trim() || mentor.profile?.bio?.trim() || ""
    const slots = mentor.mentorSlots
      .filter((slot) => new Date(slot.startTime).getTime() > now)
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
    return {
      mentor,
      topics,
      bio,
      slots,
      searchable: normalize([mentor.name, ...topics, bio].join(" ")),
    }
  })
  const topics = [
    ...new Map(
      entries.flatMap((entry) =>
        entry.topics.map((topic) => [normalize(topic), topic] as const)
      )
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], locale))
  const terms = normalize(search)
    .split(/[\s,،]+/)
    .filter(Boolean)
  const visible = entries.filter(
    (entry) =>
      terms.every((term) => entry.searchable.includes(term)) &&
      (!topicFilter ||
        entry.topics.some((topic) => normalize(topic) === topicFilter)) &&
      (!openHoursOnly || entry.slots.length > 0)
  )
  const hasFilters = Boolean(search.trim() || topicFilter || openHoursOnly)
  const clearFilters = () => {
    setSearch("")
    setTopicFilter("")
    setOpenHoursOnly(false)
  }
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))

  return (
    <section
      aria-labelledby="mentor-directory-title"
      className="min-w-0 space-y-5"
    >
      <div className="rounded-2xl border border-primary/25 bg-card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="mentor-directory-title"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <SlidersHorizontal
              className="size-4 text-primary"
              aria-hidden="true"
            />
            {d("findHelp")}
          </h2>
          <a
            href="#mentorship-requests"
            className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            {d("yourRequests", { count: requests.length })}
            <ArrowDown size={14} aria-hidden="true" />
          </a>
        </div>
        <div className="grid items-end gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-2">
            <label htmlFor="mentor-search" className="text-sm font-medium">
              {d("searchLabel")}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="mentor-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={d("searchPlaceholder")}
                className="h-10 rounded-xl ps-10"
              />
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <label id="mentor-topic-label" className="text-sm font-medium">
              {d("topicLabel")}
            </label>
            <Select
              value={topicFilter}
              onValueChange={(value) => setTopicFilter(value ?? "")}
            >
              <SelectTrigger
                aria-labelledby="mentor-topic-label"
                className="h-10 w-full min-w-0 rounded-xl"
              >
                <SelectValue>
                  {topics.find(([key]) => key === topicFilter)?.[1] ??
                    d("allTopics")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{d("allTopics")}</SelectItem>
                {topics.map(([key, topic]) => (
                  <SelectItem key={key} value={key}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
            <Checkbox
              checked={openHoursOnly}
              onCheckedChange={setOpenHoursOnly}
            />
            {d("openHoursOnly")}
          </label>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {d("clearFilters")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-sm font-medium"
        >
          {d("results", { count: visible.length })}
        </p>
        <p className="text-xs text-muted-foreground">{d("timeZone")}</p>
      </div>
      {visible.length ? (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {visible.map(({ mentor, topics, bio, slots }) => {
            const existingRequest = requests.find(
              (request) =>
                request.mentorId === mentor.id &&
                ["pending", "accepted"].includes(request.status)
            )
            const expanded = expandedBios.includes(mentor.id)
            const formOpen = selectedMentor === mentor.id && !existingRequest
            const message = drafts[mentor.id] ?? ""
            return (
              <article
                key={mentor.id}
                aria-labelledby={`mentor-name-${mentor.id}`}
                className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-11">
                    <AvatarImage src={mentor.avatar || undefined} alt="" />
                    <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                      {mentor.name
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3
                      id={`mentor-name-${mentor.id}`}
                      className="text-lg font-semibold break-words"
                    >
                      {mentor.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {d("mentorLabel")}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    {d("canHelpWith")}
                  </h4>
                  {topics.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {topics.map((topic) => (
                        <li
                          key={normalize(topic)}
                          className="max-w-full rounded-full border border-success/25 bg-success/8 px-2.5 py-1 text-xs [overflow-wrap:anywhere] text-success"
                        >
                          {topic}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {d("noTopics")}
                    </p>
                  )}
                </div>
                <div>
                  <p
                    id={`mentor-bio-${mentor.id}`}
                    className="text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground"
                  >
                    {bio
                      ? !expanded && bio.length > 180
                        ? `${bio.slice(0, 180).trimEnd()}…`
                        : bio
                      : d("noBio")}
                  </p>
                  {bio.length > 180 && (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`mentor-bio-${mentor.id}`}
                      className="mt-1 text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() =>
                        setExpandedBios((current) =>
                          expanded
                            ? current.filter((id) => id !== mentor.id)
                            : [...current, mentor.id]
                        )
                      }
                    >
                      {d(expanded ? "lessBio" : "moreBio")}
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-border/70 bg-background/50 p-3 text-sm">
                  <p
                    className={`flex items-center gap-2 font-medium ${slots.length ? "text-orange" : "text-muted-foreground"}`}
                  >
                    <CalendarDays size={15} aria-hidden="true" />
                    {d(slots.length ? "nextOfficeHour" : "arrangeTime")}
                  </p>
                  {slots.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <time dateTime={slots[0].startTime}>
                        {time(slots[0].startTime)}
                      </time>
                    </p>
                  )}
                  {mentor.mentorProfile?.availability.trim() && (
                    <p className="mt-2 text-xs leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
                      {mentor.mentorProfile.availability}
                    </p>
                  )}
                </div>
                {existingRequest ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-sm text-success">
                      {d(
                        existingRequest.status === "accepted"
                          ? "alreadyAccepted"
                          : "alreadyRequested"
                      )}
                    </span>
                    <a
                      href={`#mentorship-request-${existingRequest.id}`}
                      className="text-sm font-medium text-primary underline underline-offset-4"
                    >
                      {d("viewRequest")}
                    </a>
                  </div>
                ) : (
                  <Button
                    type="button"
                    disabled={busy}
                    aria-expanded={formOpen}
                    aria-controls={`mentor-request-${mentor.id}`}
                    className="h-10 rounded-xl"
                    onClick={() =>
                      setSelectedMentor(formOpen ? null : mentor.id)
                    }
                  >
                    {t("request")}
                  </Button>
                )}
                {formOpen && (
                  <form
                    id={`mentor-request-${mentor.id}`}
                    className="space-y-3 border-t border-border pt-4"
                    onSubmit={async (event) => {
                      event.preventDefault()
                      if (message.trim().length < 10) return
                      if (await onRequest(mentor.id, message.trim())) {
                        setSelectedMentor(null)
                        setDrafts((current) => ({
                          ...current,
                          [mentor.id]: "",
                        }))
                      }
                    }}
                  >
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {d("requestHelp")}
                    </p>
                    <label className="block text-sm">
                      {t("requestHint")}
                      <Textarea
                        required
                        minLength={10}
                        maxLength={1000}
                        value={message}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [mentor.id]: event.target.value,
                          }))
                        }
                        className="mt-2 min-h-24 rounded-xl"
                      />
                    </label>
                    {requestError && (
                      <p role="alert" className="text-sm text-destructive">
                        {requestError}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        disabled={busy || message.trim().length < 10}
                        className="rounded-xl"
                      >
                        {t("sendRequest")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setSelectedMentor(null)}
                      >
                        {d("closeForm")}
                      </Button>
                    </div>
                  </form>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Search
            className="mx-auto mb-3 size-6 text-primary"
            aria-hidden="true"
          />
          <h3 className="font-semibold">
            {mentors.length ? d("noMatches") : t("noMentors")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {d(mentors.length ? "noMatchesHelp" : "noMentorsHelp")}
          </p>
          {hasFilters && (
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={clearFilters}
            >
              {d("clearFilters")}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
